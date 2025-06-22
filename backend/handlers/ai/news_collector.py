import json
import os
from datetime import datetime, timedelta, timezone
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.logger import logger
from utils.ai_service import ai_service
from utils.text_utils import format_list_with_quotes
from utils.other_utils import format_time_ampm


def lambda_handler(event, context):
    """
    News Collector Lambda Function
    Collects articles from AI and stores them for the editor to process into JSON format
    """
    start_time = datetime.now(timezone.utc)
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
        db_start_time = datetime.now(timezone.utc)

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            db_connect_duration = (
                datetime.now(timezone.utc) - db_start_time
            ).total_seconds() * 1000
            logger.log_db_operation("connect", "brews", db_connect_duration)
        except Exception as e:
            logger.error("Failed to connect to database", error=e)
            return create_response(500, {"error": "Database connection failed"})

        # Retrieve brew and user data
        logger.info("Retrieving brew and user data")
        query_start_time = datetime.now(timezone.utc)

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
        query_duration = (
            datetime.now(timezone.utc) - query_start_time
        ).total_seconds() * 1000
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

        delivery_time = format_time_ampm(str(delivery_time))

        user_name = f"{first_name} {last_name}"

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
            user_timezone=brew_timezone,
            topics_count=len(topics_list),
        )

        # Calculate temporal context - database dates are UTC, convert to user timezone
        if last_sent_date:
            # Database datetime is UTC, convert directly to user timezone
            last_sent_user_tz = last_sent_date.replace(tzinfo=pytz.UTC).astimezone(
                user_tz
            )
            temporal_context = f"{last_sent_user_tz.strftime('%Y-%m-%d %H:%M %Z')} to {now.strftime('%Y-%m-%d %H:%M %Z')}"
        else:
            temporal_context = "past 3 days"

        # Get previous articles for context (avoid duplicates)
        logger.info("Retrieving previous articles for context")
        prev_articles_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            SELECT cc.raw_articles, bf.sent_at
            FROM time_brew.briefings bf
            JOIN time_brew.curation_cache cc ON bf.id = cc.briefing_id
            WHERE bf.user_id = %s AND bf.execution_status = 'dispatched' AND bf.sent_at IS NOT NULL
            ORDER BY bf.sent_at DESC
            LIMIT 5
            """,
            (user_id,),
        )

        prev_articles_duration = (
            datetime.now(timezone.utc) - prev_articles_start_time
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
                            "url": article.get("url", ""),
                            "sent_date": (
                                sent_at.strftime("%Y-%m-%d") if sent_at else "Unknown"
                            ),
                            "source": article.get("source", ""),
                        }
                    )

        # Get user feedback for personalization
        logger.info("Retrieving user feedback for personalization")
        feedback_start_time = datetime.now(timezone.utc)

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
            datetime.now(timezone.utc) - feedback_start_time
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

        # Build NO-GO LIST from previous articles
        no_go_list = ""
        if previous_articles:
            no_go_list = "Do not repeat these headlines/events:\n"
            for i, article in enumerate(previous_articles[:10], 1):
                no_go_list += f'{i}. "{article["headline"]}"\n'
        else:
            no_go_list = "No previous articles to avoid."

        # Build AI prompt using the exact tested template
        prompt = f"""# MISSION (MUST)
Return **3–8** distinct news stories for "{brew_name}" briefing that focuses on these topics- {brew_focus_topics_str}.

# CONTEXT
- Reader: {user_name}
- Current local time: {now.strftime('%Y-%m-%d %H:%M %Z')}
- Time window: {temporal_context}
- Scheduled delivery: {delivery_time}

# NO-GO LIST (MUST NOT)
{no_go_list}

# DIVERSITY RULES (MUST)
1. Max one story per company / organization.
2. Use at least 3 different reputable publishers.  
3. Cover user's interests and topics.
4. No duplicate events or announcements.

# QUALITY CRITERIA (SHOULD)
- Published within the specified window.
- Clear real-world impact.
- Well-known, reputable source.
- Never news aggregators or news summarizers, NEVER.

# SLOW-DAY RULE (MUST)
If you cannot find even **3** qualified stories:
- Use `"curator_notes"` to provide details on whats trending trending reference to past articles, landscape, what is going on, why potentially lead to no or less news! The more details you provide, the better the editor can write, and articulate.

