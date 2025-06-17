import json
import boto3
import os
import uuid
from utils.db import get_db_connection
from utils.response import create_response

cognito = boto3.client('cognito-idp')

def handler(event, context):
    try:
        # Parse request body
        if not event.get('body'):
            return create_response(400, {'error': 'Request body is required'})
        
        body = json.loads(event['body'])
        
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName', 'country', 'interests']
        for field in required_fields:
            if not body.get(field):
                return create_response(400, {'error': f'{field} is required'})
        
        email = body['email'].lower().strip()
        password = body['password']
        first_name = body['firstName'].strip()
        last_name = body['lastName'].strip()
        country = body['country'].strip()
        interests = body['interests']  # Should be an array
        timezone = body.get('timezone', 'UTC')
        
        # Validate interests is an array
        if not isinstance(interests, list) or len(interests) == 0:
            return create_response(400, {'error': 'At least one interest is required'})
        
        # Create user in Cognito
        try:
            cognito_response = cognito.admin_create_user(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=email,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'},
                ],
                TemporaryPassword=password,
                MessageAction='SUPPRESS'  # Don't send welcome email
            )
            
            # Set permanent password
            cognito.admin_set_user_password(
                UserPoolId=os.environ['USER_POOL_ID'],
                Username=email,
                Password=password,
                Permanent=True
            )
            
            cognito_id = cognito_response['User']['Username']
            
        except cognito.exceptions.UsernameExistsException:
            return create_response(400, {'error': 'User with this email already exists'})
        except Exception as e:
            print(f"Cognito error: {e}")
            return create_response(500, {'error': 'Failed to create user account'})
        
        # Store user profile in database
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO time_brew.users (cognito_id, email, first_name, last_name, country, interests, timezone)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (cognito_id, email, first_name, last_name, country, interests, timezone))
                
                user_id, created_at = cur.fetchone()
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Database error: {e}")
            # Rollback: Delete user from Cognito if database insert failed
            try:
                cognito.admin_delete_user(
                    UserPoolId=os.environ['USER_POOL_ID'],
                    Username=email
                )
            except:
                pass
            return create_response(500, {'error': 'Failed to create user profile'})
        
        # Return success response
        return create_response(201, {
            'message': 'User registered successfully',
            'user': {
                'id': str(user_id),
                'email': email,
                'firstName': first_name,
                'lastName': last_name,
                'country': country,
                'interests': interests,
                'timezone': timezone,
                'createdAt': created_at.isoformat()
            }
        })
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {'error': 'Internal server error'})