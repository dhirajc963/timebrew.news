import json
import boto3
import os
import uuid
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def generate_secure_temp_password():
    """Generate a 12-character password that meets all Cognito requirements"""
    import secrets
    import string

    # Ensure at least one from each required category
    uppercase = secrets.choice(string.ascii_uppercase)
    lowercase = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$%^&*")

    # Fill remaining 8 characters from all categories
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*"
    remaining = "".join(secrets.choice(all_chars) for _ in range(8))

    # Combine and shuffle to avoid predictable patterns
    password_chars = list(uppercase + lowercase + digit + special + remaining)
    secrets.SystemRandom().shuffle(password_chars)

    return "".join(password_chars)


def handler(event, context):
    logger.info("Starting user registration handler")
    try:
        # Parse request body
        if not event.get("body"):
            logger.warn("Registration attempt without request body")
            return create_response(400, {"error": "Request body is required"})

        body = json.loads(event["body"])

        # Validate required fields
        required_fields = ["email", "firstName", "lastName", "country", "interests"]
        for field in required_fields:
            if not body.get(field):
                logger.warn(f"Registration attempt missing required field: {field}")
                return create_response(400, {"error": f"{field} is required"})

        email = body["email"].lower().strip()
        first_name = body["firstName"].strip()
        last_name = body["lastName"].strip()
        country = body["country"].strip()
        interests = body["interests"]  # Should be an array
        timezone = body.get("timezone", "UTC")

        # Validate interests is an array
        if not isinstance(interests, list) or len(interests) == 0:
            logger.warn(f"Registration attempt with invalid interests for {email}")
            return create_response(400, {"error": "At least one interest is required"})

        # Create user in Cognito using sign_up (this sends verification email automatically)
        try:
            # Generate a temporary random password (required by sign_up, but user won't use it)
            import secrets
            import string

            temp_password = generate_secure_temp_password()

            cognito_response = cognito.sign_up(
                ClientId=os.environ["CLIENT_ID"],
                Username=email,
                Password=temp_password,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "given_name", "Value": first_name},
                    {"Name": "family_name", "Value": last_name},
                ],
            )

            cognito_id = cognito_response["UserSub"]

            # Verification email is automatically sent by Cognito!
            logger.info(f"User created in Cognito: {cognito_id}, verification email sent to: {email}")

        except cognito.exceptions.UsernameExistsException:
            logger.warn(f"Registration attempt for existing user: {email}")
            return create_response(
                400, {"error": "User with this email already exists"}
            )
        except cognito.exceptions.InvalidPasswordException:
            # This shouldn't happen with our generated password, but just in case
            logger.error(f"Invalid password generated for user registration: {email}")
            return create_response(
                400, {"error": "Password does not meet requirements"}
            )
        except Exception as e:
            logger.error(f"Cognito error during registration for {email}: {e}")
            return create_response(500, {"error": "Failed to create user account"})

        # Store user profile in database
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO time_brew.users (cognito_id, email, first_name, last_name, country, interests, timezone)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """,
                    (
                        cognito_id,
                        email,
                        first_name,
                        last_name,
                        country,
                        interests,
                        timezone,
                    ),
                )

                user_id, created_at = cur.fetchone()

            conn.commit()
            conn.close()
            logger.info(f"User profile created in database for {email} with ID: {user_id}")

        except Exception as e:
            logger.error(f"Database error during registration for {email}: {e}")
            # Rollback: Delete user from Cognito if database insert failed
            try:
                cognito.admin_delete_user(
                    UserPoolId=os.environ["USER_POOL_ID"], Username=email
                )
                logger.info(f"Rolled back Cognito user creation for {email}")
            except Exception as rollback_error:
                logger.error(f"Failed to rollback Cognito user for {email}: {rollback_error}")
            return create_response(500, {"error": "Failed to create user profile"})

        # Return success response
        logger.info(f"User registration completed successfully for {email}")
        return create_response(
            201,
            {
                "message": "Account created successfully! Please check your email to verify your account before signing in.",
                "user": {
                    "id": str(user_id),
                    "email": email,
                    "firstName": first_name,
                    "lastName": last_name,
                    "country": country,
                    "interests": interests,
                    "timezone": timezone,
                    "createdAt": created_at.isoformat(),
                    "emailVerified": False,
                    "nextStep": "verify_email",
                },
            },
        )

    except json.JSONDecodeError:
        logger.error("Invalid JSON in registration request body")
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        logger.error(f"Unexpected error in registration handler: {e}")
        return create_response(500, {"error": "Internal server error"})
