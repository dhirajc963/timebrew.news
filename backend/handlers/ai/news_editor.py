import os
import json
from datetime import datetime
import pytz
from utils.db import get_db_connection
from utils.response import create_response
import openai

def lambda_handler(event, context):
    """
    News Editor Lambda Function
    Formats collected articles into a Morning Brew-style briefing using OpenAI
    """
    try:
        # Extract briefing_id from event
        briefing_id = event.get('briefing_id')
        if not briefing_id:
            return create_response(400, {'error': 'briefing_id is required'})
        
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Retrieve briefing and associated data
        cursor.execute("""
            SELECT bf.id, bf.brew_id, bf.user_id, bf.article_count, bf.execution_status,
                   b.name, b.topics, b.delivery_time, u.timezone,
                   u.email, u.first_name, u.last_name
            FROM time_brew.briefings bf
            JOIN time_brew.brews b ON bf.brew_id = b.id
            JOIN time_brew.users u ON bf.user_id = u.id
            WHERE bf.id = %s
        """, (briefing_id,))
        
        briefing_data = cursor.fetchone()
        if not briefing_data:
            return create_response(404, {'error': 'Briefing not found'})
        
        (briefing_id, brew_id, user_id, article_count, execution_status, 
         brew_name, topics, delivery_time, brew_timezone, email, first_name, last_name) = briefing_data
        
        if execution_status != 'processing':
            return create_response(400, {'error': f'Briefing status is {execution_status}, expected processing'})
        
        # Determine briefing type and build user name
        delivery_hour = delivery_time.hour
        briefing_type = "morning" if delivery_hour < 12 else "evening"
        user_name = f"{first_name} {last_name}" if first_name and last_name else first_name or "there"
        
        # Retrieve raw articles from curation_cache
        cursor.execute("""
            SELECT raw_articles
            FROM time_brew.curation_cache
            WHERE briefing_id = %s
        """, (briefing_id,))
        
        cache_result = cursor.fetchone()
        if not cache_result:
            return create_response(404, {'error': 'No articles found in curation cache'})
        
        raw_articles_data = cache_result[0]
        if isinstance(raw_articles_data, str):
            raw_articles = json.loads(raw_articles_data)
        else:
            raw_articles = raw_articles_data
        
        # Add position to each article for reference
        for i, article in enumerate(raw_articles):
            article['position'] = i + 1
        
        if not raw_articles:
            return create_response(400, {'error': 'No articles found for briefing'})
        
        # Get user timezone for personalization
        user_tz = pytz.timezone(brew_timezone)
        now = datetime.now(user_tz)
        
        # Get user feedback for personalization (if any)
        cursor.execute("""
            SELECT article_title, feedback_type, created_at
            FROM time_brew.user_feedback
            WHERE user_id = %s AND article_title IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 10
        """, (user_id,))
        
        feedback_data = cursor.fetchall()
        feedback_context = ""
        if feedback_data:
            liked_articles = [row[0] for row in feedback_data if row[1] == 'like']
            disliked_articles = [row[0] for row in feedback_data if row[1] == 'dislike']
            
            if liked_articles or disliked_articles:
                feedback_context = "\n\nUser Preferences (based on recent feedback):\n"
                if liked_articles:
                    feedback_context += f"- Liked articles: {', '.join(liked_articles[:3])}\n"
                if disliked_articles:
                    feedback_context += f"- Disliked articles: {', '.join(disliked_articles[:3])}\n"
                feedback_context += "Please consider these preferences when formatting and prioritizing content.\n"
        
        # Construct OpenAI prompt for formatting
        articles_text = "\n\n".join([
            f"Article {i+1}:\n"
            f"Headline: {article['headline']}\n"
            f"Summary: {article['summary']}\n"
            f"Source: {article['source']}\n"
            f"Published: {article['published_time']}\n"
            f"Relevance: {article['relevance']}"
            for i, article in enumerate(raw_articles)
        ])
        
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
        
        topics_str = ", ".join(topics_list)
        
        prompt = f"""
        You are an expert newsletter editor for TimeBrew, a personalized news briefing service.
        
        User Profile:
        - Name: {user_name}
        - Briefing Type: {briefing_type.title()} briefing
        - Topic Focus: {topics_str}
        - Timezone: {brew_timezone}
        - Current time: {now.strftime('%A, %B %d, %Y at %I:%M %p %Z')}
        {feedback_context}
        
        Task: Transform the following raw articles into a polished, engaging {briefing_type} briefing in the style of Morning Brew.
        
        Style Guidelines:
        1. Conversational and witty tone
        2. Use engaging headlines and subheadings
        3. Include brief, punchy summaries
        4. Add context and analysis where relevant
        5. Use emojis sparingly but effectively
        6. Keep it scannable with good formatting
        7. End with a personalized sign-off
        
        Structure:
        1. Personalized greeting with the date (Good {{briefing_type}}, {{user_name}}!)
        2. Brief intro paragraph mentioning the {{briefing_type}} briefing and topics focus
        3. Main stories (3-5 top stories with detailed coverage)
        4. Quick hits (remaining stories in brief format)
        5. Closing thought or quote of the day
        6. Personalized sign-off from TimeBrew
        
        Raw Articles:
        {articles_text}
        
        Please format this as HTML suitable for email, using proper HTML tags for structure.
        Also provide a compelling subject line.
        
        Return your response as a JSON object with this structure:
        {{
          "subject_line": "Compelling subject line for the email",
          "html_content": "Full HTML content of the briefing"
        }}
        """
        
        # Call OpenAI API
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key:
            raise Exception('OPENAI_API_KEY not found in environment variables')
        
        client = openai.OpenAI(api_key=openai_api_key)
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert newsletter editor who creates engaging, Morning Brew-style briefings. Always respond with valid JSON containing subject_line and html_content fields."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        ai_response = response.choices[0].message.content
        
        # Truncate prompt and response for storage (similar to news_collector)
        truncated_prompt = prompt[:5000] if len(prompt) > 5000 else prompt
        truncated_ai_response = ai_response[:5000] if len(ai_response) > 5000 else ai_response
        
        # Parse the JSON response
        try:
            # Extract JSON from the response
            start_idx = ai_response.find('{')
            end_idx = ai_response.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = ai_response[start_idx:end_idx]
                formatted_content = json.loads(json_str)
            else:
                # Fallback: try to parse the entire content
                formatted_content = json.loads(ai_response)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw AI response: {ai_response}")
            raise Exception('Failed to parse formatted content from AI response')
        
        subject_line = formatted_content.get('subject_line', f'Your TimeBrew for {now.strftime("%B %d")}')
        html_content = formatted_content.get('html_content', '')
        
        if not html_content:
            raise Exception('No HTML content generated by AI')
        
        # Update briefing with formatted content
        cursor.execute("""
            UPDATE time_brew.briefings 
            SET execution_status = 'completed',
                subject_line = %s,
                html_content = %s,
                editor_prompt = %s,
                raw_ai_response = %s,
                updated_at = now()
            WHERE id = %s
        """, (
            subject_line,
            html_content,
            truncated_prompt,
            truncated_ai_response,
            briefing_id
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'body': {
                'briefing_id': briefing_id,
                'subject_line': subject_line,
                'content_length': len(html_content),
                'message': 'Briefing formatted successfully'
            }
        }
        
    except Exception as e:
        print(f"Error in news_editor: {str(e)}")
        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e