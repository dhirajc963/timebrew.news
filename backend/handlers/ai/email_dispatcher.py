import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime, timezone
import pytz
import json
import re
import time
import os
import psycopg2
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import Logger
from utils.text_utils import format_list_simple


def format_email_html(editor_draft, brew_name, current_time):
    """
    Convert JSON editor draft into HTML email using TimeBrew template
    """
    intro = editor_draft.get("intro")
    articles = editor_draft.get("articles")
    outro = editor_draft.get("outro")

    # Format current date for header
    date_str = current_time.strftime("%A, %B %d")

    # Start building HTML
    html = f"""
    <div style="margin: 0 auto; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; background: transparent;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e9ecef; margin-bottom: 24px; background: transparent;">
            <h1 style="font-size: 20px; font-weight: 600; color: #1a252f; margin: 0;">Your {brew_name} • {date_str}</h1>
        </div>
        
        <!-- Personal Greeting -->
        <div style="margin-bottom: 24px; background: transparent;">
            <p style="font-size: 16px; line-height: 1.6; color: #2c3e50; margin: 0;">{intro}</p>
        </div>
    """

    # Add each article
    for article in articles:
        headline = article.get("headline", "")
        story_content = article.get("story_content", "")
        source = article.get("source", "")
        original_url = article.get("original_url")
        published_time = article.get("published_time", "")

        # Use published_time directly as it's already formatted (e.g., '3 days ago', 'hours ago')
        time_ago = published_time if published_time else ""

        # Source and time display
        source_time = source if source else "Unknown Source"
        if time_ago:
            source_time += f" • {time_ago}"

        # Read more link - only if we have a URL
        read_more_link = ""
        if original_url and original_url != "null" and original_url.strip():
            read_more_link = f"""
            <a href="{original_url}" style="color: #3498db; text-decoration: none; font-weight: 500; font-size: 15px;">
                Read the full story →
            </a>
            """

        # Add article card
        html += f"""
        <!-- Story Card -->
        <div style="padding: 20px; margin: 16px 0; border: 1px solid #e9ecef; border-radius: 8px; background: transparent;">
            <!-- SOURCE and TIME AGO -->
            <div style="font-size: 14px; color: #6c757d; margin-bottom: 8px; font-weight: 500;">
                {source_time}
            </div>
            <!-- HEADLINE -->
            <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1a252f; line-height: 1.4;">
                {headline}
            </h3>
            <!-- STORY CONTENT -->
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #2c3e50; font-size: 16px;">
                {story_content}
            </p>
            {read_more_link}
        </div>
        """

    # Add sign-off
    html += f"""
        <!-- Sign-off -->
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e9ecef; background: transparent;">
            <p style="font-size: 16px; line-height: 1.6; color: #2c3e50; margin: 0;">{outro}</p>
            <p style="font-size: 14px; color: #6c757d; margin: 8px 0 0 0;">Your TimeBrew Team</p>
        </div>
    </div>
    """

    return html


