import os
import json
import boto3
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response


def lambda_handler(event, context):
    """
    Brew Scheduler Lambda Function
    Runs every 15 minutes to check for brews due in the next 30 minutes
    Uses database-heavy approach for efficient timezone-aware filtering
    """
    start_time = datetime.now(timezone.utc)

    try:
        print(
            f"[BREW_SCHEDULER] Brew scheduler started - triggered_at: {start_time.isoformat()}"
        )

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query brews due in the next 30 minutes with timezone-aware filtering
        print("[BREW_SCHEDULER] Querying for brews due in next 30 minutes")
        query_start_time = datetime.now(timezone.utc)

        # FIXED: Simplified and cleaner timezone-aware query
        cursor.execute(
            """
        -- Main scheduler query - finds brews ready for delivery (with VARCHAR delivery_time)
        SELECT 
            b.id AS brew_id,
            b.user_id,
            b.delivery_time,
            u.timezone,
            b.last_sent_date,
            u.email,
            u.first_name,
            u.last_name,
            b.name AS brew_name,
            -- Clean delivery datetime calculation (VARCHAR to TIME conversion)
            ((NOW() AT TIME ZONE u.timezone)::date + b.delivery_time::time) AT TIME ZONE u.timezone AS delivery_datetime_utc
        FROM time_brew.brews b
        JOIN time_brew.users u ON b.user_id = u.id
        WHERE 
            b.is_active = true 
            AND u.is_active = true
            
            -- Delivery time is within next 30 minutes (VARCHAR delivery_time)
            AND (
                (NOW() AT TIME ZONE u.timezone)::date + b.delivery_time::time
            ) BETWEEN (NOW() AT TIME ZONE u.timezone) 
                AND ((NOW() AT TIME ZONE u.timezone) + INTERVAL '30 minutes')
            
            -- Haven't sent today in user's timezone
            AND (
                b.last_sent_date IS NULL
                OR (b.last_sent_date AT TIME ZONE 'UTC' AT TIME ZONE u.timezone)::date
                < (NOW() AT TIME ZONE u.timezone)::date
            )
            
            -- Not currently processing
            AND NOT EXISTS (
                SELECT 1 
                FROM time_brew.run_tracker rt
                WHERE rt.brew_id = b.id
                AND rt.current_stage IN ('curator', 'editor', 'dispatcher')
                AND rt.created_at > NOW() - INTERVAL '2 hours'
            )
        ORDER BY 
            ((NOW() AT TIME ZONE u.timezone)::date + b.delivery_time::time) AT TIME ZONE u.timezone;
        """
        )

        brews_to_trigger = cursor.fetchall()
        query_duration = (
            datetime.now(timezone.utc) - query_start_time
        ).total_seconds() * 1000

        print(
            f"[BREW_SCHEDULER] Query completed - brews_found: {len(brews_to_trigger)}, query_duration_ms: {round(query_duration, 2)}"
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

            print(
                f"[BREW_SCHEDULER] Setting context - brew_id: {brew_id}, user_id: {user_id}, user_email: {email}"
            )

            try:
                # Create run_tracker entry
                print(
                    f"[BREW_SCHEDULER] Creating run tracker entry - brew_id: {brew_id}, user_id: {user_id}"
                )
                run_id = create_run_tracker_entry(brew_id, user_id, conn, cursor)

                if not run_id:
                    print(
                        f"[BREW_SCHEDULER] ERROR: Failed to create run tracker entry - brew_id: {brew_id}"
                    )
                    failed_triggers.append(
                        {
                            "brew_id": brew_id,
                            "user_email": email,
                            "error": "Failed to create run tracker entry",
                        }
                    )
                    continue

                # FIXED: Trigger Step Functions workflow with correct number of arguments
                print(
                    f"[BREW_SCHEDULER] Triggering AI pipeline - brew_name: {brew_name}, user_timezone: {timezone_str}, delivery_time: {str(delivery_time)}, scheduled_delivery_utc: {delivery_datetime_utc.isoformat()}, run_id: {run_id}"
                )

                # FIXED: Remove the extra None argument
                success, execution_arn = trigger_ai_pipeline(
                    brew_id, run_id, "scheduler"
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

                    print(
                        f"[BREW_SCHEDULER] Successfully triggered AI pipeline - execution_arn: {execution_arn}"
                    )
                else:
                    failed_triggers.append(
                        {
                            "brew_id": brew_id,
                            "user_email": email,
                            "error": "Failed to start Step Functions execution",
                        }
                    )

                    print(
                        f"[BREW_SCHEDULER] ERROR: Failed to trigger AI pipeline - brew_id: {brew_id}"
                    )

            except Exception as brew_error:
                failed_triggers.append(
                    {"brew_id": brew_id, "user_email": email, "error": str(brew_error)}
                )

                print(
                    f"[BREW_SCHEDULER] ERROR: Error processing brew - error: {str(brew_error)}, brew_id: {brew_id}"
                )
                continue

            finally:
                # Clear context for next iteration
                print("[BREW_SCHEDULER] Clearing context for next iteration")

        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

        # Log summary
        print(
            f"[BREW_SCHEDULER] Brew scheduler completed - total_brews_checked: {len(brews_to_trigger)}, successful_triggers: {len(triggered_brews)}, failed_triggers: {len(failed_triggers)}, processing_time_seconds: {round(processing_time, 2)}"
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

        print(
            f"[BREW_SCHEDULER] ERROR: Brew scheduler failed with unexpected error - error: {str(e)}, error_type: {type(e).__name__}, processing_time_seconds: {round(processing_time, 2)}"
        )

        # Cleanup database connection on error
        try:
            if "conn" in locals() and conn:
                conn.close()
                print("[BREW_SCHEDULER] Database connection closed due to error")
        except Exception as cleanup_error:
            print(
                f"[BREW_SCHEDULER] ERROR: Failed to cleanup database connection - error: {str(cleanup_error)}"
            )

        return create_response(
            500,
            {
                "error": str(e),
                "processing_time_seconds": round(processing_time, 2),
                "failed_at": datetime.now(timezone.utc).isoformat(),
            },
        )


def create_run_tracker_entry(brew_id, user_id, conn, cursor):
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
            print(
                f"[BREW_SCHEDULER] Run tracker entry created - run_id: {run_id}, brew_id: {brew_id}"
            )
            return run_id
        else:
            print(
                "[BREW_SCHEDULER] ERROR: Failed to create run tracker entry - no result returned"
            )
            conn.rollback()
            return None

    except Exception as e:
        print(
            f"[BREW_SCHEDULER] ERROR: Error creating run tracker entry - error: {str(e)}, brew_id: {brew_id}"
        )
        conn.rollback()
        return None


def trigger_ai_pipeline(brew_id, run_id, triggered_by="scheduler"):
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
            print(f"[BREW_SCHEDULER] ERROR: {error_msg}")
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

        print(
            f"[BREW_SCHEDULER] Step Functions execution started - execution_arn: {execution_arn}"
        )

        return True, execution_arn

    except Exception as e:
        print(
            f"[BREW_SCHEDULER] ERROR: Failed to trigger Step Functions - error: {str(e)}, brew_id: {brew_id}"
        )
        return False, None
