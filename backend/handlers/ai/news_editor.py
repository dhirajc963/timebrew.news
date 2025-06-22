import os
import json
from datetime import datetime, timezone
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.text_utils import format_list_simple
from utils.ai_service import ai_service
from utils.other_utils import format_time_ampm
from utils.logger import logger


def lambda_handler(event, context):
    """
    News Editor Lambda Function
    Creates structured JSON content for TimeBrew briefings using AI
    Focuses purely on editorial voice and content creation
    """
    start_time = datetime.now(timezone.utc)
    logger.log_request_start(event, context, "ai/news_editor")

    try:
        # Extract briefing_id from event
        briefing_id = event.get("briefing_id")
        if not briefing_id:
            logger.error("News editor failed: missing briefing_id in event")
            return create_response(400, {"error": "briefing_id is required"})

        # Get database connection
        logger.info("Connecting to database for briefing data retrieval")
        db_start_time = datetime.now(timezone.utc)

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            db_connect_duration = (
                datetime.now(timezone.utc) - db_start_time
            ).total_seconds() * 1000
            logger.log_db_operation("connect", "briefings", db_connect_duration)
        except Exception as e:
            logger.error("Failed to connect to database", error=e)
            return create_response(500, {"error": "Database connection failed"})

        # Retrieve briefing and associated data
        logger.info("Retrieving briefing and associated data")
        query_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            SELECT bf.id, bf.brew_id, bf.user_id, bf.execution_status,
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
        query_duration = (
            datetime.now(timezone.utc) - query_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select", "briefings", query_duration, table_join="brews,users"
        )

        if not briefing_data:
            logger.warn("Briefing not found for provided briefing_id")
            cursor.close()
            conn.close()
            return create_response(404, {"error": "Briefing not found"})

        (
            briefing_id,
            brew_id,
            user_id,
            execution_status,
            brew_name,
            topics,
            delivery_time,
            brew_timezone,
            email,
            first_name,
            last_name,
        ) = briefing_data

        if execution_status != "curated":
            logger.warn(
                "Invalid briefing status",
                briefing_id=briefing_id,
                current_status=execution_status,
                expected_status="curated",
            )
            return create_response(
                400,
                {"error": f"Briefing status is {execution_status}, expected curated"},
            )

        # Set context with user and briefing information
        logger.set_context(
            user_id=user_id, user_email=email, briefing_id=briefing_id, brew_id=brew_id
        )

        user_name = f"{first_name} {last_name}"
        delivery_time = format_time_ampm(str(delivery_time))

        # Retrieve raw articles and curator notes from curation_cache
        logger.info("Retrieving articles from curation cache")
        cache_query_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            SELECT raw_articles, curator_notes
            FROM time_brew.curation_cache
            WHERE briefing_id = %s
        """,
            (briefing_id,),
        )

        cache_result = cursor.fetchone()
        cache_query_duration = (
            datetime.now(timezone.utc) - cache_query_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select", "curation_cache", cache_query_duration, briefing_id=briefing_id
        )

        if not cache_result:
            logger.error("No articles found in curation cache", briefing_id=briefing_id)
            return create_response(
                404,
                {
                    "error": f"No articles found in curation cache, was looking for {briefing_id}"
                },
            )

        # Fetch past editorial drafts for this brew to maintain consistency
        logger.info("Fetching past editorial drafts for context")
        past_drafts_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            SELECT editor_draft, sent_at
            FROM time_brew.briefings
            WHERE brew_id = %s AND editor_draft IS NOT NULL
            ORDER BY sent_at DESC
            LIMIT 1
        """,
            (brew_id,),
        )

        past_drafts_duration = (
            datetime.now(timezone.utc) - past_drafts_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select", "briefings", past_drafts_duration, brew_id=brew_id, limit=1
        )

        # Fetch and format past editorial draft for context
        past_context_str = ""
        if result := cursor.fetchone():
            prior_draft, sent_at = result
            if prior_draft:
                past_context_str = f"""
                Following was delivered on {sent_at.strftime('%Y-%m-%d %H:%M')}:
                {prior_draft}

                Use this to ensure freshness and avoid repetition.
                """.strip()

        raw_articles_data, curator_notes = cache_result
        if isinstance(raw_articles_data, str):
            raw_articles = json.loads(raw_articles_data)
        else:
            raw_articles = raw_articles_data

        # Get user timezone for personalization
        user_tz = pytz.timezone(brew_timezone)
        now = datetime.now(user_tz)

        # Parse topics JSON if it exists
        if isinstance(topics, str):
            topics_list = json.loads(topics)
        else:
            topics_list = topics

        topics_str = format_list_simple(topics_list)

        # Prepare articles text for AI processing
        if raw_articles:
            articles_text = "\n\n".join(
                [
                    f"Article {i+1}:\n"
                    f"Headline: {article['headline']}\n"
                    f"Summary: {article['summary']}\n"
                    f"Source: {article['source']}\n"
                    f"Published: {article['published_time']}\n"
                    f"URL: {article.get('url', 'N/A')}\n"
                    f"Relevance: {article['relevance']}"
                    for i, article in enumerate(raw_articles)
                ]
            )
        else:
            articles_text = (
                "No articles found by curator - create valuable content anyway"
            )

        prompt = f"""# TASK
You are the lead editor for TimeBrew, channeling that signature newsletter wit and obsession with impact. You're creating {user_name}'s "{brew_name}" briefing for {delivery_time} delivery.

# THE TIMEBREW VOICE
- **Your smartest, funniest friend explaining the news** - the one who makes complex stuff click with perfect analogies
- **Obsessed with "So what?"** 
- **Balanced cultural references**
- **Insider knowledge, casual delivery**

# WRITING FORMULA (without explicit labels)
1. Hook — why should I care?  
2. What happened? (concise facts)  
3. Impact — money, life, future, bigger picture  
4. Sticky takeaway (one-liner)
5. Transitions — Find nice ways to transition from one story to another and dont start are the article the same exact way!

# HUMOR DOs / DON'Ts
✅ Smart observation: "It's like Spotify for logistics."  
✅ Relatable metaphor: "Playing economic Jenga."  
❌ Forced pun: "It's a real game-changer!"  
❌ Inside-baseball jargon.

# ORDER BY "HOLY-SMOKES" FACTOR based on {user_name}'s preference
1. Breaking news that changes everything  
2. Major shifts in {topics_str}  
3. Trends that will matter in six months  
4. "Huh, that's fascinating" nuggets

# CONTEXT
- Reader: {user_name} (cares about {topics_str})  
- Local vibe: {brew_timezone} • {now.strftime('%A, %B %d at %I:%M %p')}  
*Curator note*: {curator_notes if curator_notes and curator_notes.strip() else "Standard curation day"}

# OUTPUT FORMAT (MUST)
{{
    "subject": "Short inbox-stopping subject here",
    "intro": "Personal, energetic greeting for {user_name}.",
    "articles": [
        {{
        "headline": "Hooky headline",
        "story_content": "One–three sentences: impact → what → meaning → takeaway. **(without explicit labels)**",
        "original_url": "https://...",
        "source": "Publication name or 'TimeBrew Analysis'",
        "published_time": "e.g., '4 h ago', 'yesterday'",
        "type": "news" | "analysis" | "trend" | "education"
        }}
    ],
    "outro": "Send-off that leaves the reader smarter and smiling."
}}

# SOURCE MATERIAL
{articles_text}

# SELF-CHECK BEFORE RESPONDING
✓ Article count vs. day-type rule followed  
✓ Each story answers the four writing-formula questions  
✓ No duplicate companies or events  
✓ Output is valid JSON (no markdown)  

BEGIN JSON:"""

        # Load AI model configuration
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "ai_models.json",
        )
        with open(config_path, "r") as f:
            ai_models = json.load(f)

        editor_config = ai_models["editor"]
        provider = editor_config["provider"]
        model = editor_config["model"]

        # Call AI API using the configured service
        logger.info(f"Preparing {provider.title()} API call for content creation")
        api_start_time = datetime.now(timezone.utc)

        try:
            ai_response_data = ai_service.call(
                provider,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert newsletter editor who creates engaging, Morning Brew-style briefings. You MUST respond with ONLY a valid JSON object using the exact structure provided. CRITICAL: Your response MUST start with { and end with }. Output ONLY valid JSON - no explanations, no markdown, no extra text.",
                    },
                    {"role": "user", "content": prompt},
                ],
                model=model,
                temperature=0.7,
                max_tokens=3000,
            )
            ai_response = ai_response_data["content"]
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

            logger.info(
                "Received response from AI editor",
                response_length=len(ai_response),
                content_preview=(
                    ai_response[:200] + "..." if len(ai_response) > 200 else ai_response
                ),
            )

            # Store raw AI response immediately for debugging purposes
            logger.info("Storing raw AI response in database")
            update_start_time = datetime.now(timezone.utc)

            cursor.execute(
                """
                UPDATE time_brew.briefings 
                SET raw_ai_response = %s,
                    updated_at = %s
                WHERE id = %s
            """,
                (
                    ai_response,
                    datetime.now(timezone.utc),
                    briefing_id,
                ),
            )

            update_duration = (
                datetime.now(timezone.utc) - update_start_time
            ).total_seconds() * 1000
            logger.log_db_operation(
                "update", "briefings", update_duration, briefing_id=briefing_id
            )

            conn.commit()

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

        # Parse the JSON response
        try:
            editor_draft = ai_service.parse_json_from_response(ai_response)

            # Validate required keys
            required_keys = ["intro", "articles", "outro"]
            for key in required_keys:
                if key not in editor_draft:
                    raise Exception(f"Missing required key: {key}")

            # Validate articles structure
            if not isinstance(editor_draft["articles"], list):
                raise Exception("Articles must be a list")

            for i, article in enumerate(editor_draft["articles"]):
                required_article_keys = ["headline", "story_content", "source"]
                for key in required_article_keys:
                    if key not in article:
                        raise Exception(f"Article {i+1} missing required key: {key}")

        except (ValueError, Exception) as e:
            logger.error(
                "Failed to parse or validate AI response",
                error=e,
                content_preview=ai_response[:500],
            )
            raise Exception(f"Failed to process AI response: {str(e)}")

        # Update briefing with the structured content
        logger.info("Updating briefing with structured content")
        final_update_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            UPDATE time_brew.briefings 
            SET execution_status = 'edited',
                editor_draft = %s,
                editor_prompt = %s,
                updated_at = %s
            WHERE id = %s
        """,
            (
                json.dumps(editor_draft),
                prompt,
                datetime.now(timezone.utc),
                briefing_id,
            ),
        )

        final_update_duration = (
            datetime.now(timezone.utc) - final_update_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "update",
            "briefings",
            final_update_duration,
            briefing_id=briefing_id,
            status="edited",
        )

        # Commit transaction and close connections
        commit_start_time = datetime.now(timezone.utc)
        conn.commit()
        commit_duration = (
            datetime.now(timezone.utc) - commit_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "commit", "briefings", commit_duration, records_affected=1
        )

        cursor.close()
        conn.close()
        logger.info("Database connections closed successfully")

        # Calculate processing time
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

        logger.info(
            "Content creation completed successfully",
            briefing_id=briefing_id,
            processing_time_seconds=round(processing_time, 2),
            articles_created=len(editor_draft["articles"]),
            brew_name=brew_name,
        )

        logger.log_request_end("ai/news_editor", 200, processing_time * 1000)

        return {
            "statusCode": 200,
            "body": {
                "message": "Briefing content created successfully",
                "briefing_id": briefing_id,
                "user_name": user_name,
                "brew_name": brew_name,
                "articles_created": len(editor_draft["articles"]),
                "curator_notes": curator_notes,
                "intro_preview": (
                    editor_draft["intro"][:100] + "..."
                    if len(editor_draft["intro"]) > 100
                    else editor_draft["intro"]
                ),
                "processing_time_seconds": round(processing_time, 2),
                "editor_draft": editor_draft,  # Include full content for debugging
            },
        }

    except Exception as e:
        logger.error("News editor failed: unexpected error", error=e)

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
        logger.log_request_end("ai/news_editor", 500, processing_time * 1000)

        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
