import json
import boto3
import os
from utils.db import get_db_connection
from utils.response import create_response

cognito = boto3.client('cognito-idp')

def handler(event, context):
    try:
        # Check for Authorization header
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return create_response(401, {'error': 'Authorization token is required'})
        
        # Extract token
        token = auth_header.split(' ')[1]
        
        # Get user from Cognito
        try:
            user_response = cognito.get_user(AccessToken=token)
            cognito_id = user_response.get('Username')
        except Exception as e:
            print(f"Cognito error: {e}")
            return create_response(401, {'error': 'Invalid or expired token'})
        
        # Get user ID from database
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Get user ID from cognito_id
                cur.execute(
                    "SELECT id FROM time_brew.users WHERE cognito_id = %s",
                    (cognito_id,)
                )
                user_result = cur.fetchone()
                
                if not user_result:
                    return create_response(404, {'error': 'User not found'})
                
                user_id = user_result[0]
                
                # Get brews for user
                cur.execute(
                    """SELECT id, name, topic, keywords, delivery_time, article_count, created_at, is_active 
                       FROM time_brew.brews 
                       WHERE user_id = %s 
                       ORDER BY created_at DESC""",
                    (user_id,)
                )
                
                brews = []
                for row in cur.fetchall():
                    brews.append({
                        'id': str(row[0]),
                        'name': row[1],
                        'topic': row[2],
                        'topics': row[3] if row[3] else [],
                        'delivery_time': row[4],
                        'article_count': row[5],
                        'created_at': row[6].isoformat() if row[6] else None,
                        'is_active': row[7]
                    })
                
                return create_response(200, {
                    'brews': brews
                })
                
        except Exception as e:
            print(f"Database error: {e}")
            return create_response(500, {'error': f'Database error: {str(e)}'})
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {'error': 'Internal server error'})