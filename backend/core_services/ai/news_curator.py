import os
import json
import time
import os
import psycopg2
from datetime import datetime, timedelta, timezone
import pytz
from shared.utils.db import get_db_connection
from shared.utils.response import create_response
# from shared.utils.logger import logger  # Replaced with print statements
from shared.utils.ai_service import ai_service
from shared.utils.text_utils import format_list_with_quotes
from shared.utils.other_utils import format_time_ampm


def lambda_handler(event, context):
    """
    News Curator Lambda Function
    Collects articles from AI and stores them in the new curator_logs table
    """
    start_time = time.time()  # Use time.time() for precise millisecond calculation
    print(f"[NEWS_CURATOR] Request started: {event.get('brew_id', 'unknown')}")

    run_id = None
    conn = None

    try:
        # Extract and validate required parameters from event
        brew_id = event.get("brew_id")
        run_id = event.get("run_id")

        if not brew_id:
            print(f"[NEWS_CURATOR] ERROR: News collection failed: missing brew_id in event")
            return create_response(400, {"error": "brew_id is required"})

        if not run_id:
            print(f"[NEWS_CURATOR] ERROR: News collection failed: missing run_id in event")
            return create_response(400, {"error": "run_id is required"})

        print(f"[NEWS_CURATOR] Context set: brew_id={brew_id}, run_id={run_id}")

        # Get database connection
        print(f"[NEWS_CURATOR] Connecting to database for brew data retrieval")
        db_start_time = datetime.now(timezone.utc)

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            db_connect_duration = (
                datetime.now(timezone.utc) - db_start_time
            ).total_seconds() * 1000
            print(f"[NEWS_CURATOR] DB connection time: {db_connect_duration}ms")
        except Exception as e:
            print(f"[NEWS_CURATOR] ERROR: Failed to connect to database: {str(e)}")
            return create_response(500, {"error": "Database connection failed"})

        # Retrieve brew and user data
        print(f"[NEWS_CURATOR] Retrieving brew and user data")
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
        print(f"[NEWS_CURATOR] Brew query time: {query_duration}ms")

        if not brew_data:
            print(f"[NEWS_CURATOR] WARNING: Active brew not found for provided brew_id")
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

        print(f"[NEWS_CURATOR] Context updated: user_id={user_id}, email={email}, run_id={run_id}")

        # Validate that run_tracker exists and is in correct stage
        print(f"[NEWS_CURATOR] Validating run tracker state")
        try:
            cursor.execute(
                """
                SELECT current_stage FROM time_brew.run_tracker 
                WHERE run_id = %s AND brew_id = %s
                """,
                (run_id, brew_id),
            )
            result = cursor.fetchone()
            if not result:
                print(f"[NEWS_CURATOR] ERROR: Run tracker not found: run_id={run_id}, brew_id={brew_id}")
                cursor.close()
                conn.close()
                return create_response(400, {"error": "Invalid run_id or brew_id"})

            current_stage = result[0]
            if current_stage != "curator":
                print(f"[NEWS_CURATOR] ERROR: Invalid run tracker stage: current={current_stage}, expected=curator")
                cursor.close()
                conn.close()
                return create_response(
                    400, {"error": f"Invalid stage: {current_stage}, expected: curator"}
                )

            print(f"[NEWS_CURATOR] Run tracker validation successful: stage={current_stage}")
        except Exception as e:
            print(f"[NEWS_CURATOR] ERROR: Failed to validate run tracker: {str(e)}")
            cursor.close()
            conn.close()
            return create_response(500, {"error": "Failed to validate run tracker"})

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

        print(
            f"[NEWS_CURATOR] Brew configuration loaded: brew_name={brew_name}, user_timezone={brew_timezone}, topics_count={len(topics_list)}"
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
        print(f"[NEWS_CURATOR] Retrieving previous articles for context")
        prev_articles_start_time = datetime.now(timezone.utc)

        cursor.execute(
            """
            SELECT cl.raw_articles, rt.updated_at
            FROM time_brew.run_tracker rt
            JOIN time_brew.curator_logs cl ON rt.run_id = cl.run_id
            WHERE rt.user_id = %s AND rt.current_stage = 'completed' AND rt.updated_at IS NOT NULL
            ORDER BY rt.updated_at DESC
            LIMIT 5
            """,
            (user_id,),
        )

        prev_articles_duration = (
            datetime.now(timezone.utc) - prev_articles_start_time
        ).total_seconds() * 1000
        print(f"[NEWS_CURATOR] Previous articles query time: {prev_articles_duration}ms")

        # Process previous articles and build NO-GO LIST in one pass
        previous_articles = []
        no_go_items = []

        for row in cursor.fetchall():
            raw_articles, sent_at = row
            if raw_articles:
                if isinstance(raw_articles, str):
                    articles_data = json.loads(raw_articles)
                else:
                    articles_data = raw_articles

                for article in articles_data:
                    headline = article.get("headline", "")
                    url = article.get("url", "")
                    sent_date = sent_at.strftime("%Y-%m-%d") if sent_at else "Unknown"
                    source = article.get("source", "")

                    # Add to previous articles list
                    previous_articles.append(
                        {
                            "headline": headline,
                            "url": url,
                            "sent_date": sent_date,
                            "source": source,
                        }
                    )

                    # Add to no-go items
                    no_go_items.append(f'"{headline} ({url})"')

        # Get user feedback for personalization
        print(f"[NEWS_CURATOR] Retrieving user feedback for personalization")
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
        print(f"[NEWS_CURATOR] Feedback query time: {feedback_duration}ms")

        user_feedback = []
        for row in cursor.fetchall():
            feedback_type, article_position = row
            feedback_entry = {"type": feedback_type}
            if article_position:
                feedback_entry["article_position"] = article_position
            user_feedback.append(feedback_entry)

        # Format topics for prompt
        brew_focus_topics_str = format_list_with_quotes(topics_list)

        # Finalize NO-GO LIST
        if no_go_items:
            no_go_list = "Do not repeat these headlines/events:\n"
            for i, item in enumerate(no_go_items, 1):
                no_go_list += f"{i}. {item}\n"
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
✓ Look into a wide variety of news articles and pick only ones worth noting based on {user_name}'s interests
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

        print(f"[NEWS_CURATOR] Preparing {provider.title()} API call for article curation")
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

            print(f"[NEWS_CURATOR] {provider.title()} API call completed in {api_duration}ms")
        except Exception as e:
            api_duration = (
                datetime.now(timezone.utc) - api_start_time
            ).total_seconds() * 1000
            print(f"[NEWS_CURATOR] ERROR: {provider.title()} API request failed: {str(e)}, duration: {api_duration}ms")
            raise Exception(f"{provider.title()} API error: {str(e)}")

        print(
            f"[NEWS_CURATOR] Received response from AI curator: length={len(content)}, preview={content[:200] + '...' if len(content) > 200 else content}"
        )

        # Calculate runtime for curator operation
        curator_runtime_ms = int((time.time() - start_time) * 1000)

        # Log raw LLM response immediately to ensure we have it even if parsing fails
        print(f"[NEWS_CURATOR] Logging raw LLM response to curator logs")
        try:
            cursor.execute(
                """
                INSERT INTO time_brew.curator_logs 
                (run_id, raw_articles, topics_searched, search_timeframe, article_count, 
                 prompt_used, raw_llm_response, curator_notes, user_id, runtime_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    run_id,
                    json.dumps([]),
                    topics_list,
                    None,
                    0,
                    prompt,
                    content,
                    "",  # curator_notes will be updated after parsing
                    user_id,
                    curator_runtime_ms,
                ),
            )
            log_id = str(cursor.fetchone()[0])
            conn.commit()
            print(
                f"[NEWS_CURATOR] Raw LLM response successfully logged to curator logs: run_id={run_id}, log_id={log_id}, runtime_ms={curator_runtime_ms}"
            )
        except Exception as log_error:
            print(
                f"[NEWS_CURATOR] ERROR: Failed to log raw LLM response to curator logs: {str(log_error)}"
            )
            raise Exception(
                f"Critical failure: Unable to log raw LLM response to database: {str(log_error)}"
            )

        # Parse AI response
        print(f"[NEWS_CURATOR] Parsing articles from AI response")
        try:
            response_data = ai_service.parse_json_from_response(content)
        except ValueError as e:
            print(f"[NEWS_CURATOR] ERROR: Failed to parse JSON from AI response: {str(e)}")
            raise Exception(str(e))

        # Extract articles and curator notes
        articles = response_data.get("articles", [])
        curator_notes = response_data.get("curator_notes", "")

        print(
            f"[NEWS_CURATOR] Article curation completed: total_articles={len(articles)}, curator_notes_provided={bool(curator_notes.strip())}"
        )

        # Update curator log with final parsed articles
        print(f"[NEWS_CURATOR] Updating curator log with parsed articles")
        final_runtime_ms = int((time.time() - start_time) * 1000)

        try:
            # Update the curator log with final data
            cursor.execute(
                """
                UPDATE time_brew.curator_logs 
                SET raw_articles = %s, curator_notes = %s, runtime_ms = %s
                WHERE run_id = %s
            """,
                (
                    json.dumps(articles),
                    curator_notes,
                    final_runtime_ms,
                    run_id,
                ),
            )

            # Update run tracker to editor stage
            cursor.execute(
                """
                UPDATE time_brew.run_tracker 
                SET current_stage = %s, updated_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
                WHERE run_id = %s
                """,
                ("editor", run_id),
            )

            # Commit transaction
            conn.commit()

            print(
                f"[NEWS_CURATOR] Curator log updated successfully: run_id={run_id}, articles_stored={len(articles)}, final_runtime_ms={final_runtime_ms}"
            )

        except Exception as update_error:
            print(f"[NEWS_CURATOR] ERROR: Failed to update curator log: {str(update_error)}")
            raise Exception(
                f"Critical failure: Unable to update curator log: {str(update_error)}"
            )

        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = time.time()
        processing_time = end_time - start_time

        print(
            f"[NEWS_CURATOR] News collection completed successfully: run_id={run_id}, processing_time_seconds={round(processing_time, 2)}, articles_collected={len(articles)}, curator_notes={curator_notes}, temporal_context={temporal_context}, topics={topics_list}"
        )

        print(f"[NEWS_CURATOR] Request completed: ai/news_curator, status=200, duration={processing_time * 1000}ms")

        return {
            "statusCode": 200,
            "body": {
                "message": "Articles collected successfully",
                "run_id": run_id,
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
        print(f"[NEWS_CURATOR] ERROR: News collection failed: unexpected error: {str(e)}")

        # Update run tracker to failed state if we have a run_id
        if run_id:
            try:
                # Create new connection for error handling since main connection may be corrupted
                error_conn = get_db_connection()
                error_cursor = error_conn.cursor()

                # Set failed_stage to 'curator' since this handler failed
                error_cursor.execute(
                    """
                    UPDATE time_brew.run_tracker 
                    SET current_stage = %s, failed_stage = %s, error_message = %s, 
                        updated_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
                    WHERE run_id = %s
                    """,
                    ("failed", "curator", str(e), run_id),
                )
                error_conn.commit()
                error_cursor.close()
                error_conn.close()
                print(f"[NEWS_CURATOR] Run tracker updated to failed state: run_id={run_id}")
            except Exception as stage_error:
                print(
                    f"[NEWS_CURATOR] ERROR: Failed to update run tracker to failed state: {str(stage_error)}"
                )

        # Cleanup database connection on error
        try:
            if conn:
                conn.rollback()
                conn.close()
                print(f"[NEWS_CURATOR] Database connection rolled back and closed due to error")
        except Exception as cleanup_error:
            print(f"[NEWS_CURATOR] ERROR: Failed to cleanup database connection: {str(cleanup_error)}")

        # Calculate processing time for failed request
        end_time = time.time()
        processing_time = end_time - start_time
        print(f"[NEWS_CURATOR] Request failed: ai/news_curator, status=500, duration={processing_time * 1000}ms")

        raise e
