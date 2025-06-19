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
        
        # Get brew ID from path parameters
        brew_id = event.get('pathParameters', {}).get('id')
        if not brew_id:
            return create_response(400, {'error': 'Brew ID is required'})
        
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
                
                # Get specific brew by ID for this user
                cur.execute(
                    """SELECT id, name, topics, delivery_time, article_count, created_at, is_active 
                       FROM time_brew.brews 
                       WHERE id = %s AND user_id = %s""",
                    (brew_id, user_id)
                )
                
                brew_result = cur.fetchone()
                if not brew_result:
                    return create_response(404, {'error': 'Brew not found'})
                
                # Parse topics JSON if it exists
                topics = brew_result[2]
                if isinstance(topics, str):
                    try:
                        topics = json.loads(topics)
                    except json.JSONDecodeError:
                        topics = []
                elif topics is None:
                    topics = []
                
                brew = {
                    'id': str(brew_result[0]),
                    'name': brew_result[1],
                    'topics': topics,
                    'delivery_time': str(brew_result[3]) if brew_result[3] else None,
                    'article_count': brew_result[4],
                    'created_at': brew_result[5].isoformat() + 'Z' if brew_result[5] else None,
                    'is_active': brew_result[6]
                }
                
                return create_response(200, {
                    'brew': brew
                })
                
        except Exception as e:
            print(f"Database error: {e}")
            return create_response(500, {'error': f'Database error: {str(e)}'})
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {'error': 'Internal server error'})