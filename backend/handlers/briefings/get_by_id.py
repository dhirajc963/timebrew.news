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
        # Extract briefing_id from path parameters
        path_params = event.get("pathParameters") or {}
        briefing_id = path_params.get("id")

        if not briefing_id:
            return create_response(400, {"error": "briefing_id is required"})

        # Extract query parameters for additional options
        query_params = event.get("queryStringParameters") or {}
        include_content = query_params.get("include_content", "false").lower() == "true"
        include_articles = (
            query_params.get("include_articles", "false").lower() == "true"
        )

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get briefing details with related data
        cursor.execute(
            """
            SELECT bf.id, bf.brew_id, bf.user_id, bf.execution_status, bf.subject_line, bf.html_content,
                bf.article_count, bf.created_at, bf.updated_at, bf.sent_at,
                b.delivery_time, u.timezone, b.last_sent_date,
                u.email, u.first_name, u.last_name
            FROM time_brew.briefings bf
            LEFT JOIN time_brew.brews b ON bf.brew_id = b.id
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

        (
            briefing_id,
            brew_id,
            user_id,
            execution_status,
            subject_line,
            html_content,
            article_count,
            created_at,
            updated_at,
            sent_at,
            delivery_time,
            timezone,
            last_sent_date,
            email,
            first_name,
            last_name,
        ) = briefing_data

        # Build user name
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "User"
        )

        # Build response object
        briefing = {
            "id": briefing_id,
            "brew_id": brew_id,
            "user_id": user_id,
            "status": execution_status,
            "subject": subject_line,
            "article_count": article_count,
            "created_at": created_at.isoformat() if created_at else None,
            "updated_at": updated_at.isoformat() if updated_at else None,
            "sent_at": sent_at.isoformat() if sent_at else None,
            "brew_info": (
                {
                    "id": brew_id,
                    "delivery_time": str(delivery_time) if delivery_time else None,
                    "timezone": timezone,
                    "last_sent_date": (
                        last_sent_date.isoformat() if last_sent_date else None
                    ),
                }
                if brew_id
                else None
            ),
            "user_info": (
                {"id": user_id, "email": email, "name": user_name} if user_id else None
            ),
        }

        # Include HTML content if requested
        if include_content and html_content:
            briefing["content"] = html_content

        # Include articles if requested
        if include_articles:
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
                    articles = json.loads(raw_articles_data)
                else:
                    articles = raw_articles_data

                # Add position to each article for reference
                for i, article in enumerate(articles):
                    article["position"] = i + 1

                briefing["articles"] = articles
            else:
                briefing["articles"] = []

        cursor.close()
        conn.close()

        return create_response(200, briefing)

    except json.JSONDecodeError as e:
        return create_response(500, {"error": f"JSON parsing error: {str(e)}"})
    except Exception as e:
        print(f"Error in get_briefing_by_id: {str(e)}")
        return create_response(500, {"error": str(e)})
