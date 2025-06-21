import json
import boto3
import os
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def handler(event, context):
    logger.info("Starting token refresh handler")
    try:
        # Parse request body
        if not event.get("body"):
            logger.warn("Token refresh attempt without request body")
            return create_response(400, {"error": "Request body is required"})

        body = json.loads(event["body"])

        # Validate required fields
        refresh_token = body.get("refreshToken", "").strip()

        if not refresh_token:
            logger.warn("Token refresh attempt without refresh token")
            return create_response(400, {"error": "Refresh token is required"})

        # Refresh the token using Cognito
        try:
            response = cognito.initiate_auth(
                ClientId=os.environ["CLIENT_ID"],
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={"REFRESH_TOKEN": refresh_token},
            )

            # Extract new tokens from response
            auth_result = response.get("AuthenticationResult")
            if not auth_result:
                logger.error("Token refresh failed - no auth result")
                return create_response(401, {"error": "Token refresh failed"})

            new_access_token = auth_result.get("AccessToken")
            new_refresh_token = auth_result.get(
                "RefreshToken", refresh_token
            )  # Cognito may not always return new refresh token
            expires_in = auth_result.get("ExpiresIn")

            if not new_access_token:
                logger.error("Token refresh failed - no new access token")
                return create_response(
                    401, {"error": "Failed to obtain new access token"}
                )

        except cognito.exceptions.NotAuthorizedException as e:
            logger.warn(f"Invalid or expired refresh token: {e}")
            return create_response(
                401, {"error": "Refresh token is invalid or expired"}
            )
        except cognito.exceptions.UserNotConfirmedException as e:
            logger.warn(f"User not confirmed during token refresh: {e}")
            return create_response(401, {"error": "User account is not confirmed"})
        except cognito.exceptions.UserNotFoundException as e:
            logger.warn(f"User not found during token refresh: {e}")
            return create_response(401, {"error": "User not found"})
        except Exception as e:
            logger.error(f"Cognito token refresh error: {e}")
            return create_response(500, {"error": "Token refresh service error"})

        # Return success response with new tokens
        logger.info("Token refresh successful")
        return create_response(
            200,
            {
                "message": "Token refreshed successfully",
                "accessToken": new_access_token,
                "refreshToken": new_refresh_token,
                "expiresIn": expires_in,
            },
        )

    except json.JSONDecodeError:
        logger.error("Invalid JSON in token refresh request body")
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        logger.error(f"Unexpected error in refresh token handler: {e}")
        return create_response(500, {"error": "Internal server error"})
