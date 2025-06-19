import json
import boto3
import os
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger

cognito = boto3.client("cognito-idp")


def handler(event, context):
    logger.info("Get brews handler called")
    try:
        # Check for Authorization header
        auth_header = event.get("headers", {}).get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warn("Missing or invalid authorization header in get brews request")
            return create_response(401, {"error": "Authorization token is required"})

        # Extract token
        token = auth_header.split(" ")[1]

        # Get user from Cognito
        try:
            user_response = cognito.get_user(AccessToken=token)
            cognito_id = user_response.get("Username")
        except Exception as e:
            logger.error(f"Cognito error during get brews authentication: {e}")
            return create_response(401, {"error": "Invalid or expired token"})

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
                    logger.error(f"User not found in database for cognito_id: {cognito_id}")
                    return create_response(404, {"error": "User not found"})

                user_id = user_result[0]

                # Get brews for user
                cur.execute(
                    """SELECT id, name, topics, delivery_time, article_count, created_at, is_active 
                        FROM time_brew.brews 
                        WHERE user_id = %s 
                        ORDER BY created_at DESC""",
                    (user_id,),
                )

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
                        }
                    )

                logger.info(f"Successfully retrieved {len(brews)} brews for user {user_id}")
                return create_response(200, {"brews": brews})

        except Exception as e:
            logger.error(f"Database error during get brews for user {cognito_id}: {e}")
            return create_response(500, {"error": f"Database error: {str(e)}"})
        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Unexpected error in get brews handler: {e}")
        return create_response(500, {"error": "Internal server error"})
