import json
from datetime import datetime
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger


def lambda_handler(event, context):
    """
    Get Briefings Lambda Function
    Retrieves briefings for a user with pagination and filtering
    """
    start_time = datetime.utcnow()
    logger.log_request_start(event, context, "briefings/get")

    try:
        # Extract query parameters
        query_params = event.get("queryStringParameters") or {}

        # Get user_id from path parameters or query parameters
        path_params = event.get("pathParameters") or {}
        user_id = path_params.get("user_id") or query_params.get("user_id")

        if not user_id:
            logger.error("Missing required parameter: user_id")
            logger.log_request_end(
                "briefings/get",
                400,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return create_response(400, {"error": "user_id is required"})

        # Set context for this request
        logger.set_context(user_id=user_id)

        # Pagination parameters
        limit = int(query_params.get("limit", 20))
        offset = int(query_params.get("offset", 0))

        # Filter parameters
        status = query_params.get("status")  # Optional status filter
        brew_id = query_params.get("brew_id")  # Optional brew filter

        logger.info(
            "Processing briefings request",
            limit=limit,
            offset=offset,
            status=status,
            brew_id=brew_id,
        )

        # Validate limit
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 20

        # Get database connection
        db_start_time = datetime.utcnow()
        conn = get_db_connection()
        cursor = conn.cursor()
        db_connection_time = (datetime.utcnow() - db_start_time).total_seconds() * 1000
        logger.log_db_operation("briefings", "connection", db_connection_time)

        # Verify user exists
        user_check_start = datetime.utcnow()
        cursor.execute("SELECT id FROM time_brew.users WHERE id = %s", (user_id,))
        user_exists = cursor.fetchone()
        user_check_time = (datetime.utcnow() - user_check_start).total_seconds() * 1000

        if not user_exists:
            logger.error("User not found in database", user_id=user_id)
            logger.log_db_operation(
                "briefings", "user_verification", user_check_time, status="not_found"
            )
            cursor.close()
            conn.close()
            logger.log_request_end(
                "briefings/get",
                404,
                (datetime.utcnow() - start_time).total_seconds() * 1000,
            )
            return create_response(404, {"error": "User not found"})

        logger.log_db_operation(
            "briefings", "user_verification", user_check_time, status="success"
        )

        # Build query with filters
        where_conditions = ["bf.user_id = %s"]
        query_params_list = [user_id]

        if status:
            where_conditions.append("bf.execution_status = %s")
            query_params_list.append(status)

        if brew_id:
            where_conditions.append("bf.brew_id = %s")
            query_params_list.append(brew_id)

        where_clause = " AND ".join(where_conditions)

        # Get total count
        count_start_time = datetime.utcnow()
        count_query = f"""
            SELECT COUNT(*)
            FROM time_brew.briefings bf
            LEFT JOIN time_brew.brews b ON bf.brew_id = b.id
            WHERE {where_clause}
        """

        cursor.execute(count_query, query_params_list)
        total_count = cursor.fetchone()[0]
        count_query_time = (datetime.utcnow() - count_start_time).total_seconds() * 1000
        logger.log_db_operation(
            "briefings", "count_query", count_query_time, total_count=total_count
        )

        # Get briefings with pagination
        briefings_query = f"""
            SELECT bf.id, bf.brew_id, bf.execution_status, bf.editor_draft, bf.article_count,
                bf.created_at, bf.updated_at, bf.sent_at, bf.opened_at, bf.click_count, bf.delivery_status,
                b.delivery_time, u.timezone
            FROM time_brew.briefings bf
            LEFT JOIN time_brew.brews b ON bf.brew_id = b.id
            LEFT JOIN time_brew.users u ON bf.user_id = u.id
            WHERE {where_clause}
            ORDER BY bf.created_at DESC
            LIMIT %s OFFSET %s
        """

        query_params_list.extend([limit, offset])

        # Execute main briefings query
        briefings_start_time = datetime.utcnow()
        cursor.execute(briefings_query, query_params_list)
        rows = cursor.fetchall()
        briefings_query_time = (
            datetime.utcnow() - briefings_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "briefings",
            "briefings_query",
            briefings_query_time,
            rows_returned=len(rows),
        )

        briefings = []
        for row in rows:
            (
                briefing_id,
                brew_id,
                execution_status,
                editor_draft_raw,
                article_count,
                created_at,
                updated_at,
                sent_at,
                opened_at,
                click_count,
                delivery_status,
                delivery_time,
                timezone,
            ) = row

            # Parse editor_draft JSON
            editor_draft = None
            subject_line = None
            if editor_draft_raw:
                try:
                    if isinstance(editor_draft_raw, str):
                        editor_draft = json.loads(editor_draft_raw)
                    else:
                        editor_draft = editor_draft_raw
                    subject_line = editor_draft.get("subject", "")
                except json.JSONDecodeError:
                    editor_draft = None
                    subject_line = None

            briefing = {
                "id": briefing_id,
                "brew_id": brew_id,
                "user_id": user_id,
                "subject_line": subject_line,
                "editor_draft": editor_draft,
                "sent_at": sent_at.isoformat() if sent_at else None,
                "article_count": article_count,
                "opened_at": opened_at.isoformat() if opened_at else None,
                "click_count": click_count or 0,
                "delivery_status": delivery_status,
                "execution_status": execution_status,
                "created_at": created_at.isoformat() if created_at else None,
                "updated_at": updated_at.isoformat() if updated_at else None,
                "brew_info": (
                    {
                        "delivery_time": str(delivery_time) if delivery_time else None,
                        "timezone": timezone,
                    }
                    if brew_id
                    else None
                ),
            }
            briefings.append(briefing)

        cursor.close()
        conn.close()

        # Calculate pagination info
        has_next = (offset + limit) < total_count
        has_prev = offset > 0

        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(
            "Briefings retrieval completed successfully",
            briefings_count=len(briefings),
            total_count=total_count,
            total_time_ms=round(total_time, 2),
        )

        response = create_response(
            200,
            {
                "briefings": briefings,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_next": has_next,
                    "has_prev": has_prev,
                },
                "filters": {"status": status, "brew_id": brew_id},
            },
        )

        logger.log_request_end("briefings/get", 200, total_time)
        return response

    except ValueError as e:
        logger.error("Invalid parameter in briefings request", error=str(e))
        logger.log_request_end(
            "briefings/get",
            400,
            (datetime.utcnow() - start_time).total_seconds() * 1000,
        )
        return create_response(400, {"error": f"Invalid parameter: {str(e)}"})
    except Exception as e:
        logger.error("Unexpected error in briefings retrieval", error=str(e))
        logger.log_request_end(
            "briefings/get",
            500,
            (datetime.utcnow() - start_time).total_seconds() * 1000,
        )
        return create_response(500, {"error": "Internal server error"})
