import json
from datetime import datetime, timezone
from utils.db import test_db_connection
from utils.response import create_response
from utils.logger import logger


def handler(event, context):
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "utils/health")

    try:
        # Test database connection
        logger.info("Testing database connection for health check")
        db_start_time = datetime.now(timezone.utc)

        db_status = test_db_connection()
        db_duration = (datetime.now(timezone.utc) - db_start_time).total_seconds() * 1000

        if db_status:
            logger.info(
                "Database connection test successful",
                connection_time_ms=round(db_duration, 2),
            )
            logger.log_db_operation(
                "health_check", "connection_test", db_duration, status="success"
            )
        else:
            logger.error(
                "Database connection test failed",
                connection_time_ms=round(db_duration, 2),
            )
            logger.log_db_operation(
                "health_check", "connection_test", db_duration, status="failed"
            )

        current_timestamp = datetime.now(timezone.utc).isoformat() + "Z"

        response = create_response(
            200,
            {
                "message": "TimeBrew API is healthy!",
                "timestamp": current_timestamp,
                "service": "timebrew-backend",
                "database": "connected" if db_status else "disconnected",
                "response_time_ms": round(
                    (datetime.now(timezone.utc) - start_time).total_seconds() * 1000, 2
                ),
            },
        )

        logger.info(
            "Health check completed successfully",
            database_status="connected" if db_status else "disconnected",
            total_time_ms=round(
                (datetime.now(timezone.utc) - start_time).total_seconds() * 1000, 2
            ),
        )

        logger.log_request_end(
            "utils/health", 200, (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        )
        return response

    except Exception as e:
        logger.error("Health check failed: unexpected error", error=e)
        error_response = create_response(
            500,
            {
                "message": "Health check failed",
                "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
                "service": "timebrew-backend",
                "error": "Internal server error",
            },
        )
        logger.log_request_end(
            "utils/health", 500, (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        )
        return error_response
