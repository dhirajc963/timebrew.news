import os
import json
import boto3
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.response import create_response


def lambda_handler(event, context):
    """
    Manual Brew Trigger Lambda Function
    Allows manual triggering of the AI pipeline for a specific brew
    """
    try:
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
            return create_response(400, {"error": "brew_id is required"})

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verify brew exists and is active
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

        if not is_active:
            cursor.close()
            conn.close()
            return create_response(400, {"error": "Brew is not active"})

        # Check for existing in-progress briefings
        cursor.execute(
            """
            SELECT id, execution_status, created_at
            FROM time_brew.briefings
            WHERE brew_id = %s AND execution_status IN ('curated', 'edited')
            ORDER BY created_at DESC
            LIMIT 1
        """,
            (brew_id,),
        )

        in_progress_briefing = cursor.fetchone()
        if in_progress_briefing:
            briefing_id, execution_status, created_at = in_progress_briefing
            cursor.close()
            conn.close()
            return create_response(
                409,
                {
                    "error": "Briefing already in progress",
                    "briefing_id": briefing_id,
                    "status": execution_status,
                    "created_at": created_at.isoformat(),
                },
            )

        cursor.close()
        conn.close()

        # Trigger Step Functions workflow
        success, execution_arn = trigger_ai_pipeline(brew_id, "manual")

        if success:
            return create_response(
                200,
                {
                    "message": "AI pipeline triggered successfully",
                    "brew_id": brew_id,
                    "user_email": email,
                    "user_name": user_name,
                    "execution_arn": execution_arn,
                    "triggered_at": datetime.now(timezone.utc).isoformat(),
                },
            )
        else:
            return create_response(
                500, {"error": "Failed to trigger AI pipeline", "brew_id": brew_id}
            )

    except json.JSONDecodeError:
        return create_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        print(f"Error in trigger_brew: {str(e)}")
        return create_response(500, {"error": str(e)})


def trigger_ai_pipeline(brew_id, triggered_by="manual"):
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
            print("AI_PIPELINE_STATE_MACHINE_ARN not found in environment")
            return False, None

        # Create execution input
        execution_input = {
            "brew_id": brew_id,
            "triggered_by": triggered_by,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Start execution
        response = stepfunctions.start_execution(
            stateMachineArn=state_machine_arn,
            name=f"brew-{brew_id}-{triggered_by}-{int(datetime.now(timezone.utc).timestamp())}",
            input=json.dumps(execution_input),
        )

        execution_arn = response["executionArn"]
        print(f"Started Step Functions execution: {execution_arn}")
        return True, execution_arn

    except Exception as e:
        print(f"Error triggering AI pipeline for brew {brew_id}: {str(e)}")
        return False, None
