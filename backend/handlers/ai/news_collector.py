import json
import os
import boto3
import logging
from datetime import datetime, timedelta
import pytz
from utils.db import get_db_connection
from utils.response import create_response
import requests

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    News Collector Lambda Function
    Collects articles from Perplexity AI based on user preferences and temporal context
    """
    start_time = datetime.utcnow()
    logger.info(f"Starting news collection for event: {event}")
    
    try:
        # Extract and validate brew_id from event
        brew_id = event.get('brew_id')
        if not brew_id:
            logger.error("Missing brew_id in event")
            return create_response(400, {'error': 'brew_id is required'})
        
        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Retrieve brew and user data
        cursor.execute("""
            SELECT b.id, b.user_id, b.name, b.topic, b.keywords, b.delivery_time, 
                   u.timezone, b.article_count, b.last_sent_date,
                   u.email, u.first_name, u.last_name, u.interests
            FROM time_brew.brews b
            JOIN time_brew.users u ON b.user_id = u.id
            WHERE b.id = %s AND b.is_active = true
        """, (brew_id,))
        
        brew_data = cursor.fetchone()
        if not brew_data:
            return create_response(404, {'error': 'Active brew not found'})
        
        (brew_id, user_id, brew_name, topic, keywords, delivery_time, 
         brew_timezone, article_count, last_sent_date, email, first_name, last_name, interests) = brew_data
        
        # Determine if this is morning or evening briefing based on delivery time
        delivery_hour = delivery_time.hour
        briefing_type = "morning" if delivery_hour < 12 else "evening"
        
        # Build user name
        user_name = f"{first_name} {last_name}" if first_name and last_name else first_name or "there"
        
        # Get user's interests as news sources
        cursor.execute("""
            SELECT interests
            FROM time_brew.users
            WHERE id = %s
        """, (user_id,))
        
        user_interests = cursor.fetchone()
        if user_interests and user_interests[0]:
            sources = user_interests[0]  # interests is already an array
        else:
            sources = ['general news', 'technology', 'business']  # Default sources
        
        # Determine temporal window
        user_tz = pytz.timezone(brew_timezone)
        now = datetime.now(user_tz)
        
        if last_sent_date:
            # Convert last_sent_date to user timezone
            if last_sent_date.tzinfo is None:
                last_sent_utc = pytz.UTC.localize(last_sent_date)
            else:
                last_sent_utc = last_sent_date.astimezone(pytz.UTC)
            last_sent_user_tz = last_sent_utc.astimezone(user_tz)
            
            # Use actual time range from last sent to now
            temporal_context = f"since {last_sent_user_tz.strftime('%Y-%m-%d %H:%M %Z')}"
        else:
            # For new users with no previous briefings
            temporal_context = "past 3 days"
        
        # Get last 10 articles sent to this user for context
        cursor.execute("""
            SELECT cc.raw_articles, bf.subject_line, bf.sent_at
            FROM time_brew.briefings bf
            JOIN time_brew.curation_cache cc ON bf.id = cc.briefing_id
            WHERE bf.user_id = %s AND bf.execution_status = 'sent' AND bf.sent_at IS NOT NULL
            ORDER BY bf.sent_at DESC
            LIMIT 10
        """, (user_id,))
        
        previous_articles = []
        for row in cursor.fetchall():
            raw_articles, subject_line, sent_at = row
            if raw_articles:
                if isinstance(raw_articles, str):
                    articles_data = json.loads(raw_articles)
                else:
                    articles_data = raw_articles
                
                for article in articles_data:
                    previous_articles.append({
                        'headline': article.get('headline', ''),
                        'summary': article.get('summary', ''),
                        'sent_date': sent_at.strftime('%Y-%m-%d') if sent_at else 'Unknown'
                    })
        
        # Get user feedback for personalization
        cursor.execute("""
            SELECT f.feedback_type, f.article_position, bf.subject_line
            FROM time_brew.user_feedback f
            LEFT JOIN time_brew.briefings bf ON f.briefing_id = bf.id
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC
            LIMIT 10
        """, (user_id,))
        
        user_feedback = []
        for row in cursor.fetchall():
            feedback_type, article_position, subject_line = row
            feedback_entry = {
                'type': feedback_type,
                'subject': subject_line
            }
            if article_position:
                feedback_entry['article_position'] = article_position
            user_feedback.append(feedback_entry)
        
        # Construct Perplexity AI prompt
        sources_str = ", ".join(sources)
        interests_str = ", ".join(interests) if interests else "general news"
        keywords_str = ", ".join(keywords) if keywords else ""
        
        # Build context sections for the prompt
        previous_articles_context = ""
        if previous_articles:
            previous_articles_context = f"""
        
        IMPORTANT - Previously Sent Articles (AVOID DUPLICATES):
        The user has recently received these articles. DO NOT include similar stories or duplicate coverage:
        """
            for i, article in enumerate(previous_articles[:10], 1):
                previous_articles_context += f"""
        {i}. "{article['headline']}" (sent: {article['sent_date']})
           Summary: {article['summary'][:100]}..."""
        
        feedback_context = ""
        if user_feedback:
            liked = [f for f in user_feedback if f['type'] == 'like']
            disliked = [f for f in user_feedback if f['type'] == 'dislike']
            
            if liked or disliked:
                feedback_context = f"""
        
        User Feedback Insights (Personalize Based On This):"""
                
                if liked:
                    feedback_context += f"""
        - LIKED: User enjoyed briefings about: {', '.join([f['subject'] for f in liked[:3]])}"""
                
                if disliked:
                    feedback_context += f"""
        - DISLIKED: User was less interested in: {', '.join([f['subject'] for f in disliked[:3]])}"""
        
        prompt = f"""
