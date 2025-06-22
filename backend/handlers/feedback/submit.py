import json
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response


def lambda_handler(event, context):
    """
    Submit Feedback Lambda Function
    Allows users to submit feedback on briefings and articles
    """
    try:
        # Parse request body
        if "body" in event:
            if isinstance(event["body"], str):
                body = json.loads(event["body"])
            else:
                body = event["body"]
        else:
            body = event

        # Extract required fields
        briefing_id = body.get("briefing_id")
        feedback_type = body.get("feedback_type")  # 'overall', 'article'
        rating = body.get("rating")  # 1-5 scale

        if not all([briefing_id, feedback_type, rating]):
            return create_response(
                400, {"error": "briefing_id, feedback_type, and rating are required"}
            )

        # Validate feedback_type
        if feedback_type not in ["overall", "article"]:
            return create_response(
                400, {"error": 'feedback_type must be either "overall" or "article"'}
            )

        # Validate rating
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return create_response(
                400, {"error": "rating must be an integer between 1 and 5"}
            )

        # Extract optional fields
        article_position = body.get("article_position")  # Required for article feedback
        comments = body.get("comments", "").strip()
        user_id = body.get("user_id")  # Optional, can be derived from briefing

        # Validate article feedback requirements
        if feedback_type == "article" and article_position is None:
            return create_response(
                400, {"error": "article_position is required for article feedback"}
            )

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify briefing exists and get user_id if not provided
        cursor.execute(
            """
            SELECT bf.id, bf.brew_id, bf.execution_status, bf.article_count,
                bf.user_id, u.email
            FROM time_brew.briefings bf
            LEFT JOIN time_brew.users u ON bf.user_id = u.id
            WHERE bf.id = %s
        """,
            (briefing_id,),
        )

        briefing_data = cursor.fetchone()
        if not briefing_data:
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Briefing not found"})

        briefing_id_db, brew_id, execution_status, article_count, db_user_id, email = (
            briefing_data
        )

        # Use user_id from database if not provided
        if not user_id:
            user_id = db_user_id
        elif user_id != db_user_id:
            cursor.close()
            conn.close()
            return create_response(
                403, {"error": "User not authorized for this briefing"}
            )

        # Validate article position if provided
        if feedback_type == "article":
            try:
                article_position = int(article_position)
                if article_position < 1 or article_position > article_count:
                    cursor.close()
                    conn.close()
                    return create_response(
                        400,
                        {
                            "error": f"article_position must be between 1 and {article_count}"
                        },
                    )
            except (ValueError, TypeError):
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

        # Check for existing feedback (prevent duplicates)
        existing_feedback_query = """
            SELECT id FROM time_brew.user_feedback
            WHERE briefing_id = %s AND user_id = %s AND feedback_type = %s AND article_position = %s
        """
        existing_params = [
            briefing_id,
            user_id,
            simple_feedback_type,
            article_position or 0,
        ]

        cursor.execute(existing_feedback_query, existing_params)
        existing_feedback = cursor.fetchone()

        if existing_feedback:
            feedback_id = existing_feedback[0]
            action = "updated (existing)"
        else:
            # Get article information for feedback storage
            article_title = None
            article_source = None

            if feedback_type == "article" and article_position is not None:
                # Retrieve article details from curation_cache
                cursor.execute(
                    """
                    SELECT raw_articles
                    FROM time_brew.curation_cache
                    WHERE briefing_id = %s
                """,
                    (briefing_id,),
                )

                cache_result = cursor.fetchone()
                if cache_result:
                    raw_articles_data = cache_result[0]
                    if isinstance(raw_articles_data, str):
                        raw_articles = json.loads(raw_articles_data)
                    else:
                        raw_articles = raw_articles_data

                    # Get article at the specified position (1-indexed)
                    if raw_articles and 0 < article_position <= len(raw_articles):
                        article = raw_articles[article_position - 1]
                        article_title = article.get("headline", "")[
                            :500
                        ]  # Truncate to fit column
                        article_source = article.get("source", "")[
                            :200
                        ]  # Truncate to fit column

            # Insert new feedback with article information
            cursor.execute(
                """
                INSERT INTO time_brew.user_feedback
                (briefing_id, user_id, feedback_type, article_position, article_title, article_source, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """,
                (
                    briefing_id,
                    user_id,
                    simple_feedback_type,
                    article_position or 0,
                    article_title,
                    article_source,
                    datetime.now(timezone.utc),
                ),
            )
            feedback_id = cursor.fetchone()[0]
            action = "submitted"

        conn.commit()
        cursor.close()
        conn.close()

        return create_response(
            200,
            {
                "message": f"Feedback {action} successfully",
                "feedback_id": feedback_id,
                "briefing_id": briefing_id,
                "feedback_type": feedback_type,
                "rating": rating,
                "article_position": (
                    article_position if feedback_type == "article" else None
                ),
                "action": action,
            },
        )

    except json.JSONDecodeError:
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        print(f"Error in submit_feedback: {str(e)}")
        return create_response(500, {"error": str(e)})
