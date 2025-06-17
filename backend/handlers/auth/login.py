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
        
        if not email:
            return create_response(400, {'error': 'Email is required'})
        
        # Initiate EMAIL_OTP authentication with Cognito
        try:
            response = cognito.initiate_auth(
                ClientId=os.environ['CLIENT_ID'],
                AuthFlow='USER_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PREFERRED_CHALLENGE': 'EMAIL_OTP'  # Request EMAIL_OTP challenge

                }
            )
            
            # Check if challenge is required (EMAIL_OTP)
            if response.get('ChallengeName') == 'EMAIL_OTP':
                return create_response(200, {
                    'message': 'Verification code sent to your email',
                    'challengeName': response['ChallengeName'],
                    'session': response.get('Session'),
                    'email': email,
                    'nextStep': 'enter_otp_code'
                })
            else:
                return create_response(500, {'error': 'Unexpected authentication flow'})
            
        except cognito.exceptions.UserNotFoundException:
            return create_response(404, {'error': 'No account found with this email address. Please sign up first.'})
        except cognito.exceptions.UserNotConfirmedException:
            return create_response(400, {
                'error': 'Please verify your email address first. Check your inbox for a verification email.',
                'nextStep': 'verify_email_first'
            })
        except cognito.exceptions.InvalidParameterException as e:
            return create_response(400, {'error': f'Invalid request: {str(e)}'})
        except Exception as e:
            print(f"Cognito authentication error: {e}")
            return create_response(500, {'error': 'Authentication service error'})
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Unexpected error: {e}")
        return create_response(500, {'error': 'Internal server error'})