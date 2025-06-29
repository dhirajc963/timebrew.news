import json
import os
import boto3
from datetime import datetime, timezone
import psycopg2
from shared.utils.response import create_response
from shared.utils.db import get_db_connection
# from shared.utils.logger import Logger


def lambda_handler(event, context):
    """
    Manual Brew Trigger Lambda Function
    Allows manual triggering of the AI pipeline for a specific brew
    """
    start_time = datetime.now(timezone.utc)
    # logger = Logger("trigger_brew")

    try:
        print(f"[TRIGGER_BREW] Manual brew trigger started - triggered_at: {start_time.isoformat()}")
        # Parse request body
        if "body" in event:
            if isinstance(event["body"], str):
                body = json.loads(event["body"])
            else:
                body = event["body"]
        else:
            body = event

        brew_id = body.get("brew_id")
        if not brew_id:
            print("[TRIGGER_BREW] WARNING: Manual trigger attempt without brew_id")
            return create_response(400, {"error": "brew_id is required"})

        print(f"[TRIGGER_BREW] Processing manual trigger request - brew_id: {brew_id}")

        # Create run_tracker entry
        print("[TRIGGER_BREW] Creating run tracker entry")

        # Get database connection
        print("[TRIGGER_BREW] Connecting to database")
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify brew exists and is active
        print("[TRIGGER_BREW] Verifying brew exists and is active")
        cursor.execute(
            """
            SELECT b.id, b.user_id, b.delivery_time, u.timezone, b.is_active,
                u.email, u.first_name, u.last_name
            FROM time_brew.brews b
            JOIN time_brew.users u ON b.user_id = u.id
            WHERE b.id = %s
        """,
            (brew_id,),
        )

        brew_data = cursor.fetchone()
        if not brew_data:
            print("[TRIGGER_BREW] WARNING: Brew not found in database")
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Brew not found"})

        (
            brew_id,
            user_id,
            delivery_time,
            user_timezone,
            is_active,
            email,
            first_name,
            last_name,
        ) = brew_data

        # Build user name
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "User"
        )

        # Log brew found information
        print(f"[TRIGGER_BREW] Brew found - brew_id: {brew_id}, user_id: {user_id}, user_email: {email}, user_name: {user_name}, user_timezone: {user_timezone}, is_active: {is_active}")

        if not is_active:
            print("[TRIGGER_BREW] WARNING: Attempted to trigger inactive brew")
            cursor.close()
            conn.close()
            return create_response(400, {"error": "Brew is not active"})

        # Check for existing in-progress runs
        print("[TRIGGER_BREW] Checking for existing in-progress runs")
        cursor.execute(
            """
            SELECT run_id, current_stage, created_at
            FROM time_brew.run_tracker
            WHERE brew_id = %s AND current_stage IN ('curator', 'editor', 'dispatcher')
            ORDER BY created_at DESC
            LIMIT 1
        """,
            (brew_id,),
        )

        in_progress_run = cursor.fetchone()
        if in_progress_run:
            run_id_in_progress, current_stage, created_at = in_progress_run
            print(f"[TRIGGER_BREW] WARNING: Run already in progress - run_id: {run_id_in_progress}, stage: {current_stage}")
            cursor.close()
            conn.close()
            return create_response(
                409,
                {
                    "error": "Run already in progress",
                    "run_id": run_id_in_progress,
                    "stage": current_stage,
                    "created_at": created_at.isoformat(),
                },
            )

        # Create run_tracker entry before closing connection
        run_id = create_run_tracker_entry(brew_id, user_id, conn, cursor)

        cursor.close()
        conn.close()
        print("[TRIGGER_BREW] Database connection closed")

        if not run_id:
            print("[TRIGGER_BREW] ERROR: Failed to create run tracker entry")
            return create_response(
                500, {"error": "Failed to create run tracker entry", "brew_id": brew_id}
            )

        # Trigger Step Functions workflow
        print(f"[TRIGGER_BREW] Triggering AI pipeline - triggered_by: manual, run_id: {run_id}")
        success, execution_arn = trigger_ai_pipeline(brew_id, run_id, "manual")

        if success:
            end_time = datetime.now(timezone.utc)
            processing_time = (end_time - start_time).total_seconds()

            print(f"[TRIGGER_BREW] AI pipeline triggered successfully - execution_arn: {execution_arn}, processing_time_seconds: {round(processing_time, 2)}")

            return create_response(
                200,
                {
                    "message": "AI pipeline triggered successfully",
                    "brew_id": brew_id,
                    "user_email": email,
                    "user_name": user_name,
                    "execution_arn": execution_arn,
                    "triggered_at": start_time.isoformat(),
                },
            )
        else:
            print("[TRIGGER_BREW] ERROR: Failed to trigger AI pipeline")
            return create_response(
                500, {"error": "Failed to trigger AI pipeline", "brew_id": brew_id}
            )

    except json.JSONDecodeError as e:
        print(f"[TRIGGER_BREW] ERROR: Invalid JSON in request body - error: {e}")
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

        print(f"[TRIGGER_BREW] ERROR: Manual brew trigger failed with unexpected error - error: {str(e)}, error_type: {type(e).__name__}, processing_time_seconds: {round(processing_time, 2)}")

        # Cleanup database connection on error
        try:
            if "conn" in locals() and conn:
                conn.close()
                print("[TRIGGER_BREW] Database connection closed due to error")
        except Exception as cleanup_error:
            print(f"[TRIGGER_BREW] ERROR: Failed to cleanup database connection - error: {cleanup_error}")

        return create_response(500, {"error": str(e)})


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
            print(f"[TRIGGER_BREW] Run tracker entry created - run_id: {run_id}, brew_id: {brew_id}")
            return run_id
        else:
            print("[TRIGGER_BREW] ERROR: Failed to create run tracker entry - no result returned")
            conn.rollback()
            return None

    except Exception as e:
        print(f"[TRIGGER_BREW] ERROR: Error creating run tracker entry - error: {str(e)}, brew_id: {brew_id}")
        conn.rollback()
        return None


def trigger_ai_pipeline(brew_id, run_id, triggered_by="manual"):
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
            print(f"[TRIGGER_BREW] ERROR: {error_msg}")
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

        print(f"[TRIGGER_BREW] Step Functions execution started - execution_arn: {execution_arn}")

        return True, execution_arn

    except Exception as e:
        error_msg = f"Error triggering AI pipeline for brew {brew_id}: {str(e)}"
        print(f"[TRIGGER_BREW] ERROR: Failed to trigger Step Functions - error: {str(e)}, brew_id: {brew_id}")
        return False, None
