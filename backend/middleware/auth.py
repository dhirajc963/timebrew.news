"""Optimized authentication middleware - eliminates duplication across 8+ handlers."""
import boto3
from utils.db import get_db_connection
from utils.response import create_response


def authenticate_user(event):
    """Single function that handles all auth validation and user lookup.
    
    Returns: (user_data, error_response)
    - Success: ({"id": str, "email": str, "cognito_id": str}, None)
    - Failure: (None, error_response_dict)
    """
    print(f"[AUTH] Starting user authentication")
    
    # Extract token
    auth_header = event.get("headers", {}).get("Authorization", "")
    print(f"[AUTH] Auth header present: {bool(auth_header)}")
    
    if not auth_header.startswith("Bearer "):
        print(f"[AUTH] ERROR: Invalid authorization header format")
        return None, create_response(401, {"error": "Invalid authorization"})
    
    token = auth_header.split(" ")[1]
    print(f"[AUTH] Token extracted, length: {len(token) if token else 0}")
    
    try:
        # Validate with Cognito and get user from DB in one flow
        print(f"[AUTH] Validating token with Cognito")
        cognito = boto3.client("cognito-idp")
        user_response = cognito.get_user(AccessToken=token)
        cognito_id = user_response.get("Username")
        print(f"[AUTH] Cognito validation successful, cognito_id: {cognito_id}")
        
        # Single optimized query to get user
        print(f"[AUTH] Looking up user in database")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, cognito_id FROM time_brew.users WHERE cognito_id = %s AND is_active = true",
            (cognito_id,)
        )
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            print(f"[AUTH] ERROR: User not found in database for cognito_id: {cognito_id}")
            return None, create_response(404, {"error": "User not found"})
        
        print(f"[AUTH] User authentication successful: user_id={user[0]}, email={user[1]}")
        return {"id": str(user[0]), "email": user[1], "cognito_id": user[2]}, None
        
    except Exception as e:
        print(f"[AUTH] ERROR: Authentication failed: {str(e)}")
        import traceback
        print(f"[AUTH] ERROR: Traceback: {traceback.format_exc()}")
        return None, create_response(401, {"error": "Invalid token"})


def validate_ownership(user_id, resource_type, resource_id):
    """Fast ownership validation with optimized queries.
    
    Returns: (is_valid, error_response)
    """
    print(f"[AUTH] Validating ownership: user_id={user_id}, resource_type={resource_type}, resource_id={resource_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if resource_type == 'brew':
            print(f"[AUTH] Checking brew ownership")
            cursor.execute("SELECT 1 FROM time_brew.brews WHERE id = %s AND user_id = %s", 
                          (resource_id, user_id))
        elif resource_type in ['briefing', 'run']:
            print(f"[AUTH] Checking briefing/run ownership")
            cursor.execute("SELECT 1 FROM time_brew.run_tracker WHERE run_id = %s AND user_id = %s",
                          (resource_id, user_id))
        elif resource_type == 'editorial':
            print(f"[AUTH] Checking editorial ownership")
            cursor.execute("SELECT 1 FROM time_brew.editor_logs WHERE id = %s AND user_id = %s",
                          (resource_id, user_id))
        else:
            print(f"[AUTH] ERROR: Invalid resource type: {resource_type}")
            return False, create_response(400, {"error": "Invalid resource type"})
        
        result = cursor.fetchone()
        print(f"[AUTH] Ownership query result: {result}")
        
        if not result:
            print(f"[AUTH] ERROR: Access denied - no ownership found")
            return False, create_response(403, {"error": "Access denied"})
        
        print(f"[AUTH] Ownership validation successful")
        return True, None
        
    except Exception as e:
        print(f"[AUTH] ERROR: Ownership validation failed: {str(e)}")
        import traceback
        print(f"[AUTH] ERROR: Traceback: {traceback.format_exc()}")
        return False, create_response(500, {"error": "Validation failed"})
    finally:
        print(f"[AUTH] Closing database connection")
        conn.close()