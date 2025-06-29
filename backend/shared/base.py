"""Base handler class - eliminates common patterns across all handlers."""
import json
from datetime import datetime, timezone
from shared.utils.response import create_response
from shared.middleware.auth import authenticate_user, validate_ownership


class BaseHandler:
    """Base class for all Lambda handlers with common patterns."""
    
    def __init__(self, event, context):
        self.event = event
        self.context = context
        self.start_time = datetime.now(timezone.utc)
    
    def handle_auth_required(self):
        """Handle authenticated requests."""
        user_data, auth_error = authenticate_user(self.event)
        if auth_error:
            return auth_error
        
        self.user_data = user_data
        return self.process_authenticated_request()
    
    def handle_no_auth(self):
        """Handle requests that don't require authentication."""
        return self.process_unauthenticated_request()
    
    def validate_ownership_required(self, resource_type, resource_id):
        """Validate user owns the resource."""
        is_valid, error = validate_ownership(self.user_data["id"], resource_type, resource_id)
        if not is_valid:
            return error
        return None
    
    def get_path_param(self, param_name, required=True):
        """Extract path parameter."""
        value = self.event.get("pathParameters", {}).get(param_name)
        if required and not value:
            return None, create_response(400, {"error": f"{param_name} is required"})
        return value, None
    
    def get_query_param(self, param_name, default=None, required=False):
        """Extract query parameter."""
        value = self.event.get("queryStringParameters", {}).get(param_name, default)
        if required and not value:
            return None, create_response(400, {"error": f"{param_name} is required"})
        return value, None
    
    def parse_body(self):
        """Parse JSON body."""
        try:
            body = self.event.get("body")
            if isinstance(body, str):
                return json.loads(body), None
            return body or {}, None
        except json.JSONDecodeError:
            return None, create_response(400, {"error": "Invalid JSON"})
    
    def success_response(self, data):
        """Standard success response."""
        return create_response(200, data)
    
    def error_response(self, status_code, message):
        """Standard error response."""
        return create_response(status_code, {"error": message})
    
    def process_authenticated_request(self):
        """Override in subclasses for authenticated requests."""
        raise NotImplementedError
    
    def process_unauthenticated_request(self):
        """Override in subclasses for unauthenticated requests."""
        raise NotImplementedError