# OUTPUT FORMAT (MUST)
{{
    "articles": [
        {{
        "headline": "Article Title",
        "summary": "3-4 sentences summary on the article covering it end-to-end",
        "source": "Source of the original article",
        "published_time": "Relative article published time",
        "relevance": "Why is this story relevant for the {user_name}, and any other notes for the editor.",
        "url": "Actual working url to the original article"
        }}
    ],
    "curator_notes": "Brief insight about today's content landscape - availability, challenges, or trends you noticed. Anything to provide the Editor a good writing grounds!"
}}

# SELF-CHECK BEFORE RESPONDING
✓ 3–8 articles, **or** or detailed curator_notes for SLOW-DAY RULE
✓ Look into a wide variety of news articles and pick only ones worth nothing based on {user_name}'s interests
✓ No duplicate companies / events
✓ JSON parses without error
✓ Be sure to follow the time window- {temporal_context}

BEGIN JSON:"""

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
        api_start_time = datetime.now(timezone.utc)

        try:
            ai_response_data = ai_service.call(
                provider,
                prompt=prompt,
                model=model,
                temperature=0.2,
                max_tokens=4000,
                timeout=60,
            )
            content = ai_response_data["content"]
            api_duration = (
                datetime.now(timezone.utc) - api_start_time
            ).total_seconds() * 1000

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
            api_duration = (
                datetime.now(timezone.utc) - api_start_time
            ).total_seconds() * 1000
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

        # Log raw LLM response immediately to ensure we have it even if parsing fails
        logger.info("Logging raw LLM response to curation cache")
        cache_id = None
        try:
            cursor.execute(
                """
                INSERT INTO time_brew.curation_cache 
                (briefing_id, raw_articles, topics_searched, articles_found, 
                 collector_prompt, raw_llm_response, curator_notes, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """,
                (
                    None,  # briefing_id will be null initially
                    json.dumps([]),  # empty articles array initially
                    topics_list,
                    0,  # articles_found will be 0 initially
                    prompt,
                    content,  # raw_llm_response logged immediately
                    "Raw response logged before parsing",  # curator_notes
                    datetime.now(timezone.utc),
                ),
            )
            cache_id = cursor.fetchone()[0]
            conn.commit()  # Commit immediately to ensure it's saved
            logger.info(
                "Raw LLM response successfully logged to curation cache",
                cache_id=cache_id,
            )
        except Exception as cache_error:
            logger.error(
                "Failed to log raw LLM response to cache", error=str(cache_error)
            )
            raise Exception(
                f"Critical failure: Unable to log raw LLM response to database: {str(cache_error)}"
            )

        # Parse AI response
        logger.info("Parsing articles from AI response")
        try:
            response_data = ai_service.parse_json_from_response(content)
        except ValueError as e:
            logger.error("Failed to parse JSON from AI response", error=e)
            raise Exception(str(e))

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
        briefing_insert_start_time = datetime.now(timezone.utc)

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
                datetime.now(timezone.utc),
            ),
        )

        briefing_id = cursor.fetchone()[0]
        briefing_insert_duration = (
            datetime.now(timezone.utc) - briefing_insert_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "insert",
            "briefings",
            briefing_insert_duration,
            briefing_id=briefing_id,
            article_count=len(articles),
        )

        # Update curation cache with parsed articles and briefing_id
        logger.info("Updating curation cache with parsed articles", cache_id=cache_id)
        cache_update_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            UPDATE time_brew.curation_cache 
            SET briefing_id = %s, raw_articles = %s, articles_found = %s, curator_notes = %s
            WHERE id = %s
        """,
            (
                briefing_id,
                json.dumps(articles),
                len(articles),
                curator_notes,
                cache_id,
            ),
        )

        cache_update_duration = (
            datetime.now(timezone.utc) - cache_update_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "update",
            "curation_cache",
            cache_update_duration,
            briefing_id=briefing_id,
            cache_id=cache_id,
            articles_stored=len(articles),
        )

        # Commit transaction
        commit_start_time = datetime.now(timezone.utc)
        conn.commit()
        commit_duration = (
            datetime.now(timezone.utc) - commit_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "commit", "briefings", commit_duration, records_affected=2
        )

        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = datetime.now(timezone.utc)
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
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()
        logger.log_request_end("ai/news_collector", 500, processing_time * 1000)

        raise e
