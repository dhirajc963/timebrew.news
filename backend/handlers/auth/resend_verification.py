import json
import boto3
import os
from utils.response import create_response

cognito = boto3.client("cognito-idp")


def handler(event, context):
    try:
        # Parse request body
        if not event.get("body"):
            return create_response(400, {"error": "Request body is required"})

        body = json.loads(event["body"])

        # Validate required fields
        email = body.get("email", "").lower().strip()

        if not email:
            return create_response(400, {"error": "Email is required"})

        # Resend verification email
        try:
            cognito.resend_confirmation_code(
                ClientId=os.environ["CLIENT_ID"], Username=email
            )

            return create_response(
                200,
                {
                    "message": "Verification email sent! Please check your inbox and spam folder.",
                    "email": email,
                },
            )

        except cognito.exceptions.UserNotFoundException:
            return create_response(
                404, {"error": "No account found with this email address."}
            )
        except cognito.exceptions.InvalidParameterException:
            return create_response(
                400,
                {
                    "error": "User is already verified or cannot receive verification emails."
                },
            )
        except cognito.exceptions.LimitExceededException:
            return create_response(
                429,
                {
                    "error": "Too many requests. Please wait before requesting another verification email."
                },
            )
        except Exception as e:
            print(f"Resend verification error: {e}")
            return create_response(
                500, {"error": "Failed to resend verification email"}
            )

    except json.JSONDecodeError:
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {"error": "Internal server error"})
