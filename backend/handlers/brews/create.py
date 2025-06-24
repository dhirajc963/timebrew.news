import json
import uuid
import boto3
import os
import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def handler(event, context):
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "brews/create")
    
    try:
        # Check for Authorization header
        auth_header = event.get("headers", {}).get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warn("Brew creation attempt without authorization token")
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("brews/create", 401, duration_ms)
            return create_response(401, {"error": "Authorization token is required"})

        # Extract token
        token = auth_header.split(" ")[1]

        # Get user from Cognito
        logger.info("Authenticating user with Cognito")
        try:
            user_response = cognito.get_user(AccessToken=token)
            cognito_id = user_response.get("Username")
            logger.info("User authenticated successfully", cognito_id=cognito_id)
        except Exception as e:
            logger.error("Cognito error during brew creation", error=str(e))
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("brews/create", 401, duration_ms)
            return create_response(401, {"error": "Invalid or expired token"})

        # Parse request body
        if not event.get("body"):
            logger.warn("Brew creation attempt without request body")
            return create_response(400, {"error": "Request body is required"})

        body = json.loads(event["body"])

        # Validate required fields
        name = body.get("name")
        topics = body.get("topics", [])
        delivery_time = body.get("delivery_time")
        article_count = body.get("article_count", 5)

        if not name or not topics or not delivery_time:
            logger.warn(
                f"Brew creation attempt with missing fields for user {cognito_id}"
            )
            return create_response(
                400, {"error": "Name, topics, and delivery time are required"}
            )

        # Get user ID from database
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Get user ID from cognito_id
                cur.execute(
                    "SELECT id FROM time_brew.users WHERE cognito_id = %s",
                    (cognito_id,),
                )
                user_result = cur.fetchone()

                if not user_result:
                    logger.error(
                        f"User not found in database for cognito_id: {cognito_id}"
                    )
                    return create_response(404, {"error": "User not found"})

                user_id = user_result[0]

                # Insert brew
                cur.execute(
                    """INSERT INTO time_brew.brews 
                       (user_id, name, topics, delivery_time, article_count) 
                       VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at""",
                    (user_id, name, topics, delivery_time, article_count),
                )

                brew_result = cur.fetchone()
                brew_id = brew_result[0]
                created_at = brew_result[1]

                conn.commit()
                logger.info(f"Brew created successfully: {brew_id} for user {user_id}")

                # Return created brew
                return create_response(
                    201,
                    {
                        "id": str(brew_id),
                        "name": name,
                        "topics": topics,
                        "delivery_time": str(delivery_time),
                        "article_count": article_count,
                        "created_at": created_at.isoformat()
                        + "Z",  # Add 'Z' to indicate UTC timezone
                        "is_active": True,
                    },
                )

        except Exception as e:
            conn.rollback()
            logger.error(
                f"Database error during brew creation for user {cognito_id}: {e}"
            )
            return create_response(500, {"error": f"Database error: {str(e)}"})
        finally:
            conn.close()

    except json.JSONDecodeError:
        logger.error("Invalid JSON in brew creation request body")
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        logger.error(f"Unexpected error in brew creation handler: {e}")
        return create_response(500, {"error": "Internal server error"})
