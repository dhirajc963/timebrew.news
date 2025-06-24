import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger


def lambda_handler(event, context):
    """
    Get Briefings Lambda Function
    Simple retrieval of briefings for a user and brew with pagination
    """
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "briefings/get")

    try:
        # Extract query parameters
        query_params = event.get("queryStringParameters") or {}

        # Get required parameters
        user_id = query_params.get("user_id")
        brew_id = query_params.get("brew_id")

        if not user_id or not brew_id:
            logger.error(
                "Missing required parameters", user_id=user_id, brew_id=brew_id
            )
            return create_response(400, {"error": "user_id and brew_id are required"})

        # Pagination parameters
        try:
            limit = int(query_params.get("limit", 20))
            offset = int(query_params.get("offset", 0))
        except ValueError:
            return create_response(400, {"error": "Invalid limit or offset parameters"})

        # Validate pagination
        if limit > 100:
            limit = 100
        elif limit < 1:
            limit = 20
        if offset < 0:
            offset = 0

        logger.info(
            "Getting briefings",
            user_id=user_id,
            brew_id=brew_id,
            limit=limit,
            offset=offset,
        )

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Verify user exists and get user UUID
            cursor.execute(
                "SELECT id FROM time_brew.users WHERE email = %s", (user_id,)
            )
            user_result = cursor.fetchone()

            if not user_result:
                logger.error("User not found", user_id=user_id)
                return create_response(404, {"error": "User not found"})

            actual_user_id = user_result[0]

            # Get total count
            count_query = """
                SELECT COUNT(*) 
                FROM time_brew.editor_logs 
                WHERE user_id = %s AND brew_id = %s
            """
            cursor.execute(count_query, (actual_user_id, brew_id))
            total_count = cursor.fetchone()[0]

            # Get briefings with pagination
            briefings_query = """
                SELECT 
                    run_id,
                    editorial_content,
                    raw_llm_response,
                    email_sent,
                    email_sent_time,
                    created_at
                FROM time_brew.editor_logs
                WHERE user_id = %s AND brew_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(briefings_query, (actual_user_id, brew_id, limit, offset))
            rows = cursor.fetchall()

            # Build briefings response
            briefings = []
            for row in rows:
                run_id, editorial_content, raw_llm_response, email_sent, email_sent_time, created_at = row

                # Use editorial_content if available, fallback to raw_llm_response
                editor_draft = None
                article_count = 0
                
                if editorial_content:
                    # editorial_content is already parsed JSON
                    editor_draft = editorial_content
                    # Count articles if available
                    if editor_draft and "articles" in editor_draft:
                        article_count = len(editor_draft["articles"])
                elif raw_llm_response:
                    # Fallback to parsing raw_llm_response for backward compatibility
                    try:
                        if isinstance(raw_llm_response, str):
                            editor_draft = json.loads(raw_llm_response)
                        else:
                            editor_draft = raw_llm_response

                        # Count articles if available
                        if editor_draft and "articles" in editor_draft:
                            article_count = len(editor_draft["articles"])
                    except json.JSONDecodeError:
                        logger.warning(
                            "Failed to parse raw_llm_response", run_id=run_id
                        )
                        editor_draft = None

                briefing = {
                    "id": run_id,
                    "brew_id": brew_id,
                    "user_id": user_id,
                    "editor_draft": editor_draft,
                    "sent_at": email_sent_time.isoformat() if email_sent_time else None,
                    "article_count": article_count,
                    "delivery_status": "sent" if email_sent else "pending",
                    "created_at": created_at.isoformat() if created_at else None,
                }
                briefings.append(briefing)

        finally:
            cursor.close()
            conn.close()

        total_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.info(
            "Briefings retrieved successfully",
            briefings_count=len(briefings),
            total_count=total_count,
            total_time_ms=round(total_time, 2),
        )

        # Return in the format frontend expects
        response = create_response(
            200, {"briefings": briefings, "total_count": total_count}
        )

        logger.log_request_end("briefings/get", 200, total_time)
        return response

    except Exception as e:
        logger.error("Error retrieving briefings", error=str(e))
        total_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("briefings/get", 500, total_time)
        return create_response(500, {"error": "Internal server error"})
