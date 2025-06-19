import json
from datetime import datetime
from utils.db import get_db_connection
from utils.response import create_response

def lambda_handler(event, context):
    """
    Get Briefings Lambda Function
    Retrieves briefings for a user with pagination and filtering
    """
    try:
        # Extract query parameters
        query_params = event.get('queryStringParameters') or {}
        
        # Get user_id from path parameters or query parameters
        path_params = event.get('pathParameters') or {}
        user_id = path_params.get('user_id') or query_params.get('user_id')
        
        if not user_id:
            return create_response(400, {'error': 'user_id is required'})
        
        # Pagination parameters
        limit = int(query_params.get('limit', 20))
        offset = int(query_params.get('offset', 0))
        
        # Filter parameters
        status = query_params.get('status')  # Optional status filter
        brew_id = query_params.get('brew_id')  # Optional brew filter
        
        # Validate limit
        if limit > 100:
            limit = 100
        if limit < 1:
            limit = 20
        
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify user exists
        cursor.execute("SELECT id FROM time_brew.users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return create_response(404, {'error': 'User not found'})
        
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
        count_query = f"""
            SELECT COUNT(*)
            FROM time_brew.briefings bf
            LEFT JOIN time_brew.brews b ON bf.brew_id = b.id
            WHERE {where_clause}
        """
        
        cursor.execute(count_query, query_params_list)
        total_count = cursor.fetchone()[0]
        
        # Get briefings with pagination
        briefings_query = f"""
            SELECT bf.id, bf.brew_id, bf.execution_status, bf.subject_line, bf.article_count,
                   bf.created_at, bf.updated_at, bf.sent_at,
                   b.delivery_time, u.timezone
            FROM time_brew.briefings bf
            LEFT JOIN time_brew.brews b ON bf.brew_id = b.id
            LEFT JOIN time_brew.users u ON bf.user_id = u.id
            WHERE {where_clause}
            ORDER BY bf.created_at DESC
            LIMIT %s OFFSET %s
        """
        
        query_params_list.extend([limit, offset])
        cursor.execute(briefings_query, query_params_list)
        
        briefings = []
        for row in cursor.fetchall():
            (
                briefing_id, brew_id, execution_status, subject_line, article_count,
                created_at, updated_at, sent_at,
                delivery_time, timezone
            ) = row
            
            briefing = {
                'id': briefing_id,
                'brew_id': brew_id,
                'status': execution_status,
                'subject': subject_line,
                'article_count': article_count,
                'created_at': created_at.isoformat() if created_at else None,
                'updated_at': updated_at.isoformat() if updated_at else None,
                'sent_at': sent_at.isoformat() if sent_at else None,
                'brew_info': {
                    'delivery_time': str(delivery_time) if delivery_time else None,
                    'timezone': timezone
                } if brew_id else None
            }
            briefings.append(briefing)
        
        cursor.close()
        conn.close()
        
        # Calculate pagination info
        has_next = (offset + limit) < total_count
        has_prev = offset > 0
        
        return create_response(200, {
            'briefings': briefings,
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_next': has_next,
                'has_prev': has_prev
            },
            'filters': {
                'status': status,
                'brew_id': brew_id
            }
        })
        
    except ValueError as e:
        return create_response(400, {'error': f'Invalid parameter: {str(e)}'})
    except Exception as e:
        print(f"Error in get_briefings: {str(e)}")
        return create_response(500, {'error': str(e)})