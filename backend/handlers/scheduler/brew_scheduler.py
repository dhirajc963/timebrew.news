import os
import json
import boto3
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import Logger


def lambda_handler(event, context):
    """
    Brew Scheduler Lambda Function
    Runs every 15 minutes to check for brews due in the next 30 minutes
    Uses database-heavy approach for efficient timezone-aware filtering
    """
    start_time = datetime.now(timezone.utc)
    logger = Logger("brew_scheduler")

    try:
        logger.info("Brew scheduler started", triggered_at=start_time.isoformat())

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query brews due in the next 30 minutes with timezone-aware filtering
        logger.info("Querying for brews due in next 30 minutes")
        query_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
        SELECT b.id, b.user_id, b.delivery_time, u.timezone, b.last_sent_date,
            u.email, u.first_name, u.last_name, b.name as brew_name,
            -- Calculate today's delivery datetime in UTC (simplified approach)
            (CURRENT_DATE AT TIME ZONE u.timezone + b.delivery_time) AT TIME ZONE u.timezone as delivery_datetime_utc
        FROM time_brew.brews b
        JOIN time_brew.users u ON b.user_id = u.id
        WHERE b.is_active = true
        AND (
            -- Check if delivery time is within next 30 minutes (simplified)
            (CURRENT_DATE AT TIME ZONE u.timezone + b.delivery_time) AT TIME ZONE u.timezone
            BETWEEN NOW()
            AND NOW() + INTERVAL '30 minutes'
        )
        AND (
            -- Haven't sent today in user's timezone
            b.last_sent_date IS NULL
            OR (b.last_sent_date AT TIME ZONE 'UTC' AT TIME ZONE u.timezone)::date
            < (NOW() AT TIME ZONE u.timezone)::date
        )
        AND NOT EXISTS (
            -- Not currently processing (no run in progress in last 2 hours)
            SELECT 1 FROM time_brew.run_tracker rt
            WHERE rt.brew_id = b.id
            AND rt.current_stage IN ('curator', 'editor', 'dispatcher')
            AND rt.created_at > NOW() - INTERVAL '2 hours'
        )
        ORDER BY delivery_datetime_utc asc;
        """
        )

        brews_to_trigger = cursor.fetchall()
        query_duration = (
            datetime.now(timezone.utc) - query_start_time
        ).total_seconds() * 1000

        logger.info(
            "Query completed",
            brews_found=len(brews_to_trigger),
            query_duration_ms=round(query_duration, 2),
        )

        # Process each brew that needs triggering
        triggered_brews = []
        failed_triggers = []

        for brew_data in brews_to_trigger:
            (
                brew_id,
                user_id,
                delivery_time,
                timezone_str,
                last_sent_date,
                email,
                first_name,
                last_name,
                brew_name,
                delivery_datetime_utc,
            ) = brew_data

            # Build user name
            user_name = (
                f"{first_name} {last_name}"
                if first_name and last_name
                else first_name or "User"
            )

            logger.set_context(brew_id=brew_id, user_id=user_id, user_email=email)

            try:
                # Create run_tracker entry
                logger.info(
                    "Creating run tracker entry", brew_id=brew_id, user_id=user_id
                )
                run_id = create_run_tracker_entry(
                    brew_id, user_id, conn, cursor, logger
                )

                if not run_id:
                    logger.error("Failed to create run tracker entry", brew_id=brew_id)
                    failed_triggers.append(
                        {
                            "brew_id": brew_id,
                            "user_email": email,
                            "error": "Failed to create run tracker entry",
                        }
                    )
                    continue

                # Trigger Step Functions workflow
                logger.info(
                    "Triggering AI pipeline",
                    brew_name=brew_name,
                    user_timezone=timezone_str,
                    delivery_time=str(delivery_time),
                    scheduled_delivery_utc=delivery_datetime_utc.isoformat(),
                    run_id=run_id,
                )

                success, execution_arn = trigger_ai_pipeline(
                    brew_id, run_id, "scheduler", logger
                )

                if success:
                    triggered_brews.append(
                        {
                            "brew_id": brew_id,
                            "run_id": run_id,
                            "user_name": user_name,
                            "user_email": email,
                            "brew_name": brew_name,
                            "timezone": timezone_str,
                            "delivery_time": str(delivery_time),
                            "execution_arn": execution_arn,
                            "triggered_at": start_time.isoformat(),
                            "scheduled_delivery_utc": delivery_datetime_utc.isoformat(),
                        }
                    )

                    logger.info(
                        "Successfully triggered AI pipeline",
                        execution_arn=execution_arn,
                    )
                else:
                    failed_triggers.append(
                        {
                            "brew_id": brew_id,
                            "user_email": email,
                            "error": "Failed to start Step Functions execution",
                        }
                    )

                    logger.error("Failed to trigger AI pipeline", brew_id=brew_id)

            except Exception as brew_error:
                failed_triggers.append(
                    {"brew_id": brew_id, "user_email": email, "error": str(brew_error)}
                )

                logger.error(
                    "Error processing brew", error=str(brew_error), brew_id=brew_id
                )
                continue

            finally:
                # Clear context for next iteration
                logger.set_context()

        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

        # Log summary
        logger.info(
            "Brew scheduler completed",
            total_brews_checked=len(brews_to_trigger),
            successful_triggers=len(triggered_brews),
            failed_triggers=len(failed_triggers),
            processing_time_seconds=round(processing_time, 2),
        )

        # Return comprehensive response
        response_body = {
            "message": f"Scheduler completed - triggered {len(triggered_brews)} brews",
            "summary": {
                "total_brews_eligible": len(brews_to_trigger),
                "successful_triggers": len(triggered_brews),
                "failed_triggers": len(failed_triggers),
                "processing_time_seconds": round(processing_time, 2),
            },
            "triggered_brews": triggered_brews,
            "failed_triggers": failed_triggers,
            "checked_at": start_time.isoformat(),
        }

        return create_response(200, response_body)

    except Exception as e:
        # Calculate processing time for failed request
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

        logger.error(
            "Brew scheduler failed with unexpected error",
            error=str(e),
            error_type=type(e).__name__,
            processing_time_seconds=round(processing_time, 2),
        )

        # Cleanup database connection on error
        try:
            if "conn" in locals() and conn:
                conn.close()
                logger.info("Database connection closed due to error")
        except Exception as cleanup_error:
            logger.error(
                "Failed to cleanup database connection", error=str(cleanup_error)
            )

        return create_response(
            500,
            {
                "error": str(e),
                "processing_time_seconds": round(processing_time, 2),
                "failed_at": datetime.now(timezone.utc).isoformat(),
            },
        )


def create_run_tracker_entry(brew_id, user_id, conn, cursor, logger):
    """
    Create a new run_tracker entry for the brew execution
    Returns the run_id if successful, None otherwise
    """
    try:
        # Insert new run_tracker entry
        cursor.execute(
            """
            INSERT INTO time_brew.run_tracker (brew_id, user_id, current_stage)
            VALUES (%s, %s, 'curator')
            RETURNING run_id
            """,
            (brew_id, user_id),
        )

        result = cursor.fetchone()
        if result:
            run_id = str(result[0])
            conn.commit()
            logger.info("Run tracker entry created", run_id=run_id, brew_id=brew_id)
            return run_id
        else:
            logger.error("Failed to create run tracker entry - no result returned")
            conn.rollback()
            return None

    except Exception as e:
        logger.error("Error creating run tracker entry", error=str(e), brew_id=brew_id)
        conn.rollback()
        return None


def trigger_ai_pipeline(brew_id, run_id, triggered_by="scheduler", logger=None):
    """
    Trigger the Step Functions AI pipeline for a specific brew
    Returns (success: bool, execution_arn: str)
    """
    try:
        # Get Step Functions client
        stepfunctions = boto3.client("stepfunctions")

        # Get the state machine ARN from environment
        state_machine_arn = os.environ.get("AI_PIPELINE_STATE_MACHINE_ARN")
        if not state_machine_arn:
            error_msg = "AI_PIPELINE_STATE_MACHINE_ARN not found in environment"
            if logger:
                logger.error(error_msg)
            else:
                print(error_msg)
            return False, None

        # Create execution input
        execution_input = {
            "brew_id": brew_id,
            "run_id": run_id,
            "triggered_by": triggered_by,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Generate unique execution name
        execution_name = f"brew-{brew_id}-{run_id[:8]}-{triggered_by}-{int(datetime.now(timezone.utc).timestamp())}"

        # Start execution
        response = stepfunctions.start_execution(
            stateMachineArn=state_machine_arn,
            name=execution_name,
            input=json.dumps(execution_input),
        )

        execution_arn = response["executionArn"]
        success_msg = f"Started Step Functions execution: {execution_arn}"

        if logger:
            logger.info("Step Functions execution started", execution_arn=execution_arn)
        else:
            print(success_msg)

        return True, execution_arn

    except Exception as e:
        error_msg = f"Error triggering AI pipeline for brew {brew_id}: {str(e)}"
        if logger:
            logger.error(
                "Failed to trigger Step Functions", error=str(e), brew_id=brew_id
            )
        else:
            print(error_msg)
        return False, None
