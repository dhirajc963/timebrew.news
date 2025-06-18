import json
import uuid
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
        
        # Parse request body
        if not event.get('body'):
            return create_response(400, {'error': 'Request body is required'})
        
        body = json.loads(event['body'])
        
        # Validate required fields
        name = body.get('name')
        topic = body.get('topics', [])[0] if body.get('topics') else None  # Use first topic as main topic
        topics = body.get('topics', [])
        delivery_time = body.get('delivery_time')
        article_count = body.get('article_count', 5)
        
        if not name or not topic or not delivery_time:
            return create_response(400, {'error': 'Name, topics, and delivery time are required'})
        
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
                
                # Insert brew
                cur.execute(
                    """INSERT INTO time_brew.brews 
                       (user_id, name, topic, keywords, delivery_time, article_count) 
                       VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at""",
                    (user_id, name, topic, topics, delivery_time, article_count)
                )
                
                brew_result = cur.fetchone()
                brew_id = brew_result[0]
                created_at = brew_result[1]
                
                conn.commit()
                
                # Return created brew
                return create_response(201, {
                    'id': str(brew_id),
                    'name': name,
                    'topic': topic,
                    'topics': topics,
                    'delivery_time': delivery_time,
                    'article_count': article_count,
                    'created_at': created_at.isoformat(),
                    'is_active': True
                })
                
        except Exception as e:
            conn.rollback()
            print(f"Database error: {e}")
            return create_response(500, {'error': f'Database error: {str(e)}'})
        finally:
            conn.close()
            
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {'error': 'Internal server error'})