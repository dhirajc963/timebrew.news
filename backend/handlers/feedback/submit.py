import json
import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger


def lambda_handler(event, context):
    """
    Submit Feedback Lambda Function
    Allows users to submit feedback on briefings and articles
    """
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "feedback/submit")
    
    try:
        # Parse request body
        if "body" in event:
            if isinstance(event["body"], str):
                body = json.loads(event["body"])
            else:
                body = event["body"]
        else:
            body = event

        logger.info("Parsed request body", body_keys=list(body.keys()))

        # Extract required fields
        run_id = body.get("run_id")  # Updated from briefing_id
        feedback_type = body.get("feedback_type")  # 'overall', 'article'
        rating = body.get("rating")  # 1-5 scale
        
        logger.info("Extracted feedback data", 
                   run_id=run_id, 
                   feedback_type=feedback_type, 
                   rating=rating, 
                   has_article_position=bool(body.get("article_position")))

        if not all([run_id, feedback_type, rating]):
            logger.error("Missing required fields", 
                        run_id=run_id, 
                        feedback_type=feedback_type, 
                        rating=rating)
            return create_response(
                400, {"error": "run_id, feedback_type, and rating are required"}
            )

        # Validate feedback_type
        if feedback_type not in ["overall", "article"]:
            logger.error("Invalid feedback_type", feedback_type=feedback_type)
            return create_response(
                400, {"error": 'feedback_type must be either "overall" or "article"'}
            )

        # Validate rating
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError()
        except (ValueError, TypeError):
            logger.error("Invalid rating", rating=body.get("rating"), rating_type=type(body.get("rating")))
            return create_response(
                400, {"error": "rating must be an integer between 1 and 5"}
            )

        # Extract optional fields
        article_position = body.get("article_position")  # Required for article feedback
        comments = body.get("comments", "").strip()
        user_id = body.get("user_id")  # Optional, can be derived from briefing

        # Validate article feedback requirements
        if feedback_type == "article" and article_position is None:
            logger.error("Missing article_position for article feedback", 
                        feedback_type=feedback_type, 
                        article_position=article_position)
            return create_response(
                400, {"error": "article_position is required for article feedback"}
            )

        # Get database connection
        logger.info("Connecting to database")
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify run exists and get user_id if not provided
        logger.info("Verifying run exists", run_id=run_id)
        cursor.execute(
            """
            SELECT rt.run_id, rt.brew_id, rt.current_stage, 
                COALESCE(cl.article_count, 0) as article_count,
                rt.user_id, u.email
            FROM time_brew.run_tracker rt
            LEFT JOIN time_brew.users u ON rt.user_id = u.id
            LEFT JOIN time_brew.curator_logs cl ON rt.run_id = cl.run_id
            WHERE rt.run_id = %s
        """,
            (run_id,),
        )
        logger.log_db_operation("SELECT", "run_tracker, users, curator_logs", run_id=run_id)

        run_data = cursor.fetchone()
        if not run_data:
            logger.error("Run not found in database", run_id=run_id)
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Run not found"})

        run_id_db, brew_id, current_stage, article_count, db_user_id, email = run_data
        logger.info("Run data retrieved", 
                   run_id=run_id_db, 
                   brew_id=brew_id, 
                   current_stage=current_stage, 
                   article_count=article_count, 
                   user_id=db_user_id)

        # Use user_id from database if not provided
        if not user_id:
            user_id = db_user_id
            logger.info("Using user_id from database", user_id=user_id)
        elif user_id != db_user_id:
            logger.error("User authorization failed", 
                        provided_user_id=user_id, 
                        db_user_id=db_user_id, 
                        run_id=run_id)
            cursor.close()
            conn.close()
            return create_response(403, {"error": "User not authorized for this run"})

        # Validate article position if provided
        if feedback_type == "article":
            logger.info("Validating article feedback", 
                       article_count=article_count, 
                       article_position=article_position)
            
            # Check if articles are available for feedback
            if article_count == 0:
                logger.error("No articles available for feedback", 
                           run_id=run_id, 
                           article_count=article_count, 
                           current_stage=current_stage)
                cursor.close()
                conn.close()
                return create_response(
                    400,
                    {
                        "error": "No articles available for feedback. The briefing may still be processing or failed to generate articles."
                    },
                )
            
            try:
                article_position = int(article_position)
                if article_position < 1 or article_position > article_count:
                    logger.error("Article position out of range", 
                               article_position=article_position, 
                               article_count=article_count, 
                               run_id=run_id)
                    cursor.close()
                    conn.close()
                    return create_response(
                        400,
                        {
                            "error": f"article_position must be between 1 and {article_count}"
                        },
                    )
            except (ValueError, TypeError):
                logger.error("Invalid article_position type", 
                           article_position=body.get("article_position"), 
                           article_position_type=type(body.get("article_position")))
                cursor.close()
                conn.close()
                return create_response(
                    400, {"error": "article_position must be a valid integer"}
                )

        # For user_feedback table, we need to handle the simpler schema
        # Convert rating to feedback_type for user_feedback table
        if rating >= 4:
            simple_feedback_type = "like"
        elif rating <= 2:
            simple_feedback_type = "dislike"
        else:
            # Neutral ratings (3) are not stored in user_feedback
            logger.info("Neutral feedback received, not storing", 
                       rating=rating, 
                       run_id=run_id, 
                       user_id=user_id)
            duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            logger.log_request_end("feedback/submit", 200, duration_ms)
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
                "body": json.dumps(
                    {
                        "message": "Neutral feedback received but not stored",
                        "rating": rating,
                    }
                ),
            }
        
        logger.info("Processing feedback", 
                   simple_feedback_type=simple_feedback_type, 
                   rating=rating, 
                   run_id=run_id, 
                   user_id=user_id)

        # Check for existing feedback (any type) for toggle functionality
        logger.info("Checking for existing feedback", 
                   run_id=run_id, 
                   user_id=user_id, 
                   article_position=article_position or 0)
        
        existing_feedback_query = """
            SELECT id, feedback_type FROM time_brew.user_feedback
            WHERE run_id = %s AND user_id = %s AND article_position = %s
        """
        existing_params = [
            run_id,
            user_id,
            article_position or 0,
        ]

        cursor.execute(existing_feedback_query, existing_params)
        logger.log_db_operation("SELECT", "user_feedback", 
                               run_id=run_id, 
                               user_id=user_id, 
                               article_position=article_position or 0)
        existing_feedback = cursor.fetchone()

        if existing_feedback:
            existing_id, existing_type = existing_feedback
            logger.info("Found existing feedback", 
                       existing_id=existing_id, 
                       existing_type=existing_type, 
                       new_type=simple_feedback_type)

            if existing_type == simple_feedback_type:
                # Same feedback type - toggle off (delete)
                logger.info("Toggling off existing feedback", feedback_id=existing_id)
                cursor.execute(
                    "DELETE FROM time_brew.user_feedback WHERE id = %s", (existing_id,)
                )
                logger.log_db_operation("DELETE", "user_feedback", affected_rows=1, feedback_id=existing_id)
                conn.commit()
                cursor.close()
                conn.close()
                
                duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
                logger.log_request_end("feedback/submit", 200, duration_ms)
                return create_response(
                    200,
                    {
                        "message": "Feedback removed (toggled off)",
                        "feedback_id": None,
                        "run_id": run_id,
                        "feedback_type": feedback_type,
                        "rating": rating,
                        "article_position": (
                            article_position if feedback_type == "article" else None
                        ),
                        "action": "removed",
                    },
                )
            else:
                # Different feedback type - update existing
                logger.info("Updating existing feedback", 
                           feedback_id=existing_id, 
                           old_type=existing_type, 
                           new_type=simple_feedback_type)
                cursor.execute(
                    """
                    UPDATE time_brew.user_feedback 
                    SET feedback_type = %s, created_at = %s
                    WHERE id = %s
                    RETURNING id
                """,
                    (simple_feedback_type, datetime.now(timezone.utc), existing_id),
                )
                logger.log_db_operation("UPDATE", "user_feedback", affected_rows=1, feedback_id=existing_id)
                feedback_id = cursor.fetchone()[0]
                action = "updated"
        else:
            # Get article information for feedback storage
            logger.info("Creating new feedback entry")
            article_title = None
            article_source = None

            if feedback_type == "article" and article_position is not None:
                # Retrieve article details from curator_logs
                logger.info("Retrieving article details", 
                           run_id=run_id, 
                           article_position=article_position)
                cursor.execute(
                    """
                    SELECT raw_articles
                    FROM time_brew.curator_logs
                    WHERE run_id = %s
                """,
                    (run_id,),
                )
                logger.log_db_operation("SELECT", "curator_logs", run_id=run_id)
                cache_result = cursor.fetchone()
                if cache_result:
                    raw_articles_data = cache_result[0]
                    if isinstance(raw_articles_data, str):
                        raw_articles = json.loads(raw_articles_data)
                    else:
                        raw_articles = raw_articles_data
                    
                    logger.info("Retrieved raw articles", 
                               articles_count=len(raw_articles) if raw_articles else 0)

                    # Get article at the specified position (1-indexed)
                    if raw_articles and 0 < article_position <= len(raw_articles):
                        article = raw_articles[article_position - 1]
                        article_title = article.get("headline", "")[
                            :500
                        ]  # Truncate to fit column
                        article_source = article.get("source", "")[
                            :200
                        ]  # Truncate to fit column
                        logger.info("Extracted article details", 
                                   article_title=article_title[:100] + "..." if len(article_title) > 100 else article_title, 
                                   article_source=article_source)
                else:
                    logger.warn("No curator_logs found for run", run_id=run_id)

            # Insert new feedback with article information
            logger.info("Inserting new feedback", 
                       run_id=run_id, 
                       user_id=user_id, 
                       feedback_type=simple_feedback_type, 
                       article_position=article_position or 0)
            cursor.execute(
                """
                INSERT INTO time_brew.user_feedback
                (run_id, user_id, feedback_type, article_position, article_title, article_source, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """,
                (
                    run_id,
                    user_id,
                    simple_feedback_type,
                    article_position or 0,
                    article_title,
                    article_source,
                    datetime.now(timezone.utc),
                ),
            )
            logger.log_db_operation("INSERT", "user_feedback", affected_rows=1)
            feedback_id = cursor.fetchone()[0]
            action = "submitted"
            logger.info("Feedback inserted successfully", feedback_id=feedback_id)

        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("Feedback operation completed successfully", 
                   action=action, 
                   feedback_id=feedback_id, 
                   run_id=run_id)
        
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("feedback/submit", 200, duration_ms)
        return create_response(
            200,
            {
                "message": f"Feedback {action} successfully",
                "feedback_id": feedback_id,
                "run_id": run_id,
                "feedback_type": feedback_type,
                "rating": rating,
                "article_position": (
                    article_position if feedback_type == "article" else None
                ),
                "action": action,
            },
        )

    except json.JSONDecodeError as e:
        logger.error("JSON decode error", error=e, event_body=event.get("body", "")[:200])
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("feedback/submit", 400, duration_ms)
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        logger.error("Unexpected error in submit_feedback", error=e)
        duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        logger.log_request_end("feedback/submit", 500, duration_ms)
        return create_response(500, {"error": str(e)})