def lambda_handler(event, context):
    """
    Email Dispatcher Lambda Function
    Reads JSON editor draft from editor_logs, formats to HTML, and sends email
    """
    start_time = time.time()
    logger = Logger("email_dispatcher")
    run_id = None
    conn = None

    try:
        logger.info("Email dispatcher started", event=event)
        # Extract run_id from event
        run_id = event.get("run_id")
        if not run_id:
            logger.error("Missing run_id in event")
            return create_response(400, {"error": "run_id is required"})

        logger.set_context(run_id=run_id)

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Retrieve run data and user/brew information
        cursor.execute(
            """
            SELECT rt.run_id, rt.brew_id, rt.user_id, rt.current_stage,
                b.name, b.topics, b.delivery_time, u.timezone,
                u.email, u.first_name, u.last_name
            FROM time_brew.run_tracker rt
            JOIN time_brew.brews b ON rt.brew_id = b.id
            JOIN time_brew.users u ON rt.user_id = u.id
            WHERE rt.run_id = %s
        """,
            (run_id,),
        )

        run_data = cursor.fetchone()
        if not run_data:
            logger.error("Run not found in database")
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Run not found"})

        (
            run_id,
            brew_id,
            user_id,
            stage,
            brew_name,
            topics,
            delivery_time,
            brew_timezone,
            email,
            first_name,
            last_name,
        ) = run_data

        if stage != "dispatcher":
            logger.error(f"Invalid run stage: {stage}, expected dispatcher")
            cursor.close()
            conn.close()
            return create_response(
                400,
                {"error": f"Run stage is {stage}, expected dispatcher"},
            )

        # Get editor draft from editor_logs
        logger.info("Retrieving editor draft from editor logs")
        try:
            cursor.execute(
                """
                SELECT id, prompt_used, editorial_content, raw_llm_response, email_sent, 
                       email_sent_time, runtime_ms, created_at
                FROM time_brew.editor_logs 
                WHERE run_id = %s
                """,
                (run_id,),
            )
            row = cursor.fetchone()
            if not row:
                logger.error("Editor log not found")
                cursor.close()
                conn.close()
                return create_response(404, {"error": "Editor log not found"})

            editor_log = {
                "id": str(row[0]),
                "prompt_used": row[1],
                "editorial_content": row[2],
                "raw_llm_response": row[3],
                "email_sent": row[4],
                "email_sent_time": row[5],
                "runtime_ms": row[6],
                "created_at": row[7],
            }

            # Use editorial_content if available, fallback to raw_llm_response
            editorial_content = editor_log.get("editorial_content")
            raw_llm_response = editor_log.get("raw_llm_response")
            
            if editorial_content:
                # editorial_content is already parsed JSON
                editor_draft = editorial_content
            elif raw_llm_response:
                # Fallback to parsing raw_llm_response for backward compatibility
                try:
                    if isinstance(raw_llm_response, str):
                        editor_draft = json.loads(raw_llm_response)
                    else:
                        editor_draft = raw_llm_response
                except json.JSONDecodeError as e:
                    logger.error("Failed to parse raw_llm_response", error=str(e))
                    cursor.close()
                    conn.close()
                    return create_response(400, {"error": "Invalid editor draft content"})
            else:
                logger.error("Missing editor draft content in editor logs")
                cursor.close()
                conn.close()
                return create_response(400, {"error": "Missing editor draft content"})

        except Exception as e:
            logger.error("Failed to retrieve editor log", error=str(e))
            cursor.close()
            conn.close()
            return create_response(500, {"error": "Failed to retrieve editor draft"})

        # editor_draft is already parsed from editorial_content or raw_llm_response above

        # Parse topics JSON if it exists
        if isinstance(topics, str):
            try:
                topics_list = json.loads(topics)
            except json.JSONDecodeError:
                topics_list = []
        elif topics is None:
            topics_list = []
        else:
            topics_list = topics

        topics_str = format_list_simple(topics_list)

        # Build user name
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "there"
        )

        # Get current time in user's timezone for formatting
        user_tz = pytz.timezone(brew_timezone)
        current_time = datetime.now(user_tz)

        logger.set_context(user_email=email, user_name=user_name)
        logger.info(
            "Retrieved briefing data successfully",
            brew_name=brew_name,
            articles_count=len(editor_draft.get("articles", [])),
        )

        # Generate HTML content and extract subject from JSON
        try:
            html_content = format_email_html(editor_draft, brew_name, current_time)
            subject_line = editor_draft.get("subject")

        except Exception as e:
            logger.error(f"Error formatting email content: {str(e)}")
            cursor.close()
            conn.close()
            return create_response(500, {"error": "Failed to format email content"})

        # Get SMTP configuration from environment
        smtp_server = os.environ.get("SMTP_SERVER")
        smtp_port = int(os.environ.get("SMTP_PORT", 587))
        smtp_username = os.environ.get("SMTP_USERNAME")
        smtp_password = os.environ.get("SMTP_PASSWORD")

        if not all([smtp_server, smtp_username, smtp_password]):
            logger.error(
                "SMTP configuration incomplete",
                has_server=bool(smtp_server),
                has_username=bool(smtp_username),
                has_password=bool(smtp_password),
            )
            raise Exception("SMTP configuration incomplete")

        FROM_ADDRESS = ("News Briefings", "no-reply@inspireinbox.com")

        # Create email message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject_line  # Using subject from editor_draft JSON
        msg["From"] = formataddr(FROM_ADDRESS)
        msg["To"] = email

        html_part = MIMEText(html_content, "html")

        msg.attach(html_part)

        # Send email
        logger.info(
            "Attempting to send email",
            smtp_server=smtp_server,
            smtp_port=smtp_port,
            recipient=email,
            subject_line=subject_line[:50],
        )

        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.sendmail(FROM_ADDRESS[1], email, msg.as_string())

            delivery_status = "dispatched"
            error_message = None
            logger.info("Email sent successfully")

        except Exception as e:
            logger.error(
                f"SMTP Error: {str(e)}",
                smtp_server=smtp_server,
                smtp_port=smtp_port,
                error_type=type(e).__name__,
            )
            delivery_status = "failed"
            error_message = str(e)
            raise e

        # Get current time in user's timezone
        sent_at = current_time
        sent_at_utc = sent_at.astimezone(pytz.UTC).replace(tzinfo=None)

        # Update run_tracker with delivery status
        try:
            if delivery_status == "dispatched":
                cursor.execute(
                    """
                    UPDATE time_brew.run_tracker 
                    SET current_stage = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE run_id = %s
                    """,
                    ("completed", run_id),
                )

                # Update brew's last_sent_date if email was sent successfully
                cursor.execute(
                    """
                    UPDATE time_brew.brews 
                    SET last_sent_date = %s
                    WHERE id = %s
                """,
                    (sent_at_utc, brew_id),
                )

                # Update editor_logs with email sent status and time
                cursor.execute(
                    """
                    UPDATE time_brew.editor_logs 
                    SET email_sent = true, email_sent_time = %s
                    WHERE run_id = %s
                    """,
                    (sent_at_utc, run_id),
                )
            else:
                cursor.execute(
                    """
                    UPDATE time_brew.run_tracker 
                    SET current_stage = %s, failed_stage = %s, error_message = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE run_id = %s
                    """,
                    ("failed", "dispatcher", str(e), run_id),
                )

            conn.commit()
            logger.info(
                "Updated run tracker and brew data",
                run_id=run_id,
                stage="completed" if delivery_status == "dispatched" else "failed",
            )

        except Exception as update_error:
            logger.error("Failed to update run tracker", error=str(update_error))
            conn.rollback()
            raise Exception(f"Failed to update run status: {str(update_error)}")
        finally:
            cursor.close()
            conn.close()

        # Calculate processing time
        end_time = time.time()
        processing_time = end_time - start_time

        logger.info(
            "Email dispatch completed",
            delivery_status=delivery_status,
            processing_time_seconds=round(processing_time, 2),
        )

        if delivery_status == "dispatched":
            return {
                "statusCode": 200,
                "body": {
                    "message": "Email sent successfully",
                    "run_id": run_id,
                    "user_name": user_name,
                    "email": email,
                    "subject_line": subject_line,
                    "sent_at": sent_at.isoformat(),
                    "content_length": len(html_content),
                    "processing_time_seconds": round(processing_time, 2),
                },
            }
        else:
            return {
                "statusCode": 500,
                "body": {
                    "message": "Failed to send email",
                    "run_id": run_id,
                    "error": error_message,
                    "processing_time_seconds": round(processing_time, 2),
                },
            }

    except Exception as e:
        # Calculate processing time for failed request
        end_time = time.time()
        processing_time = end_time - start_time

        logger.error(
            f"Error in email_dispatcher: {str(e)}",
            error_type=type(e).__name__,
            processing_time_seconds=round(processing_time, 2),
        )

        # Try to update run_tracker status to failed if we have run_id
        try:
            if run_id and "cursor" not in locals():
                logger.info("Updating run tracker status to failed")
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE time_brew.run_tracker 
                    SET current_stage = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE run_id = %s
                    """,
                    ("failed", run_id),
                )
                conn.commit()
                cursor.close()
                conn.close()
            elif run_id and "cursor" in locals():
                # If we already have a cursor, use it
                try:
                    cursor.execute(
                        """
                        UPDATE time_brew.run_tracker 
                        SET current_stage = %s, failed_stage = %s, error_message = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE run_id = %s
                        """,
                        ("failed", "dispatcher", str(e), run_id),
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()
                finally:
                    if cursor:
                        cursor.close()
                    if conn:
                        conn.close()
        except Exception as db_error:
            logger.error(f"Failed to update run tracker status: {str(db_error)}")

        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
