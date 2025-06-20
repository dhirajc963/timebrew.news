import json
import traceback
from datetime import datetime
from typing import Any, Dict, Optional


class Logger:
    """
    Enhanced logger class with structured logging and context support.
    Provides consistent logging across all Lambda functions with proper context.
    """

    def __init__(self, name="TimeBrew"):
        self.name = name
        self.context = {}

    def set_context(self, **kwargs):
        """Set context that will be included in all log messages."""
        self.context.update(kwargs)

    def clear_context(self):
        """Clear all context."""
        self.context = {}

    def _format_message(
        self, level: str, message: str, extra_context: Optional[Dict] = None
    ) -> str:
        """Format log message as simple plain text with timestamp and level."""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # Start with basic format
        formatted_msg = f"[{timestamp}] {level}: {message}"

        # Add context if available
        context_parts = []
        if self.context:
            for key, value in self.context.items():
                context_parts.append(f"{key}={value}")

        if extra_context:
            for key, value in extra_context.items():
                if isinstance(value, (dict, list)):
                    context_parts.append(f"{key}={json.dumps(value, default=str)}")
                else:
                    context_parts.append(f"{key}={value}")

        if context_parts:
            formatted_msg += f" | {' '.join(context_parts)}"

        return formatted_msg

    def info(self, message: str, **kwargs):
        """Log info level message with optional context."""
        formatted_msg = self._format_message(
            "INFO", message, kwargs if kwargs else None
        )
        print(formatted_msg)

    def warn(self, message: str, **kwargs):
        """Log warning level message with optional context."""
        formatted_msg = self._format_message(
            "WARN", message, kwargs if kwargs else None
        )
        print(formatted_msg)

    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error level message with optional exception details and context."""
        extra_context = kwargs.copy() if kwargs else {}

        if error:
            extra_context["error_type"] = type(error).__name__
            extra_context["error_message"] = str(error)
            extra_context["traceback"] = traceback.format_exc()

        formatted_msg = self._format_message("ERROR", message, extra_context)
        print(formatted_msg)

    def debug(self, message: str, **kwargs):
        """Log debug level message with optional context."""
        formatted_msg = self._format_message(
            "DEBUG", message, kwargs if kwargs else None
        )
        print(formatted_msg)

    def log_request_start(self, event: Dict, context: Any, handler_name: str):
        """Log the start of a Lambda request with full context."""
        request_id = getattr(context, "aws_request_id", "unknown")
        self.set_context(
            request_id=request_id,
            handler=handler_name,
            function_name=getattr(context, "function_name", "unknown"),
            function_version=getattr(context, "function_version", "unknown"),
        )

        # Extract relevant event data without sensitive info
        event_data = {
            "http_method": event.get(
                "httpMethod",
                event.get("requestContext", {}).get("http", {}).get("method"),
            ),
            "path": event.get(
                "path", event.get("requestContext", {}).get("http", {}).get("path")
            ),
            "source_ip": event.get("requestContext", {})
            .get("identity", {})
            .get("sourceIp"),
            "user_agent": event.get("headers", {}).get("User-Agent"),
            "has_body": bool(event.get("body")),
            "query_params": event.get("queryStringParameters"),
            "path_params": event.get("pathParameters"),
        }

        self.info(f"Request started: {handler_name}", event_data=event_data)

    def log_request_end(self, handler_name: str, status_code: int, duration_ms: float):
        """Log the end of a Lambda request with performance metrics."""
        self.info(
            f"Request completed: {handler_name}",
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            success=status_code < 400,
        )

    def log_db_operation(
        self, operation: str, table: str, affected_rows: int = None, **kwargs
    ):
        """Log database operations with context."""
        self.info(
            f"Database operation: {operation} on {table}",
            operation=operation,
            table=table,
            affected_rows=affected_rows,
            **kwargs,
        )

    def log_external_api_call(
        self,
        service: str,
        endpoint: str,
        method: str,
        status_code: int = None,
        duration_ms: float = None,
        **kwargs,
    ):
        """Log external API calls with performance metrics."""
        self.info(
            f"External API call: {method} {service}{endpoint}",
            service=service,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration_ms=round(duration_ms, 2) if duration_ms else None,
            success=status_code < 400 if status_code else None,
            **kwargs,
        )


# Create a default logger instance for easy importing
logger = Logger()

# Example usage:
# from utils.logger import logger
# logger.info("This is an info message")
# logger.warn("This is a warning message")
# logger.error("This is an error message")
