import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger


def lambda_handler(event, context):
    """
    Get Feedback Status Lambda Function
    Returns user's current feedback state for a briefing and its articles
    """
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "feedback/get_status")
    
    try:
        # Extract run_id from path parameters
        run_id = event.get("pathParameters", {}).get("id")
        logger.info("Extracted parameters", run_id=run_id)

        if not run_id:
            logger.error("Missing run_id parameter")
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("feedback/get_status", 400, duration_ms)
            return create_response(400, {"error": "run_id is required"})

        # Extract user_id from query parameters or request context
        user_email = event.get("queryStringParameters", {}).get("user_id")
        logger.info("Extracted user_email", user_email=user_email)

        if not user_email:
            logger.error("Missing user_id parameter")
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("feedback/get_status", 400, duration_ms)
            return create_response(400, {"error": "user_id is required"})

        # Get database connection
        logger.info("Connecting to database")
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, get the user's UUID from their email
        logger.info("Looking up user by email", user_email=user_email)
        cursor.execute(
            """
            SELECT id FROM time_brew.users WHERE email = %s
        """,
            (user_email,),
        )
        logger.log_db_operation("SELECT", "users", user_email=user_email)

        user_data = cursor.fetchone()
        if not user_data:
            logger.error("User not found", user_email=user_email)
            cursor.close()
            conn.close()
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("feedback/get_status", 404, duration_ms)
            return create_response(404, {"error": "User not found"})

        user_id = user_data[0]
        logger.info("User found", user_id=user_id, user_email=user_email)

        # Verify run exists and belongs to user
        logger.info("Verifying run access", run_id=run_id, user_id=user_id)
        cursor.execute(
            """
            SELECT rt.run_id, cl.article_count, rt.user_id
            FROM time_brew.run_tracker rt
            LEFT JOIN time_brew.curator_logs cl ON rt.run_id = cl.run_id
            WHERE rt.run_id = %s AND rt.user_id = %s
        """,
            (run_id, user_id),
        )
        logger.log_db_operation("SELECT", "run_tracker, curator_logs", run_id=run_id, user_id=user_id)

        run_data = cursor.fetchone()
        if not run_data:
            logger.error("Run not found or access denied", run_id=run_id, user_id=user_id)
            cursor.close()
            conn.close()
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("feedback/get_status", 404, duration_ms)
            return create_response(404, {"error": "Run not found or access denied"})

        run_id_db, article_count, db_user_id = run_data
        logger.info("Run data retrieved", run_id=run_id_db, article_count=article_count)

        # Handle case where article_count is None (curator hasn't completed yet)
        if article_count is None:
            article_count = 0
            logger.info("Article count is None, setting to 0", run_id=run_id)

        # Get all feedback for this run and user
        logger.info("Retrieving user feedback", run_id=run_id, user_id=user_id)
        cursor.execute(
            """
            SELECT article_position, feedback_type, article_title, article_source
            FROM time_brew.user_feedback
            WHERE run_id = %s AND user_id = %s
            ORDER BY article_position
        """,
            (run_id, user_id),
        )
        logger.log_db_operation("SELECT", "user_feedback", run_id=run_id, user_id=user_id)

        feedback_results = cursor.fetchall()
        logger.info("Feedback retrieved", feedback_count=len(feedback_results))
        cursor.close()
        conn.close()

        # Process feedback data
        briefing_feedback = None
        articles_feedback = {}

        for (
            article_position,
            feedback_type,
            article_title,
            article_source,
        ) in feedback_results:
            if article_position == 0:
                # Overall briefing feedback
                briefing_feedback = feedback_type
            else:
                # Article-specific feedback
                articles_feedback[article_position] = {
                    "feedback": feedback_type,
                    "title": article_title,
                    "source": article_source,
                }

        # Create response with all article positions (1 to article_count)
        articles = []
        for position in range(1, article_count + 1):
            article_data = articles_feedback.get(position, {})
            articles.append(
                {
                    "position": position,
                    "feedback": article_data.get("feedback"),
                    "title": article_data.get("title"),
                    "source": article_data.get("source"),
                }
            )

        logger.info("Feedback status retrieved successfully", 
                   run_id=run_id, 
                   briefing_feedback=briefing_feedback, 
                   article_count=article_count,
                   articles_with_feedback=len([a for a in articles if a["feedback"]]))
        
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("feedback/get_status", 200, duration_ms)
        
        return create_response(
            200,
            {
                "run_id": run_id,
                "briefing_feedback": briefing_feedback,
                "articles": articles,
            },
        )

    except Exception as e:
        logger.error("Unexpected error in get_feedback_status", error=str(e), run_id=run_id if 'run_id' in locals() else None)
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("feedback/get_status", 500, duration_ms)
        return create_response(500, {"error": str(e)})
