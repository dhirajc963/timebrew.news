import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import pytz
from utils.db import get_db_connection
from utils.response import create_response

def lambda_handler(event, context):
    """
    Email Dispatcher Lambda Function
    Sends the formatted briefing via email and updates delivery status
    """
    try:
        # Extract briefing_id from event
        briefing_id = event.get('briefing_id')
        if not briefing_id:
            return create_response(400, {'error': 'briefing_id is required'})
        
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Retrieve briefing content and user data
        cursor.execute("""
            SELECT bf.id, bf.brew_id, bf.user_id, bf.execution_status, bf.subject_line, bf.html_content,
                   u.timezone,
                   u.email, u.first_name, u.last_name
            FROM time_brew.briefings bf
            JOIN time_brew.brews b ON bf.brew_id = b.id
            JOIN time_brew.users u ON bf.user_id = u.id
            WHERE bf.id = %s
        """, (briefing_id,))
        
        briefing_data = cursor.fetchone()
        if not briefing_data:
            return create_response(404, {'error': 'Briefing not found'})
        
        (briefing_id, brew_id, user_id, execution_status, subject_line, html_content, 
         brew_timezone, email, first_name, last_name) = briefing_data
        
        if execution_status != 'formatted':
            return create_response(400, {'error': f'Briefing status is {execution_status}, expected formatted'})
        
        if not html_content or not subject_line:
            return create_response(400, {'error': 'Missing subject line or HTML content'})
        
        # Build user name
        user_name = f"{first_name} {last_name}" if first_name and last_name else first_name or "there"
        
        # Get SMTP configuration from environment
        smtp_server = os.environ.get('SMTP_SERVER')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_username = os.environ.get('SMTP_USERNAME')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        
        if not all([smtp_server, smtp_username, smtp_password]):
            raise Exception('SMTP configuration incomplete')
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject_line
        msg['From'] = f"TimeBrew <{smtp_username}>"
        msg['To'] = email
        
        # Create plain text version (simplified)
        text_content = f"""
        Hi {user_name},
        
        Your TimeBrew briefing is ready! Please view this email in HTML format for the best experience.
        
        If you're having trouble viewing this email, please contact support.
        
        Best regards,
        The TimeBrew Team
        """
        
        # Attach both text and HTML versions
        text_part = MIMEText(text_content, 'plain')
        html_part = MIMEText(html_content, 'html')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            
            text = msg.as_string()
            server.sendmail(smtp_username, email, text)
            server.quit()
            
            delivery_status = 'sent'
            error_message = None
            
        except Exception as smtp_error:
            print(f"SMTP Error: {str(smtp_error)}")
            delivery_status = 'failed'
            error_message = str(smtp_error)
        
        # Get current time in user's timezone
        user_tz = pytz.timezone(brew_timezone)
        sent_at = datetime.now(user_tz)
        sent_at_utc = sent_at.astimezone(pytz.UTC).replace(tzinfo=None)
        
        # Update briefing with delivery status
        cursor.execute("""
            UPDATE time_brew.briefings 
            SET execution_status = %s,
                sent_at = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            'sent' if delivery_status == 'sent' else 'failed',
            sent_at_utc,
            briefing_id
        ))
        
        # Update brew's last_sent_date if email was sent successfully
        if delivery_status == 'sent':
            cursor.execute("""
                UPDATE time_brew.brews 
                SET last_sent_date = %s
                WHERE id = %s
            """, (sent_at_utc, brew_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        if delivery_status == 'sent':
            return {
                'statusCode': 200,
                'body': {
                    'briefing_id': briefing_id,
                    'email': email,
                    'sent_at': sent_at.isoformat(),
                    'message': 'Email sent successfully'
                }
            }
        else:
            return {
                'statusCode': 500,
                'body': {
                    'briefing_id': briefing_id,
                    'error': f'Failed to send email: {error_message}'
                }
            }
        
    except Exception as e:
        print(f"Error in email_dispatcher: {str(e)}")
        
        # Try to update briefing status to failed if we have briefing_id
        try:
            if 'briefing_id' in locals():
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE time_brew.briefings 
                    SET execution_status = 'failed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (briefing_id,))
                conn.commit()
                cursor.close()
                conn.close()
        except:
            pass  # Don't let database update errors mask the original error
        
        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e