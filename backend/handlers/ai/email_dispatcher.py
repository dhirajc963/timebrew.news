import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import Logger


def lambda_handler(event, context):
    """
    Email Dispatcher Lambda Function
    Sends the formatted briefing via email and updates delivery status
    """
    start_time = datetime.utcnow()
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

        # Retrieve briefing content and user data
        cursor.execute(
            """
            SELECT bf.id, bf.brew_id, bf.user_id, bf.execution_status, bf.subject_line, bf.html_content,
                u.timezone,
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
            subject_line,
            html_content,
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

        if not html_content or not subject_line:
            logger.error(
                "Missing required email content",
                has_subject_line=bool(subject_line),
                has_html_content=bool(html_content),
            )
            cursor.close()
            conn.close()
            return create_response(
                400, {"error": "Missing subject line or HTML content"}
            )

        # Build user name
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "there"
        )

        logger.set_context(user_email=email, user_name=user_name)
        logger.info(
            "Retrieved briefing data successfully",
            content_length=len(html_content),
            subject_line=(
                subject_line[:50] + "..." if len(subject_line) > 50 else subject_line
            ),
        )

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

        FROM_ADDRESS = ("Inspire Inbox", "no-reply@inspireinbox.com")
        # Create email message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject_line
        msg["From"] = formataddr(FROM_ADDRESS)
        msg["To"] = email

        # Create plain text version by stripping HTML tags
        import re

        text_body = re.sub("<[^<]+?>", "", html_content)

        # Add a simple header for plain text version
        text_content = f"""Hi {user_name},

Here's your TimeBrew briefing:

{text_body}

Best regards,
The TimeBrew Team

Note: For the best experience, please view this email in HTML format.
"""

        # Attach both text and HTML versions
        text_part = MIMEText(text_content, "plain")
        html_part = MIMEText(html_content, "html")

        msg.attach(text_part)
        msg.attach(html_part)

        # Send email
        logger.info(
            "Attempting to send email",
            smtp_server=smtp_server,
            smtp_port=smtp_port,
            recipient=email,
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
        user_tz = pytz.timezone(brew_timezone)
        sent_at = datetime.now(user_tz)
        sent_at_utc = sent_at.astimezone(pytz.UTC).replace(tzinfo=None)

        # Update briefing with delivery status
        cursor.execute(
            """
            UPDATE time_brew.briefings 
            SET execution_status = %s,
                sent_at = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """,
            (
                "dispatched" if delivery_status == "dispatched" else "failed",
                sent_at_utc,
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
        end_time = datetime.utcnow()
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
        end_time = datetime.utcnow()
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
                    SET execution_status = 'failed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
                    (briefing_id,),
                )
                conn.commit()
                cursor.close()
                conn.close()
        except Exception as db_error:
            logger.error(f"Failed to update briefing status: {str(db_error)}")

        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
