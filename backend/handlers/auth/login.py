import json
import boto3
import os
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
        email = body.get('email', '').lower().strip()
        password = body.get('password', '')
        
        if not email or not password:
            return create_response(400, {'error': 'Email and password are required'})
        
        # Authenticate with Cognito
        try:
            response = cognito.initiate_auth(
                ClientId=os.environ['CLIENT_ID'],
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )
            
            # Extract tokens from response
            auth_result = response.get('AuthenticationResult')
            if not auth_result:
                return create_response(401, {'error': 'Authentication failed'})
            
            access_token = auth_result.get('AccessToken')
            refresh_token = auth_result.get('RefreshToken')
            expires_in = auth_result.get('ExpiresIn')
            
            # Get user details from Cognito
            user_response = cognito.get_user(AccessToken=access_token)
            
            # Extract user attributes
            user_attributes = {}
            for attr in user_response.get('UserAttributes', []):
                user_attributes[attr['Name']] = attr['Value']
            
            cognito_id = user_response.get('Username')
            
        except cognito.exceptions.NotAuthorizedException:
            return create_response(401, {'error': 'Invalid email or password'})
        except cognito.exceptions.UserNotConfirmedException:
            return create_response(401, {'error': 'Please verify your email address first'})
        except cognito.exceptions.UserNotFoundException:
            return create_response(401, {'error': 'User not found'})
        except Exception as e:
            print(f"Cognito authentication error: {e}")
            return create_response(500, {'error': 'Authentication service error'})
        
        # Get user profile from database
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, email, first_name, last_name, country, interests, timezone, created_at
                    FROM time_brew.users 
                    WHERE cognito_id = %s AND is_active = true
                """, (cognito_id,))
                
                user_record = cur.fetchone()
            
            conn.close()
            
            if not user_record:
                return create_response(404, {'error': 'User profile not found'})
            
            # Build user object
            user = {
                'id': str(user_record[0]),
                'email': user_record[1],
                'firstName': user_record[2],
                'lastName': user_record[3],
                'country': user_record[4],
                'interests': user_record[5] or [],
                'timezone': user_record[6],
                'createdAt': user_record[7].isoformat() if user_record[7] else None
            }
            
        except Exception as e:
            print(f"Database error: {e}")
            # Even if database fails, we can still return the login success
            # with basic info from Cognito
            user = {
                'email': user_attributes.get('email', email),
                'firstName': user_attributes.get('given_name', ''),
                'lastName': user_attributes.get('family_name', ''),
                'cognitoId': cognito_id
            }
        
        # Return success response
        return create_response(200, {
            'message': 'Login successful',
            'accessToken': access_token,
            'refreshToken': refresh_token,
            'expiresIn': expires_in,
            'user': user
        })
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {'error': 'Internal server error'})