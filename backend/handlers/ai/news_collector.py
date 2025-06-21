import json
import os
from datetime import datetime, timedelta
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger
from utils.ai_service import ai_service
from utils.text_utils import format_list_with_quotes


def lambda_handler(event, context):
    """
    News Collector Lambda Function
    Collects articles from AI and stores them for the editor to process into JSON format
    """
    start_time = datetime.utcnow()
    logger.log_request_start(event, context, "ai/news_collector")

    try:
        # Extract and validate brew_id from event
        brew_id = event.get("brew_id")
        if not brew_id:
            logger.error("News collection failed: missing brew_id in event")
            return create_response(400, {"error": "brew_id is required"})

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
                u.timezone, b.last_sent_date,
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
            last_sent_date,
            email,
            first_name,
            last_name,
        ) = brew_data

        logger.set_context(user_id=user_id, user_email=email)

        # Determine briefing type and build user name
        delivery_hour = delivery_time.hour
        briefing_type = "morning" if delivery_hour < 12 else "evening"
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "there"
        )

        # Determine temporal window
        user_tz = pytz.timezone(brew_timezone)
        now = datetime.now(user_tz)

        # Parse topics JSON
        if isinstance(topics, str):
            try:
                topics_list = json.loads(topics)
            except json.JSONDecodeError:
                topics_list = []
        elif topics is None:
            topics_list = []
        else:
            topics_list = topics

        logger.info(
            "Brew configuration loaded",
            brew_name=brew_name,
            briefing_type=briefing_type,
            user_timezone=brew_timezone,
            topics_count=len(topics_list),
        )

        # Calculate temporal context
        if last_sent_date:
            if last_sent_date.tzinfo is None:
                last_sent_utc = pytz.UTC.localize(last_sent_date)
            else:
                last_sent_utc = last_sent_date.astimezone(pytz.UTC)
            last_sent_user_tz = last_sent_utc.astimezone(user_tz)
            temporal_context = f"{last_sent_user_tz.strftime('%Y-%m-%d %H:%M %Z')} to {now.strftime('%Y-%m-%d %H:%M %Z')}"
        else:
            temporal_context = "past 3 days"

        # Get previous articles for context (avoid duplicates)
        logger.info("Retrieving previous articles for context")
        prev_articles_start_time = datetime.utcnow()

        cursor.execute(
            """
            SELECT cc.raw_articles, bf.sent_at
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
            raw_articles, sent_at = row
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
            SELECT f.feedback_type, f.article_position
            FROM time_brew.user_feedback f
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC
            LIMIT 10
        """,
            (user_id,),
        )

        feedback_duration = (
            datetime.utcnow() - feedback_start_time
        ).total_seconds() * 1000
        logger.log_db_operation("select", "user_feedback", feedback_duration, limit=10)

        user_feedback = []
        for row in cursor.fetchall():
            feedback_type, article_position = row
            feedback_entry = {"type": feedback_type}
            if article_position:
                feedback_entry["article_position"] = article_position
            user_feedback.append(feedback_entry)

        # Format topics for prompt
        brew_focus_topics_str = format_list_with_quotes(topics_list)

        # Build context sections
        previous_articles_context = ""
        if previous_articles:
            previous_articles_context = f"""
# PREVIOUS ARTICLES (DO NOT DUPLICATE)
The user has recently received these articles. DO NOT include same stories or duplicate coverage:
"""
            for i, article in enumerate(previous_articles[:10], 1):
                previous_articles_context += f"""
{i}. "{article['headline']}" (sent: {article['sent_date']})
   Summary: {article['summary'][:100]}..."""

        feedback_context = ""
        if user_feedback:
            liked_count = len([f for f in user_feedback if f["type"] == "like"])
            disliked_count = len([f for f in user_feedback if f["type"] == "dislike"])

            if liked_count > 0 or disliked_count > 0:
                feedback_context = f"""
# USER PREFERENCES (Based on {len(user_feedback)} interactions)
"""
                if liked_count > 0:
                    feedback_context += (
                        f"- User has liked {liked_count} recent articles\n"
                    )
                if disliked_count > 0:
                    feedback_context += f"- User has disliked {disliked_count} recent articles - adjust content accordingly\n"

        # Build AI prompt for article curation
        prompt = f"""# ROLE & MISSION
You are an expert news curator for TimeBrew, preparing raw article data for {user_name}'s "{brew_name}" briefing.

**Current Time:** {now.strftime('%Y-%m-%d %H:%M %Z')}
**Focus Topics:** {brew_focus_topics_str}
**Time Window:** {temporal_context}
**Briefing Type:** {briefing_type} briefing (delivery at {delivery_hour:02d}:00)

{previous_articles_context}
{feedback_context}

# YOUR TASK
Find 3-8 high-quality, recent news articles that match this user's interests. Your role is CURATION ONLY - just find and organize the raw articles. The editor will handle all formatting and voice later.

# ARTICLE DIVERSITY REQUIREMENTS
1. **NO DUPLICATES:** Never include articles about the same event/announcement
2. **COMPANY LIMIT:** Maximum one article per company/organization  
3. **SOURCE DIVERSITY:** Mix different news sources and publication types
4. **TOPIC SPREAD:** If user has multiple topics, distribute articles across them
5. **TIME VARIETY:** Mix breaking news with important recent developments
6. **ANGLE DIVERSITY:** Different story types (earnings, launches, policy, research, trends)

# QUALITY CRITERIA
- **Significance:** Major developments, breaking news, important updates
- **Relevance:** Directly related to user's specified topics
- **Freshness:** Published within the specified time window  
- **Credibility:** From reputable news sources and publications
- **Uniqueness:** Each article covers a DIFFERENT story/event/company
- **Impact:** Stories that matter to someone interested in these topics

# CONTENT AVAILABILITY GUIDANCE
- **Rich news day (6-8 diverse articles):** Include them all
- **Normal day (4-5 good articles):** Perfect sweet spot
- **Slow day (3 quality articles):** Quality over quantity - fine to send fewer
- **Very slow day (struggling to find 3):** Note this in curator_notes

# FINAL DIVERSITY CHECK
Before submitting, verify:
- No two articles about the same company/event/announcement
- Headlines don't mention the same key entities  
- Mixed source types and angles
- Spread across different sub-topics within user's interests

# OUTPUT FORMAT
Return ONLY a valid JSON object with this exact structure:

{{
    "articles": [
        {{
            "headline": "Exact article headline from source",
            "summary": "3-4 sentence summary of key points and significance",
            "source": "Publication name (e.g., Reuters, TechCrunch, Wall Street Journal)",
            "published_time": "Relative time (e.g., '2 hours ago', 'this morning', 'yesterday')",
            "relevance": "1-2 sentences explaining why this matters to this user's interests",
            "url": "Direct article URL"
        }}
    ],
    "curator_notes": "Brief insight about today's content landscape - availability, challenges, or trends you noticed. Use empty string if normal day."
}}

# CURATOR NOTES EXAMPLES
- "Rich news day with diverse developments across AI research, policy, and business applications"
- "Limited unique coverage in tech today - focused on the most significant developments"
- "Slower news cycle for startup topics, included analysis pieces alongside breaking news"  
- "Major breaking story dominating coverage - balanced with other important developments"
- "" (empty string for normal days with good article diversity)

# VALIDATION CHECKLIST
✓ Valid JSON format that can be parsed
✓ All required fields present and populated
✓ No duplicate companies/events/stories
✓ Articles genuinely from specified time window
✓ URLs are accessible and direct links
✓ 3-8 articles total (based on quality availability)

**Remember:** You're the curator who finds the articles. The editor will handle all TimeBrew voice, formatting, and presentation. Focus on finding the best, most diverse raw material for them to work with.

Begin JSON object:"""

        # Load AI model configuration and make API call
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "ai_models.json",
        )
        with open(config_path, "r") as f:
            ai_models = json.load(f)

        curator_config = ai_models["curator"]
        provider = curator_config["provider"]
        model = curator_config["model"]

        logger.info(f"Preparing {provider.title()} API call for article curation")
        api_start_time = datetime.utcnow()

        try:
            ai_response_data = ai_service.call(
                provider,
                prompt=prompt,
                model=model,
                temperature=0.2,
                max_tokens=4000,
                timeout=30,
            )
            content = ai_response_data["content"]
            api_duration = (datetime.utcnow() - api_start_time).total_seconds() * 1000

            logger.log_external_api_call(
                provider.title(),
                "/chat/completions",
                "POST",
                200,
                api_duration,
                model=model,
                prompt_tokens=len(prompt.split()),
            )
        except Exception as e:
            api_duration = (datetime.utcnow() - api_start_time).total_seconds() * 1000
            logger.error(
                f"{provider.title()} API request failed",
                error=str(e),
                api_duration=api_duration,
            )
            raise Exception(f"{provider.title()} API error: {str(e)}")

        logger.info(
            "Received response from AI curator",
            response_length=len(content),
            content_preview=content[:200] + "..." if len(content) > 200 else content,
        )

        # Parse AI response
        logger.info("Parsing articles from AI response")
        try:
            # Extract JSON from response
            start_idx = content.find("{")
            end_idx = content.rfind("}") + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                response_data = json.loads(json_str)
                logger.info("Successfully extracted JSON from AI response")
            else:
                response_data = json.loads(content)
                logger.info("Successfully parsed entire content as JSON")
        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse JSON from AI response",
                error=e,
                content_preview=content[:500],
            )
            raise Exception("Failed to parse articles from AI response")

        # Extract articles and curator notes
        articles = response_data.get("articles", [])
        curator_notes = response_data.get("curator_notes", "")

        logger.info(
            "Article curation completed",
            total_articles=len(articles),
            curator_notes_provided=bool(curator_notes.strip()),
        )

        # Create briefing record - clean approach without old fields
        logger.info("Creating briefing record in database")
        briefing_insert_start_time = datetime.utcnow()

        cursor.execute(
            """
            INSERT INTO time_brew.briefings 
            (brew_id, user_id, article_count, execution_status, created_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                brew_id,
                user_id,
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

        # Store articles in curation cache
        logger.info("Storing curated articles in cache")
        cache_insert_start_time = datetime.utcnow()

        cursor.execute(
            """
            INSERT INTO time_brew.curation_cache 
            (briefing_id, raw_articles, topics_searched, articles_found, 
             collector_prompt, raw_llm_response, curator_notes, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
            (
                briefing_id,
                json.dumps(articles),
                topics_list,
                len(articles),
                prompt[:5000],  # Truncate for storage
                content[:5000],  # Truncate for storage
                curator_notes,
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
        )

        # Commit transaction
        commit_start_time = datetime.utcnow()
        conn.commit()
        commit_duration = (datetime.utcnow() - commit_start_time).total_seconds() * 1000
        logger.log_db_operation(
            "commit", "briefings", commit_duration, records_affected=2
        )

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
            curator_notes=curator_notes,
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
                "curator_notes": curator_notes,
                "topics": topics_list,
                "temporal_context": temporal_context,
                "processing_time_seconds": round(processing_time, 2),
            },
        }

    except Exception as e:
        logger.error("News collection failed: unexpected error", error=e)

        # Cleanup database connection on error
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

        raise e
