import os
import json
import boto3
from datetime import datetime, time
import pytz
from utils.db import get_db_connection
from utils.response import create_response

def lambda_handler(event, context):
    """
    Brew Scheduler Lambda Function
    Runs every 15 minutes to check for due brews and trigger the AI pipeline
    """
    try:
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current UTC time
        utc_now = datetime.utcnow()
        
        # Query active brews with user timezone information
        cursor.execute("""
            SELECT b.id, b.user_id, b.delivery_time, u.timezone, b.last_sent_date,
                   u.email, u.first_name, u.last_name
            FROM time_brew.brews b
            JOIN time_brew.users u ON b.user_id = u.id
            WHERE b.is_active = true
        """)
        
        brews = cursor.fetchall()
        triggered_brews = []
        
        for brew_data in brews:
            brew_id, user_id, delivery_time, timezone_str, last_sent_date, email, first_name, last_name = brew_data
            
            # Build user name
            user_name = f"{first_name} {last_name}" if first_name and last_name else first_name or "User"
            
            try:
                # Convert delivery time to user's timezone
                user_tz = pytz.timezone(timezone_str)
                utc_now_in_user_tz = utc_now.replace(tzinfo=pytz.UTC).astimezone(user_tz)
                
                # Parse delivery time (stored as TIME)
                if isinstance(delivery_time, time):
                    delivery_hour = delivery_time.hour
                    delivery_minute = delivery_time.minute
                else:
                    # Handle string format if needed
                    delivery_time_obj = datetime.strptime(str(delivery_time), '%H:%M:%S').time()
                    delivery_hour = delivery_time_obj.hour
                    delivery_minute = delivery_time_obj.minute
                
                # Create today's delivery datetime in user's timezone
                today_delivery = user_tz.localize(
                    datetime.combine(
                        utc_now_in_user_tz.date(),
                        time(delivery_hour, delivery_minute)
                    )
                )
                
                # Convert to UTC for comparison
                today_delivery_utc = today_delivery.astimezone(pytz.UTC).replace(tzinfo=None)
                
                # Check if brew is due
                is_due = False
                
                if last_sent_date is None:
                    # Never sent before - check if delivery time has passed today
                    is_due = utc_now >= today_delivery_utc
                else:
                    # Convert last_sent_date to user timezone for comparison
                    if last_sent_date.tzinfo is None:
                        last_sent_utc = pytz.UTC.localize(last_sent_date)
                    else:
                        last_sent_utc = last_sent_date.astimezone(pytz.UTC)
                    
                    last_sent_user_tz = last_sent_utc.astimezone(user_tz)
                    
                    # Check if:
                    # 1. Today's delivery time has passed
                    # 2. Last sent was not today (different date)
                    # 3. Or last sent was more than 20 hours ago (safety check)
                    
                    hours_since_last = (utc_now - last_sent_utc.replace(tzinfo=None)).total_seconds() / 3600
                    
                    is_due = (
                        utc_now >= today_delivery_utc and
                        (
                            last_sent_user_tz.date() < utc_now_in_user_tz.date() or
                            hours_since_last > 20
                        )
                    )
                
                if is_due:
                    # Check if there's already a recent briefing in progress
                    cursor.execute("""
                        SELECT id, execution_status, created_at
                        FROM time_brew.briefings
                        WHERE brew_id = %s
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (brew_id,))
                    
                    recent_briefing = cursor.fetchone()
                    
                    should_trigger = True
                    if recent_briefing:
                        briefing_id, execution_status, created_at = recent_briefing
                        
                        # If there's a briefing from today that's not failed, skip
                        if created_at.date() == utc_now.date() and execution_status != 'failed':
                            should_trigger = False
                            print(f"Skipping brew {brew_id} - recent briefing exists with status: {execution_status}")
                    
                    if should_trigger:
                        # Trigger Step Functions workflow
                        success = trigger_ai_pipeline(brew_id)
                        
                        if success:
                            triggered_brews.append({
                                'brew_id': brew_id,
                                'user_name': user_name,
                                'timezone': timezone_str,
                                'delivery_time': str(delivery_time),
                                'triggered_at': utc_now.isoformat()
                            })
                            print(f"Triggered AI pipeline for brew {brew_id} (user: {email})")
                        else:
                            print(f"Failed to trigger AI pipeline for brew {brew_id}")
                
            except Exception as brew_error:
                print(f"Error processing brew {brew_id}: {str(brew_error)}")
                continue
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'body': {
                'triggered_brews': len(triggered_brews),
                'brews': triggered_brews,
                'checked_at': utc_now.isoformat(),
                'message': f'Scheduler completed - triggered {len(triggered_brews)} brews'
            }
        }
        
    except Exception as e:
        print(f"Error in brew_scheduler: {str(e)}")
        return create_response(500, {'error': str(e)})

def trigger_ai_pipeline(brew_id):
    """
    Trigger the Step Functions AI pipeline for a specific brew
    """
    try:
        # Get Step Functions client
        stepfunctions = boto3.client('stepfunctions')
        
        # Get the state machine ARN from environment
        state_machine_arn = os.environ.get('AI_PIPELINE_STATE_MACHINE_ARN')
        if not state_machine_arn:
            print("AI_PIPELINE_STATE_MACHINE_ARN not found in environment")
            return False
        
        # Create execution input
        execution_input = {
            'brew_id': brew_id,
            'triggered_by': 'scheduler',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Start execution
        response = stepfunctions.start_execution(
            stateMachineArn=state_machine_arn,
            name=f'brew-{brew_id}-{int(datetime.utcnow().timestamp())}',
            input=json.dumps(execution_input)
        )
        
        print(f"Started Step Functions execution: {response['executionArn']}")
        return True
        
    except Exception as e:
        print(f"Error triggering AI pipeline for brew {brew_id}: {str(e)}")
        return False