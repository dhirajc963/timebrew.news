import json
from datetime import datetime
from utils.db import get_db_connection
from utils.response import create_response


def lambda_handler(event, context):
    """
    Get Briefing by ID Lambda Function
    Retrieves detailed information about a specific briefing
    """
    try:
        # Extract run_id from path parameters
        path_params = event.get("pathParameters") or {}
        run_id = path_params.get("id")

        if not run_id:
            return create_response(400, {"error": "run_id is required"})

        # Extract query parameters for additional options
        query_params = event.get("queryStringParameters") or {}
        include_content = query_params.get("include_content", "false").lower() == "true"
        include_articles = (
            query_params.get("include_articles", "false").lower() == "true"
        )

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Get main briefing data from editor_logs (now has user_id and brew_id)
            cursor.execute(
                """
                SELECT run_id, user_id, brew_id, editorial_content, raw_llm_response, email_sent, 
                       email_sent_time, created_at
                FROM time_brew.editor_logs
                WHERE run_id = %s
                """,
                (run_id,),
            )

            briefing_data = cursor.fetchone()
            if not briefing_data:
                return create_response(404, {"error": "Briefing not found"})

            (
                run_id,
                user_id,
                brew_id,
                editorial_content,
                raw_llm_response,
                email_sent,
                email_sent_time,
                created_at,
            ) = briefing_data

            # Use editorial_content if available, fallback to raw_llm_response
            editor_draft = None
            subject_line = None
            article_count = 0

            if editorial_content:
                # editorial_content is already parsed JSON
                editor_draft = editorial_content
                subject_line = editor_draft.get("subject", "")
                
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

                    subject_line = editor_draft.get("subject", "")

                    # Count articles if available
                    if editor_draft and "articles" in editor_draft:
                        article_count = len(editor_draft["articles"])

                except json.JSONDecodeError:
                    editor_draft = None
                    subject_line = None

            # Build basic response object
            briefing = {
                "id": run_id,
                "run_id": run_id,
                "brew_id": brew_id,
                "user_id": user_id,
                "status": "sent" if email_sent else "pending",
                "subject": subject_line,
                "article_count": article_count,
                "created_at": created_at.isoformat() if created_at else None,
                "sent_at": email_sent_time.isoformat() if email_sent_time else None,
                "email_sent": email_sent,
            }

            # Get user info if needed (for user_info field)
            cursor.execute(
                """
                SELECT email, first_name, last_name
                FROM time_brew.users
                WHERE id = %s
                """,
                (user_id,),
            )
            user_result = cursor.fetchone()
            if user_result:
                email, first_name, last_name = user_result
                user_name = (
                    f"{first_name} {last_name}"
                    if first_name and last_name
                    else first_name or "User"
                )
                briefing["user_info"] = {
                    "id": user_id,
                    "email": email,
                    "name": user_name,
                }

            # Get brew info if needed
            cursor.execute(
                """
                SELECT delivery_time, last_sent_date
                FROM time_brew.brews
                WHERE id = %s
                """,
                (brew_id,),
            )
            brew_result = cursor.fetchone()
            if brew_result:
                delivery_time, last_sent_date = brew_result
                briefing["brew_info"] = {
                    "id": brew_id,
                    "delivery_time": str(delivery_time) if delivery_time else None,
                    "last_sent_date": (
                        last_sent_date.isoformat() if last_sent_date else None
                    ),
                }

            # Include editor_draft content if requested
            if include_content and editor_draft:
                briefing["editor_draft"] = editor_draft

            # Include articles if requested
            if include_articles:
                cursor.execute(
                    """
                    SELECT raw_articles
                    FROM time_brew.curator_logs
                    WHERE run_id = %s
                    """,
                    (run_id,),
                )

                articles_result = cursor.fetchone()
                if articles_result and articles_result[0]:
                    raw_articles_data = articles_result[0]
                    try:
                        if isinstance(raw_articles_data, str):
                            articles = json.loads(raw_articles_data)
                        else:
                            articles = raw_articles_data

                        # Add position to each article for reference
                        for i, article in enumerate(articles):
                            article["position"] = i + 1

                        briefing["articles"] = articles
                    except json.JSONDecodeError:
                        briefing["articles"] = []
                else:
                    briefing["articles"] = []

        finally:
            cursor.close()
            conn.close()

        return create_response(200, briefing)

    except json.JSONDecodeError as e:
        return create_response(500, {"error": f"JSON parsing error: {str(e)}"})
    except Exception as e:
        print(f"Error in get_briefing_by_id: {str(e)}")
        return create_response(500, {"error": str(e)})
