import boto3
import json
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

                # Get brews for user with briefings count
                cur.execute(
                    """SELECT b.id, b.name, b.topics, b.delivery_time, b.article_count, b.created_at, b.is_active,
                              COALESCE(COUNT(br.id) FILTER (WHERE br.delivery_status = 'sent'), 0) as briefings_sent
                        FROM time_brew.brews b
                        LEFT JOIN time_brew.briefings br ON b.id = br.brew_id
                        WHERE b.user_id = %s 
                        GROUP BY b.id, b.name, b.topics, b.delivery_time, b.article_count, b.created_at, b.is_active
                        ORDER BY b.created_at DESC""",
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
                            "briefings_sent": row[7],
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
