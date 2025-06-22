import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime, timezone
import pytz
import json
import re
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
    Reads JSON editor draft, formats to HTML, and sends email
    """
    start_time = datetime.now(timezone.utc)
    logger = Logger("email_dispatcher")

    try:
        logger.info("Email dispatcher started", event=event)
        # Extract briefing_id from event
        briefing_id = event.get("briefing_id")
        if not briefing_id:
            logger.error("Missing briefing_id in event")
            return create_response(400, {"error": "briefing_id is required"})

        logger.set_context(briefing_id=briefing_id)

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Retrieve briefing content and user data - now including editor_draft
        cursor.execute(
            """
            SELECT bf.id, bf.brew_id, bf.user_id, bf.execution_status, bf.editor_draft,
                b.name, b.topics, b.delivery_time, u.timezone,
                u.email, u.first_name, u.last_name
            FROM time_brew.briefings bf
            JOIN time_brew.brews b ON bf.brew_id = b.id
            JOIN time_brew.users u ON bf.user_id = u.id
            WHERE bf.id = %s
        """,
            (briefing_id,),
        )

        briefing_data = cursor.fetchone()
        if not briefing_data:
            logger.error("Briefing not found in database")
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Briefing not found"})

        (
            briefing_id,
            brew_id,
            user_id,
            execution_status,
            editor_draft_raw,
            brew_name,
            topics,
            delivery_time,
            brew_timezone,
            email,
            first_name,
            last_name,
        ) = briefing_data

        if execution_status != "edited":
            logger.error(
                f"Invalid briefing status: {execution_status}, expected edited"
            )
            cursor.close()
            conn.close()
            return create_response(
                400,
                {"error": f"Briefing status is {execution_status}, expected edited"},
            )

        if not editor_draft_raw:
            logger.error("Missing editor_draft content")
            cursor.close()
            conn.close()
            return create_response(400, {"error": "Missing editor draft content"})

        # Parse editor draft JSON
        try:
            if isinstance(editor_draft_raw, str):
                editor_draft = json.loads(editor_draft_raw)
            else:
                editor_draft = editor_draft_raw
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in editor_draft: {str(e)}")
            cursor.close()
            conn.close()
            return create_response(400, {"error": "Invalid editor draft JSON"})

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

        # Update briefing with delivery status
        cursor.execute(
            """
            UPDATE time_brew.briefings 
            SET execution_status = %s,
                sent_at = %s,
                updated_at = %s
            WHERE id = %s
        """,
            (
                "dispatched" if delivery_status == "dispatched" else "failed",
                sent_at_utc,
                datetime.now(timezone.utc),
                briefing_id,
            ),
        )

        # Update brew's last_sent_date if email was sent successfully
        if delivery_status == "dispatched":
            cursor.execute(
                """
                UPDATE time_brew.brews 
                SET last_sent_date = %s
                WHERE id = %s
            """,
                (sent_at_utc, brew_id),
            )

        conn.commit()
        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

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
                    "briefing_id": briefing_id,
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
                    "briefing_id": briefing_id,
                    "error": error_message,
                    "processing_time_seconds": round(processing_time, 2),
                },
            }

    except Exception as e:
        # Calculate processing time for failed request
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

        logger.error(
            f"Error in email_dispatcher: {str(e)}",
            error_type=type(e).__name__,
            processing_time_seconds=round(processing_time, 2),
        )

        # Try to update briefing status to failed if we have briefing_id
        try:
            if "briefing_id" in locals():
                logger.info("Updating briefing status to failed")
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE time_brew.briefings 
                    SET execution_status = 'failed', updated_at = %s
                    WHERE id = %s
                """,
                    (datetime.now(timezone.utc), briefing_id),
                )
                conn.commit()
                cursor.close()
                conn.close()
        except Exception as db_error:
            logger.error(f"Failed to update briefing status: {str(db_error)}")

        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
