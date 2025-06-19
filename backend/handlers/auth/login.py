import json
import boto3
import os
from datetime import datetime
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def handler(event, context):
    start_time = datetime.utcnow()
    logger.log_request_start(event, context, "auth/login")

    try:
        # Parse request body
        if not event.get("body"):
            logger.warn("Login attempt rejected: missing request body")
            response = create_response(400, {"error": "Request body is required"})
            logger.log_request_end(
                "auth/login",
                400,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response

        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError as e:
            logger.error(
                "Login attempt rejected: invalid JSON in request body", error=e
            )
            response = create_response(400, {"error": "Invalid JSON in request body"})
            logger.log_request_end(
                "auth/login",
                400,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response

        # Validate required fields
        email = body.get("email", "").lower().strip()

        if not email:
            logger.warn("Login attempt rejected: missing email field")
            response = create_response(400, {"error": "Email is required"})
            logger.log_request_end(
                "auth/login",
                400,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response

        # Set user context for subsequent logs
        logger.set_context(user_email=email)

        # Initiate EMAIL_OTP authentication with Cognito
        try:
            # First check if the user exists in Cognito to avoid unexpected errors
            logger.info("Checking user existence in Cognito")
            try:
                # Try to get the user by email
                user_response = cognito.admin_get_user(
                    UserPoolId=os.environ["USER_POOL_ID"], Username=email
                )
                logger.info("User found in Cognito, proceeding with authentication")
            except cognito.exceptions.UserNotFoundException:
                logger.warn("Login attempt failed: user not found in Cognito")
                response = create_response(
                    404,
                    {
                        "error": "No account found with this email address. Please sign up first."
                    },
                )
                logger.log_request_end(
                    "auth/login",
                    404,
                    (datetime.utcnow() - start_time).total_seconds() * 1000,
                )
                return response
            except Exception as e:
                logger.error("Error checking user existence in Cognito", error=e)
                raise e

            # Proceed with authentication
            logger.info("Initiating Cognito authentication with EMAIL_OTP")
            auth_start_time = datetime.utcnow()

            response = cognito.initiate_auth(
                ClientId=os.environ["CLIENT_ID"],
                AuthFlow="USER_AUTH",
                AuthParameters={
                    "USERNAME": email,
                    "PREFERRED_CHALLENGE": "EMAIL_OTP",  # Request EMAIL_OTP challenge
                },
            )

            auth_duration = (datetime.utcnow() - auth_start_time).total_seconds() * 1000
            logger.log_external_api_call(
                "Cognito",
                "/initiate_auth",
                "POST",
                200,
                auth_duration,
                challenge_name=response.get("ChallengeName"),
            )

            # Check if challenge is required (EMAIL_OTP)
            if response.get("ChallengeName") == "EMAIL_OTP":
                logger.info(
                    "EMAIL_OTP challenge initiated successfully",
                    challenge_name=response["ChallengeName"],
                    has_session=bool(response.get("Session")),
                )

                success_response = create_response(
                    200,
                    {
                        "message": "Verification code sent to your email",
                        "challengeName": response["ChallengeName"],
                        "session": response.get("Session"),
                        "email": email,
                        "nextStep": "enter_otp_code",
                    },
                )
                logger.log_request_end(
                    "auth/login",
                    200,
                    (datetime.utcnow() - start_time).total_seconds() * 1000,
                )
                return success_response
            else:
                logger.error(
                    "Unexpected authentication flow received from Cognito",
                    expected_challenge="EMAIL_OTP",
                    received_challenge=response.get("ChallengeName"),
                )
                error_response = create_response(
                    500, {"error": "Unexpected authentication flow"}
                )
                logger.log_request_end(
                    "auth/login",
                    500,
                    (datetime.utcnow() - start_time).total_seconds() * 1000,
                )
                return error_response

        except cognito.exceptions.UserNotFoundException:
            logger.warn("Login failed: user not found during authentication")
            response = create_response(
                404,
                {
                    "error": "No account found with this email address. Please sign up first."
                },
            )
            logger.log_request_end(
                "auth/login",
                404,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response
        except cognito.exceptions.UserNotConfirmedException:
            logger.warn("Login failed: user account not confirmed")
            response = create_response(
                400,
                {
                    "error": "Please verify your email address first. Check your inbox for a verification email.",
                    "nextStep": "verify_email_first",
                },
            )
            logger.log_request_end(
                "auth/login",
                400,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response
        except cognito.exceptions.InvalidParameterException as e:
            logger.error(
                "Login failed: invalid parameter sent to Cognito",
                error=e,
                parameter_error=str(e),
            )
            response = create_response(400, {"error": f"Invalid request: {str(e)}"})
            logger.log_request_end(
                "auth/login",
                400,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response
        except Exception as e:
            logger.error(
                "Login failed: unexpected Cognito authentication error", error=e
            )
            response = create_response(500, {"error": "Authentication service error"})
            logger.log_request_end(
                "auth/login",
                500,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return response

    except Exception as e:
        logger.error("Login handler failed: unexpected error", error=e)
        response = create_response(500, {"error": "Internal server error"})
        logger.log_request_end(
            "auth/login", 500, (datetime.utcnow() - start_time).total_seconds() * 1000
        )
        return response
