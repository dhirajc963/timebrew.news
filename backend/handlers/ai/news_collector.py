import json
import os
import boto3
import json
from datetime import datetime, timedelta
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger
import requests
from utils.text_utils import format_list_with_quotes


def lambda_handler(event, context):
    """
    News Collector Lambda Function
    Collects articles from Perplexity AI based on user preferences and temporal context
    """
    start_time = datetime.utcnow()
    logger.log_request_start(event, context, "ai/news_collector")

    try:
        # Extract and validate brew_id from event
        brew_id = event.get("brew_id")
        if not brew_id:
            logger.error("News collection failed: missing brew_id in event")
            return create_response(400, {"error": "brew_id is required"})

        # Set context for subsequent logs
        logger.set_context(brew_id=brew_id)

        # Get database connection
        logger.info("Connecting to database for brew data retrieval")
        db_start_time = datetime.utcnow()

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            db_connect_duration = (
                datetime.utcnow() - db_start_time
            ).total_seconds() * 1000
            logger.log_db_operation("connect", "brews", db_connect_duration)
        except Exception as e:
            logger.error("Failed to connect to database", error=e)
            return create_response(500, {"error": "Database connection failed"})

        # Retrieve brew and user data
        logger.info("Retrieving brew and user data")
        query_start_time = datetime.utcnow()

        cursor.execute(
            """
            SELECT b.id, b.user_id, b.name, b.topics, b.delivery_time, 
                u.timezone, b.article_count, b.last_sent_date,
                u.email, u.first_name, u.last_name
            FROM time_brew.brews b
            JOIN time_brew.users u ON b.user_id = u.id
            WHERE b.id = %s AND b.is_active = true
        """,
            (brew_id,),
        )

        brew_data = cursor.fetchone()
        query_duration = (datetime.utcnow() - query_start_time).total_seconds() * 1000
        logger.log_db_operation("select", "brews", query_duration, table_join="users")

        if not brew_data:
            logger.warn("Active brew not found for provided brew_id")
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Active brew not found"})

        (
            brew_id,
            user_id,
            brew_name,
            topics,
            delivery_time,
            brew_timezone,
            article_count,
            last_sent_date,
            email,
            first_name,
            last_name,
        ) = brew_data

        # Add user context to logger
        logger.set_context(user_id=user_id, user_email=email)

        # Determine if this is morning or evening briefing based on delivery time
        delivery_hour = delivery_time.hour
        briefing_type = "morning" if delivery_hour < 12 else "evening"

        # Build user name
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "there"
        )

        # Determine temporal window
        user_tz = pytz.timezone(brew_timezone)
        now = datetime.now(user_tz)

        logger.info(
            "Brew configuration loaded",
            brew_name=brew_name,
            briefing_type=briefing_type,
            article_count=article_count,
            user_timezone=brew_timezone,
            topics_count=len(topics_list) if isinstance(topics, str) else 0,
        )

        if last_sent_date:
            # Convert last_sent_date to user timezone
            if last_sent_date.tzinfo is None:
                last_sent_utc = pytz.UTC.localize(last_sent_date)
            else:
                last_sent_utc = last_sent_date.astimezone(pytz.UTC)
            last_sent_user_tz = last_sent_utc.astimezone(user_tz)

            # Use actual time range from last sent to now
            temporal_context = f"{last_sent_user_tz.strftime('%Y-%m-%d %H:%M %Z')} to {now.strftime('%Y-%m-%d %H:%M %Z')}"
        else:
            # For new users with no previous briefings
            temporal_context = "past 3 days"

        # Get last 10 articles sent to this user for context
        logger.info("Retrieving previous articles for context")
        prev_articles_start_time = datetime.utcnow()

        cursor.execute(
            """
            SELECT cc.raw_articles, bf.subject_line, bf.sent_at
            FROM time_brew.briefings bf
            JOIN time_brew.curation_cache cc ON bf.id = cc.briefing_id
            WHERE bf.user_id = %s AND bf.execution_status = 'dispatched' AND bf.sent_at IS NOT NULL
            ORDER BY bf.sent_at DESC
            LIMIT 10
            """,
            (user_id,),
        )

        prev_articles_duration = (
            datetime.utcnow() - prev_articles_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select",
            "briefings",
            prev_articles_duration,
            table_join="curation_cache",
            limit=10,
        )

        previous_articles = []
        for row in cursor.fetchall():
            raw_articles, subject_line, sent_at = row
            if raw_articles:
                if isinstance(raw_articles, str):
                    articles_data = json.loads(raw_articles)
                else:
                    articles_data = raw_articles

                for article in articles_data:
                    previous_articles.append(
                        {
                            "headline": article.get("headline", ""),
                            "summary": article.get("summary", ""),
                            "sent_date": (
                                sent_at.strftime("%Y-%m-%d") if sent_at else "Unknown"
                            ),
                        }
                    )

        # Get user feedback for personalization
        logger.info("Retrieving user feedback for personalization")
        feedback_start_time = datetime.utcnow()

        cursor.execute(
            """
            SELECT f.feedback_type, f.article_position, bf.subject_line
            FROM time_brew.user_feedback f
            LEFT JOIN time_brew.briefings bf ON f.briefing_id = bf.id
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC
            LIMIT 10
        """,
            (user_id,),
        )

        feedback_duration = (
            datetime.utcnow() - feedback_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select",
            "user_feedback",
            feedback_duration,
            table_join="briefings",
            limit=10,
        )

        user_feedback = []
        for row in cursor.fetchall():
            feedback_type, article_position, subject_line = row
            feedback_entry = {"type": feedback_type, "subject": subject_line}
            if article_position:
                feedback_entry["article_position"] = article_position
            user_feedback.append(feedback_entry)

        # Construct Perplexity AI prompt
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

        # Format topics with proper grammar and quotes using utility function
        brew_focus_topics_str = format_list_with_quotes(topics_list)

        # Build context sections for the prompt
        previous_articles_context = ""
        if previous_articles:
            previous_articles_context = f"""
The user has recently received these articles. DO NOT include same stories or duplicate coverage:
        """
            for i, article in enumerate(previous_articles[:10], 1):
                previous_articles_context += f"""
        {i}. "{article['headline']}" (sent: {article['sent_date']})
        Summary: {article['summary'][:100]}..."""

        feedback_context = ""

        # Improve the feedback context section
        if user_feedback:
            feedback_context = f"""
        # USER PREFERENCES (Learned from {len(user_feedback)} interactions)
        """

            # Group feedback by type for better context
            liked_topics = [f["subject"] for f in user_feedback if f["type"] == "like"]
            disliked_topics = [
                f["subject"] for f in user_feedback if f["type"] == "dislike"
            ]

            if liked_topics:
                feedback_context += (
                    f"**HIGH INTEREST:** {', '.join(liked_topics[:3])}\n"
                )
            if disliked_topics:
                feedback_context += (
                    f"**LOW INTEREST:** {', '.join(disliked_topics[:3])}\n"
                )

        prompt = f"""# ROLE & CONTEXT
        You are an expert news curator for TimeBrew, a personalized briefing service. You're preparing {user_name}'s "{brew_name}" briefing for delivery at {delivery_hour:02d}:00 {brew_timezone}.

        **Current Time:** {now.strftime('%Y-%m-%d %H:%M %Z')}
        **Focus Topics:** {brew_focus_topics_str}
        **Articles Needed:** {article_count}
        **Time Window:** {temporal_context}

        # PERSONALIZATION CONTEXT
        {previous_articles_context}
        {feedback_context}

        # PRIMARY TASK
        Find exactly {article_count} high-quality, recent news articles that match this user's interests and briefing preferences.

        # CRITICAL REQUIREMENTS
        1. **NO DUPLICATES:** Avoid any articles similar to those previously sent (listed above)
        2. **RECENCY FOCUS:** Prioritize breaking news and major developments from {temporal_context}
        3. **PERSONALIZATION:** Apply user feedback patterns - emphasize liked topics, minimize disliked ones
        4. **QUALITY SOURCES:** Use only reputable news sources (major newspapers, wire services, established publications)
        5. **ENGAGEMENT:** Select articles that are genuinely interesting and worth reading
        6. **DIVERSITY:** Mix global, national, and topic-specific coverage

        # ARTICLE SELECTION CRITERIA
        - **Significance:** Major developments, breaking news, or important updates
        - **Relevance:** Directly related to user's specified topics
        - **Freshness:** Published within the specified time window
        - **Readability:** Clear, well-written articles from credible sources
        - **Impact:** Stories that matter to someone interested in these topics

        # OUTPUT FORMAT
        Return ONLY a valid JSON array with this exact structure:

        [
            {{
                "headline": "Exact article headline",
                "summary": "Concise 3-4 sentence summary highlighting key points",
                "source": "Publication name (e.g., Reuters, BBC, Wall Street Journal)",
                "published_time": "Relative time (e.g., '2 hours ago', 'this morning', 'yesterday')",
                "relevance": "1-2 sentences explaining why this matters to the user",
                "url": "Direct article URL"
            }}
        ]

        # QUALITY CHECKLIST
        Before finalizing, ensure each article:
        - Has a compelling, newsworthy headline
        - Provides genuine value to someone interested in {brew_focus_topics_str}
        - Comes from a credible, recognizable source
        - Isn't already covered in previous briefings
        - Fits the {briefing_type} briefing context

        # VALIDATION REQUIREMENTS:
        - Verify JSON is properly formatted and parseable
        - Ensure all required fields are present and non-empty
        - Double-check URLs are accessible and relevant
        - Confirm articles are genuinely from {temporal_context}

        Begin JSON array:"""

        # Call Perplexity AI API
        logger.info("Preparing Perplexity AI API call for article curation")
        perplexity_api_key = os.environ.get("PERPLEXITY_API_KEY")
        if not perplexity_api_key:
            logger.error("Perplexity AI API key not found in environment variables")
            raise Exception("PERPLEXITY_API_KEY not found in environment variables")

        headers = {
            "Authorization": f"Bearer {perplexity_api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "sonar",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 4000,
        }

        logger.info(
            "Making request to Perplexity AI",
            model=payload["model"],
            temperature=payload["temperature"],
            prompt_length=len(prompt),
            requested_articles=article_count,
        )

        api_start_time = datetime.utcnow()
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload,
            timeout=30,
        )
        api_duration = (datetime.utcnow() - api_start_time).total_seconds() * 1000

        logger.log_external_api_call(
            "Perplexity AI",
            "/chat/completions",
            "POST",
            response.status_code,
            api_duration,
            model=payload["model"],
            prompt_tokens=len(prompt.split()),  # Rough token estimate
            requested_articles=article_count,
        )

        if response.status_code != 200:
            logger.error(
                "Perplexity AI API request failed",
                status_code=response.status_code,
                response_text=response.text[:500],  # Limit response text for logging
            )
            raise Exception(
                f"Perplexity AI API error: {response.status_code} - {response.text}"
            )

        ai_response = response.json()
        content = ai_response["choices"][0]["message"]["content"]

        logger.info(
            "Received response from Perplexity AI",
            response_length=len(content),
            has_choices=bool(ai_response.get("choices")),
            content_preview=content[:200] + "..." if len(content) > 200 else content,
        )

        # Parse the JSON response
        logger.info("Parsing articles from AI response")
        try:
            # Extract JSON from the response (in case there's additional text)
            start_idx = content.find("[")
            end_idx = content.rfind("]") + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                articles = json.loads(json_str)
                logger.info(
                    "Successfully extracted JSON array from AI response",
                    json_start_index=start_idx,
                    json_end_index=end_idx,
                )
            else:
                # Fallback: try to parse the entire content
                articles = json.loads(content)
                logger.info("Successfully parsed entire content as JSON")
        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse JSON from AI response",
                error=e,
                content_preview=content[:500],  # Log first 500 chars only
                json_start_found=start_idx != -1,
                json_end_found=end_idx != 0,
            )
            raise Exception("Failed to parse articles from AI response")

        # Validate articles structure and content
        logger.info("Validating articles structure and content")
        if not articles or not isinstance(articles, list):
            logger.error(
                "Invalid articles format from AI response",
                expected_type="list",
                actual_type=type(articles).__name__,
                articles_truthy=bool(articles),
            )
            raise Exception("No valid articles returned from AI")

        if len(articles) == 0:
            logger.warn("AI returned empty articles list")
            raise Exception("No articles found for the specified criteria")

        # Validate each article has required fields
        required_fields = ["headline", "summary", "source"]
        valid_articles = 0
        articles_with_issues = 0

        for i, article in enumerate(articles):
            if not isinstance(article, dict):
                logger.error(
                    "Article validation failed: not a dictionary",
                    article_index=i + 1,
                    actual_type=type(article).__name__,
                )
                articles_with_issues += 1
                continue

            missing_fields = [
                field for field in required_fields if not article.get(field)
            ]
            if missing_fields:
                logger.error(
                    "Article missing critical required fields",
                    article_index=i + 1,
                    missing_fields=missing_fields,
                    headline=article.get("headline", "N/A")[:50],
                )
                raise Exception(
                    f"Article {i+1} is missing critical fields: {', '.join(missing_fields)}. "
                    f"Headline: {article.get('headline', 'N/A')[:50]}"
                )

            valid_articles += 1

        logger.info(
            "Article validation completed",
            total_articles=len(articles),
            valid_articles=valid_articles,
            articles_with_issues=articles_with_issues,
        )

        # Create basic placeholder subject line and content
        # The news_editor will generate the final subject line and HTML content
        subject_line = f"{user_name}'s {brew_name} Brief - Processing"
        initial_html = "<p>Briefing content is being prepared...</p>"

        logger.info("Creating briefing record in database")
        briefing_insert_start_time = datetime.utcnow()

        cursor.execute(
            """
            INSERT INTO time_brew.briefings 
            (brew_id, user_id, subject_line, html_content, article_count, execution_status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                brew_id,
                user_id,
                subject_line,
                initial_html,
                len(articles),
                "curated",
                datetime.utcnow(),
            ),
        )

        briefing_id = cursor.fetchone()[0]
        briefing_insert_duration = (
            datetime.utcnow() - briefing_insert_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "insert",
            "briefings",
            briefing_insert_duration,
            briefing_id=briefing_id,
            article_count=len(articles),
        )

        # Store articles in curation_cache as raw_articles JSONB array
        search_topics = topics_list

        logger.info("Storing articles in curation cache")
        cache_insert_start_time = datetime.utcnow()

        cursor.execute(
            """
            INSERT INTO time_brew.curation_cache 
            (briefing_id, raw_articles, topics_searched, articles_found, 
                collector_prompt, raw_llm_response, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
            (
                briefing_id,
                json.dumps(articles),  # Store as JSONB array
                search_topics,
                len(articles),
                prompt[:5000],  # Truncate prompt for storage
                content[:5000],  # Store the raw LLM response (truncated to 5000 chars)
                datetime.utcnow(),
            ),
        )

        cache_insert_duration = (
            datetime.utcnow() - cache_insert_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "insert",
            "curation_cache",
            cache_insert_duration,
            briefing_id=briefing_id,
            articles_stored=len(articles),
            prompt_length=len(prompt),
            response_length=len(content),
        )

        # Commit transaction
        commit_start_time = datetime.utcnow()
        conn.commit()
        commit_duration = (datetime.utcnow() - commit_start_time).total_seconds() * 1000
        logger.log_db_operation(
            "commit", "briefings", commit_duration, records_affected=2
        )  # briefings + curation_cache

        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()

        logger.info(
            "News collection completed successfully",
            briefing_id=briefing_id,
            processing_time_seconds=round(processing_time, 2),
            articles_collected=len(articles),
            temporal_context=temporal_context,
            topics=topics_list,
        )

        logger.log_request_end("ai/news_collector", 200, processing_time * 1000)

        return {
            "statusCode": 200,
            "body": {
                "message": "Articles collected successfully",
                "briefing_id": briefing_id,
                "user_name": user_name,
                "brew_name": brew_name,
                "articles_collected": len(articles),
                "articles_found": str(article)[:200],
                "topics": topics_list,
                "temporal_context": temporal_context,
                "processing_time_seconds": processing_time,
            },
        }

    except Exception as e:
        logger.error("News collection failed: unexpected error", error=e)
        # Ensure database connection is closed on error
        try:
            if "conn" in locals():
                conn.rollback()
                conn.close()
                logger.info("Database connection rolled back and closed due to error")
        except Exception as cleanup_error:
            logger.error("Failed to cleanup database connection", error=cleanup_error)

        # Calculate processing time for failed request
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        logger.log_request_end("ai/news_collector", 500, processing_time * 1000)

        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
