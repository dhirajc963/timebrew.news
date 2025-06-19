import json
import boto3
import os
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def handler(event, context):
    logger.info("Starting resend verification handler")
    try:
        # Parse request body
        if not event.get("body"):
            logger.warn("Resend verification attempt without request body")
            return create_response(400, {"error": "Request body is required"})

        body = json.loads(event["body"])

        # Validate required fields
        email = body.get("email", "").lower().strip()

        if not email:
            logger.warn("Resend verification attempt without email")
            return create_response(400, {"error": "Email is required"})

        # Resend verification email
        try:
            cognito.resend_confirmation_code(
                ClientId=os.environ["CLIENT_ID"], Username=email
            )

            logger.info(f"Verification email resent successfully to {email}")
            return create_response(
                200,
                {
                    "message": "Verification email sent! Please check your inbox and spam folder.",
                    "email": email,
                },
            )

        except cognito.exceptions.UserNotFoundException:
            logger.warn(f"User not found for verification resend: {email}")
            return create_response(
                404, {"error": "No account found with this email address."}
            )
        except cognito.exceptions.InvalidParameterException:
            logger.warn(f"Invalid parameter for verification resend: {email}")
            return create_response(
                400,
                {
                    "error": "User is already verified or cannot receive verification emails."
                },
            )
        except cognito.exceptions.LimitExceededException:
            logger.warn(f"Rate limit exceeded for verification resend: {email}")
            return create_response(
                429,
                {
                    "error": "Too many requests. Please wait before requesting another verification email."
                },
            )
        except Exception as e:
            logger.error(f"Resend verification error for {email}: {e}")
            return create_response(
                500, {"error": "Failed to resend verification email"}
            )

    except json.JSONDecodeError:
        logger.error("Invalid JSON in resend verification request body")
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        logger.error(f"Unexpected error in resend verification handler: {e}")
        return create_response(500, {"error": "Internal server error"})
