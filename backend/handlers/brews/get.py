import boto3
import json
import os
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def handler(event, context):
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "brews/get")

    try:
        # Check for Authorization header
        auth_header = event.get("headers", {}).get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warn("Missing or invalid authorization header in get brews request")
            duration_ms = (
                datetime.now(timezone.utc) - start_time
            ).total_seconds() * 1000
            logger.log_request_end("brews/get", 401, duration_ms)
            return create_response(401, {"error": "Authorization token is required"})

        # Extract token
        token = auth_header.split(" ")[1]
        logger.info("Authenticating user with Cognito")

        # Get user from Cognito
        try:
            user_response = cognito.get_user(AccessToken=token)
            cognito_id = user_response.get("Username")
            logger.info("User authenticated successfully", cognito_id=cognito_id)
        except Exception as e:
            logger.error("Cognito error during get brews authentication", error=str(e))
            duration_ms = (
                datetime.now(timezone.utc) - start_time
            ).total_seconds() * 1000
            logger.log_request_end("brews/get", 401, duration_ms)
            return create_response(401, {"error": "Invalid or expired token"})

        # Get user ID from database
        logger.info("Connecting to database")
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Get user ID from cognito_id
                logger.info("Looking up user by cognito_id", cognito_id=cognito_id)
                cur.execute(
                    "SELECT id FROM time_brew.users WHERE cognito_id = %s",
                    (cognito_id,),
                )
                logger.log_db_operation("SELECT", "users", cognito_id=cognito_id)
                user_result = cur.fetchone()

                if not user_result:
                    logger.error("User not found in database", cognito_id=cognito_id)
                    duration_ms = (
                        datetime.now(timezone.utc) - start_time
                    ).total_seconds() * 1000
                    logger.log_request_end("brews/get", 404, duration_ms)
                    return create_response(404, {"error": "User not found"})

                user_id = user_result[0]
                logger.info(
                    "User found in database", user_id=user_id, cognito_id=cognito_id
                )

                # Get brews for user with sent briefings count (using editor_logs directly)
                logger.info("Retrieving brews for user", user_id=user_id)
                cur.execute(
                    """SELECT b.id, b.name, b.topics, b.delivery_time, b.article_count, b.created_at, b.is_active,
                              COALESCE(COUNT(el.run_id) FILTER (WHERE el.email_sent = true), 0) as briefings_sent
                        FROM time_brew.brews b
                        LEFT JOIN time_brew.editor_logs el ON b.id = el.brew_id
                        WHERE b.user_id = %s 
                        GROUP BY b.id, b.name, b.topics, b.delivery_time, b.article_count, b.created_at, b.is_active
                        ORDER BY b.created_at DESC""",
                    (user_id,),
                )
                logger.log_db_operation("SELECT", "brews", user_id=user_id)

                brews = []
                for row in cur.fetchall():
                    # Parse topics JSON if it exists
                    topics = row[2]
                    if isinstance(topics, str):
                        try:
                            topics = json.loads(topics)
                        except json.JSONDecodeError:
                            topics = []
                    elif topics is None:
                        topics = []

                    brews.append(
                        {
                            "id": str(row[0]),
                            "name": row[1],
                            "topics": topics,
                            "delivery_time": str(row[3]) if row[3] else None,
                            "article_count": row[4],
                            "created_at": row[5].isoformat() + "Z" if row[5] else None,
                            "is_active": row[6],
                            "briefings_sent": row[7],
                        }
                    )

                logger.info(
                    "Successfully retrieved brews",
                    user_id=user_id,
                    brew_count=len(brews),
                    active_brews=len([b for b in brews if b["is_active"]]),
                )

                duration_ms = (
                    datetime.now(timezone.utc) - start_time
                ).total_seconds() * 1000
                logger.log_request_end("brews/get", 200, duration_ms)
                return create_response(200, {"brews": brews})

        except Exception as e:
            logger.error(
                "Database error during get brews",
                error=str(e),
                cognito_id=cognito_id,
                user_id=user_id if "user_id" in locals() else None,
            )
            duration_ms = (
                datetime.now(timezone.utc) - start_time
            ).total_seconds() * 1000
            logger.log_request_end("brews/get", 500, duration_ms)
            return create_response(500, {"error": f"Database error: {str(e)}"})
        finally:
            conn.close()

    except Exception as e:
        logger.error("Unexpected error in get brews handler", error=str(e))
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("brews/get", 500, duration_ms)
        return create_response(500, {"error": "Internal server error"})