You are a news curator for a personalized {briefing_type} briefing service called TimeBrew.

User Profile:
- Name: {user_name}
- Brew Topic: {topic}
- Interests: {interests_str}
- Keywords: {keywords_str}
- Preferred sources: {sources_str}
- Timezone: {brew_timezone}
- Current time: {now.strftime('%Y-%m-%d %H:%M %Z')}
""" + previous_articles_context + feedback_context + f"""
        
        Task: Find exactly {article_count} significant news articles from the {temporal_context} that would be relevant for this user's {briefing_type} briefing on the topic "{topic}".
        
        CRITICAL REQUIREMENTS:
        1. DO NOT include any articles that are similar to or duplicate the previously sent articles listed above
        2. Focus on breaking news and major developments that are genuinely NEW
        3. Consider the user's feedback patterns - emphasize topics they've rated highly, avoid topics they've disliked
        4. Stories relevant to the user's preferred sources
        5. Articles that would be interesting for a {briefing_type} read
        6. Mix of global, national, and industry-specific news
        
        For each article, provide:
        - Headline
        - Brief summary (2-3 sentences)
        - Source publication
        - Estimated publication time
        - Why it's relevant/interesting
        
        Format your response as a JSON array of articles with the following structure:
        [
          {{
            "headline": "Article headline",
            "summary": "Brief summary of the article",
            "source": "Publication name",
            "published_time": "Estimated time (e.g., '2 hours ago', 'this morning')",
            "relevance": "Why this article is relevant",
            "url": "https://example.com/article" (if available, otherwise null)
          }}
        ]
        """
        
        # Call Perplexity AI API
        perplexity_api_key = os.environ.get('PERPLEXITY_API_KEY')
        if not perplexity_api_key:
            raise Exception('PERPLEXITY_API_KEY not found in environment variables')
        
        headers = {
            'Authorization': f'Bearer {perplexity_api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama-3.1-sonar-large-128k-online',
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.2,
            'max_tokens': 4000
        }
        
        response = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f'Perplexity AI API error: {response.status_code} - {response.text}')
            raise Exception(f'Perplexity AI API error: {response.status_code} - {response.text}')
        
        ai_response = response.json()
        content = ai_response['choices'][0]['message']['content']
        
        # Parse the JSON response
        try:
            # Extract JSON from the response (in case there's additional text)
            start_idx = content.find('[')
            end_idx = content.rfind(']') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                articles = json.loads(json_str)
            else:
                # Fallback: try to parse the entire content
                articles = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            logger.error(f"Raw content: {content[:500]}...")  # Log first 500 chars only
            raise Exception('Failed to parse articles from AI response')
        
        # Validate articles structure and content
        if not articles or not isinstance(articles, list):
            logger.error(f"Invalid articles format: expected list, got {type(articles)}")
            raise Exception('No valid articles returned from AI')
        
        if len(articles) == 0:
            logger.warning("AI returned empty articles list")
            raise Exception('No articles found for the specified criteria')
        
        # Validate each article has required fields
        required_fields = ['headline', 'summary', 'source']
        for i, article in enumerate(articles):
            if not isinstance(article, dict):
                logger.error(f"Article {i+1} is not a dictionary: {type(article)}")
                continue
            
            missing_fields = [field for field in required_fields if not article.get(field)]
            if missing_fields:
                logger.warning(f"Article {i+1} missing fields: {missing_fields}")
                # Set default values for missing fields
                for field in missing_fields:
                    if field == 'headline':
                        article[field] = f"News Update {i+1}"
                    elif field == 'summary':
                        article[field] = "Summary not available"
                    elif field == 'source':
                        article[field] = "Unknown Source"
        
        logger.info(f"Successfully parsed {len(articles)} articles from AI response")
        
        # Create basic placeholder subject line and content
        # The news_editor will generate the final subject line and HTML content
        subject_line = f"TimeBrew {briefing_type.title()} Brief - Processing"
        initial_html = "<p>Briefing content is being prepared...</p>"
        
        cursor.execute("""
            INSERT INTO time_brew.briefings 
            (brew_id, user_id, subject_line, html_content, article_count, execution_status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            brew_id, 
            user_id, 
            subject_line,
            initial_html,
            len(articles),
            'processing',
            datetime.utcnow()
        ))
        
        briefing_id = cursor.fetchone()[0]
        
        # Store articles in curation_cache as raw_articles JSONB array
        search_topics = [topic] + (keywords if keywords else [])
        
        cursor.execute("""
            INSERT INTO time_brew.curation_cache 
            (briefing_id, raw_articles, topics_searched, articles_found, 
             collector_prompt, raw_llm_response, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            briefing_id,
            json.dumps(articles),  # Store as JSONB array
            search_topics,
            len(articles),
            prompt[:1000],  # Truncate prompt for storage
            content[:5000],  # Store the raw LLM response (truncated to 5000 chars)
            datetime.utcnow()
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Calculate processing time
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        logger.info(f"News collection completed successfully in {processing_time:.2f}s for briefing_id: {briefing_id}")
        
        return {
            'statusCode': 200,
            'body': {
                'briefing_id': briefing_id,
                'articles_collected': len(articles),
                'temporal_context': temporal_context,
                'briefing_type': briefing_type,
                'topic': topic,
                'processing_time_seconds': processing_time,
                'message': f'Articles collected successfully for {briefing_type} briefing'
            }
        }
        
    except Exception as e:
        logger.error(f"Error in news_collector: {str(e)}")
        # Ensure database connection is closed on error
        try:
            if 'conn' in locals():
                conn.rollback()
                conn.close()
        except:
            pass
        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e