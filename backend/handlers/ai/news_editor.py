import os
import json
import time
import os
import psycopg2
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
    Uses the new run_tracker and editor_logs schema
    """
    start_time = time.time()  # Use time.time() for precise millisecond calculation
    logger.log_request_start(event, context, "ai/news_editor")

    conn = None
    run_id = None

    try:
        # Extract run_id from event
        run_id = event.get("run_id")
        if not run_id:
            logger.error("News editor failed: missing run_id in event")
            return create_response(400, {"error": "run_id is required"})

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

        # Retrieve run tracker and associated data
        logger.info("Retrieving run tracker and associated data")
        query_start_time = datetime.now(timezone.utc)

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
        query_duration = (
            datetime.now(timezone.utc) - query_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select", "run_tracker", query_duration, table_join="brews,users"
        )

        if not run_data:
            logger.warn("Run not found for provided run_id")
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

        if stage != "editor":
            logger.warn(
                "Invalid run stage",
                run_id=run_id,
                current_stage=stage,
                expected_stage="editor",
            )
            return create_response(
                400,
                {"error": f"Run stage is {stage}, expected editor"},
            )

        # Set context with user and run information
        logger.set_context(
            user_id=user_id, user_email=email, run_id=run_id, brew_id=brew_id
        )

        user_name = f"{first_name} {last_name}"
        delivery_time = format_time_ampm(str(delivery_time))

        # Retrieve raw articles and curator notes from curator_logs
        logger.info("Retrieving articles from curator logs")
        try:
            cursor.execute(
                """
                SELECT id, raw_articles, topics_searched, search_timeframe, 
                    article_count, prompt_used, raw_llm_response, curator_notes, user_id, 
                    runtime_ms, created_at
                FROM time_brew.curator_logs 
                WHERE run_id = %s
                """,
                (run_id,),
            )
            row = cursor.fetchone()
            if not row:
                logger.error("No curator log found for run_id", run_id=run_id)
                return create_response(
                    404,
                    {"error": f"No curator log found for run_id {run_id}"},
                )

            curator_log = {
                "id": str(row[0]),
                "raw_articles": (
                    json.loads(row[1]) if isinstance(row[1], str) else row[1]
                ),
                "topics_searched": row[2],
                "search_timeframe": row[3],
                "article_count": row[4],
                "prompt_used": row[5],
                "raw_llm_response": row[6],
                "curator_notes": row[7] or "",
                "user_id": str(row[8]),
                "runtime_ms": row[9],
                "created_at": row[10],
            }

            raw_articles = curator_log["raw_articles"]
            curator_notes = curator_log["curator_notes"]

            logger.info(
                "Curator log retrieved successfully",
                run_id=run_id,
                articles_count=len(raw_articles) if raw_articles else 0,
            )

        except Exception as curator_error:
            logger.error("Failed to retrieve curator log", error=str(curator_error))
            return create_response(500, {"error": "Failed to retrieve curator data"})

        # Fetch past editorial drafts for this brew to maintain consistency
        logger.info("Fetching past editorial drafts for context")
        past_drafts_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            SELECT el.raw_llm_response, rt.updated_at
            FROM time_brew.run_tracker rt
            JOIN time_brew.editor_logs el ON rt.run_id = el.run_id
            WHERE rt.brew_id = %s AND rt.current_stage = 'completed' AND el.raw_llm_response IS NOT NULL
            ORDER BY rt.updated_at DESC
            LIMIT 1
        """,
            (brew_id,),
        )

        past_drafts_duration = (
            datetime.now(timezone.utc) - past_drafts_start_time
        ).total_seconds() * 1000
        logger.log_db_operation(
            "select",
            "run_tracker",
            past_drafts_duration,
            table_join="editor_logs",
            brew_id=brew_id,
            limit=1,
        )

        # Fetch and format past editorial draft for context
        past_context_str = ""
        if result := cursor.fetchone():
            prior_draft, completed_at = result
            if prior_draft:
                past_context_str = f"""
                Following was delivered on {completed_at.strftime('%Y-%m-%d %H:%M')}:
                {prior_draft}

                Use this to ensure freshness and avoid repetition.
                """.strip()

        # raw_articles and curator_notes are already retrieved from curator_log above
        if isinstance(raw_articles, str):
            raw_articles = json.loads(raw_articles)
        # raw_articles is already a list if it came from the database properly

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

            # Calculate runtime for editor operation
            editor_runtime_ms = int((time.time() - start_time) * 1000)

            # Store raw AI response immediately in editor_logs
            logger.info("Storing raw AI response in editor logs")
            try:
                cursor.execute(
                    """
                    INSERT INTO time_brew.editor_logs 
                    (run_id, user_id, brew_id, prompt_used, raw_llm_response, editorial_content, email_sent, email_sent_time, runtime_ms)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (run_id, user_id, brew_id, prompt, ai_response, None, False, None, editor_runtime_ms),
                )
                log_id = str(cursor.fetchone()[0])
                conn.commit()
                logger.info(
                    "Raw AI response stored in editor logs",
                    run_id=run_id,
                    log_id=log_id,
                    runtime_ms=editor_runtime_ms,
                )
            except Exception as log_error:
                logger.error(
                    "Failed to store raw AI response in editor logs",
                    error=str(log_error),
                )
                raise Exception(
                    f"Critical failure: Unable to store raw AI response: {str(log_error)}"
                )
            # No need to log this operation as it's handled by insert_editor_log
            # Transaction will be committed after final updates

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

        # Update editor_logs with the parsed draft and update run_tracker stage
        logger.info("Updating editor logs with structured content")
        final_update_start_time = time.time()

        try:
            # Update editor_logs with parsed editorial content
            cursor.execute(
                """
                UPDATE time_brew.editor_logs 
                SET editorial_content = %s
                WHERE run_id = %s
                """,
                (json.dumps(editor_draft), run_id),
            )

            # Update run_tracker to dispatcher stage
            cursor.execute(
                """
                UPDATE time_brew.run_tracker 
                SET current_stage = %s, updated_at = CURRENT_TIMESTAMP
                WHERE run_id = %s
                """,
                ("dispatcher", run_id),
            )

            final_update_duration = int((time.time() - final_update_start_time) * 1000)
            logger.log_db_operation(
                "update",
                "editor_logs, run_tracker",
                final_update_duration,
                run_id=run_id,
                status="dispatcher",
            )

        except Exception as update_error:
            logger.error(
                "Failed to update editor logs and run tracker", error=str(update_error)
            )
            raise Exception(
                f"Critical failure: Unable to update editor completion: {str(update_error)}"
            )

        # Commit transaction and close connections
        commit_start_time = time.time()
        conn.commit()
        commit_duration = int((time.time() - commit_start_time) * 1000)
        logger.log_db_operation(
            "commit", "editor_logs, run_tracker", commit_duration, records_affected=2
        )

        cursor.close()
        conn.close()
        logger.info("Database connections closed successfully")

        # Calculate processing time
        end_time = time.time()
        processing_time = end_time - start_time

        logger.info(
            "Content creation completed successfully",
            run_id=run_id,
            processing_time_seconds=round(processing_time, 2),
            articles_created=len(editor_draft["articles"]),
            brew_name=brew_name,
        )

        logger.log_request_end("ai/news_editor", 200, processing_time * 1000)

        return {
            "statusCode": 200,
            "body": {
                "message": "Briefing content created successfully",
                "run_id": run_id,
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

        # Update run_tracker to failed state if run_id exists
        try:
            if "run_id" in locals() and run_id:
                # Create new connection for error handling since main connection may be corrupted
                error_conn = get_db_connection()
                error_cursor = error_conn.cursor()

                # Set failed_stage to 'editor' since this handler failed
                error_cursor.execute(
                    """
                    UPDATE time_brew.run_tracker 
                    SET current_stage = %s, failed_stage = %s, error_message = %s, 
                        updated_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
                    WHERE run_id = %s
                    """,
                    ("failed", "editor", str(e), run_id),
                )
                error_conn.commit()
                error_cursor.close()
                error_conn.close()
                logger.info("Updated run tracker to failed state", run_id=run_id)
        except Exception as tracker_error:
            logger.error(
                "Failed to update run tracker to failed state", error=tracker_error
            )

        # Cleanup database connection on error
        try:
            if "conn" in locals():
                conn.rollback()
                conn.close()
                logger.info("Database connection rolled back and closed due to error")
        except Exception as cleanup_error:
            logger.error("Failed to cleanup database connection", error=cleanup_error)

        # Calculate processing time for error response
        end_time = time.time()
        processing_time = end_time - start_time
        logger.log_request_end("ai/news_editor", 500, processing_time * 1000)

        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
