import json
from utils.db import get_db_connection
from utils.response import create_response


def lambda_handler(event, context):
    """
    Get Feedback Status Lambda Function
    Returns user's current feedback state for a briefing and its articles
    """
    try:
        # Extract briefing_id from path parameters
        briefing_id = event.get("pathParameters", {}).get("id")
        
        if not briefing_id:
            return create_response(
                400, {"error": "briefing_id is required"}
            )

        # Extract user_id from query parameters or request context
        user_email = event.get("queryStringParameters", {}).get("user_id")
        
        if not user_email:
            return create_response(
                400, {"error": "user_id is required"}
            )

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, get the user's UUID from their email
        cursor.execute(
            """
            SELECT id FROM time_brew.users WHERE email = %s
        """,
            (user_email,),
        )
        
        user_data = cursor.fetchone()
        if not user_data:
            cursor.close()
            conn.close()
            return create_response(404, {"error": "User not found"})
        
        user_id = user_data[0]

        # Verify briefing exists and belongs to user
        cursor.execute(
            """
            SELECT bf.id, bf.article_count, bf.user_id
            FROM time_brew.briefings bf
            WHERE bf.id = %s AND bf.user_id = %s
        """,
            (briefing_id, user_id),
        )

        briefing_data = cursor.fetchone()
        if not briefing_data:
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Briefing not found or access denied"})

        briefing_id_db, article_count, db_user_id = briefing_data

        # Get all feedback for this briefing and user
        cursor.execute(
            """
            SELECT article_position, feedback_type, article_title, article_source
            FROM time_brew.user_feedback
            WHERE briefing_id = %s AND user_id = %s
            ORDER BY article_position
        """,
            (briefing_id, user_id),
        )

        feedback_results = cursor.fetchall()
        cursor.close()
        conn.close()

        # Process feedback data
        briefing_feedback = None
        articles_feedback = {}
        
        for article_position, feedback_type, article_title, article_source in feedback_results:
            if article_position == 0:
                # Overall briefing feedback
                briefing_feedback = feedback_type
            else:
                # Article-specific feedback
                articles_feedback[article_position] = {
                    "feedback": feedback_type,
                    "title": article_title,
                    "source": article_source
                }

        # Create response with all article positions (1 to article_count)
        articles = []
        for position in range(1, article_count + 1):
            article_data = articles_feedback.get(position, {})
            articles.append({
                "position": position,
                "feedback": article_data.get("feedback"),
                "title": article_data.get("title"),
                "source": article_data.get("source")
            })

        return create_response(
            200,
            {
                "briefing_id": briefing_id,
                "briefing_feedback": briefing_feedback,
                "articles": articles
            },
        )

    except Exception as e:
        print(f"Error in get_feedback_status: {str(e)}")
        return create_response(500, {"error": str(e)})