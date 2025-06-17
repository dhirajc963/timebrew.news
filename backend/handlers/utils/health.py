import json
from utils.db import test_db_connection
from utils.response import create_response

def handler(event, context):
    # Test database connection
    db_status = test_db_connection()
    
    return create_response(200, {
        'message': 'TimeBrew API is healthy!',
        'timestamp': '2025-06-15T10:00:00Z',
        'service': 'timebrew-backend',
        'database': 'connected' if db_status else 'disconnected'
    })