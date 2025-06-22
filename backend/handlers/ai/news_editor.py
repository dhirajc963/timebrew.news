import os
import json
from datetime import datetime, timezone
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.text_utils import format_list_simple
from utils.ai_service import ai_service
from utils.other_utils import format_time_ampm


def lambda_handler(event, context):
    """
    News Editor Lambda Function
    Creates structured JSON content for TimeBrew briefings using AI
    Focuses purely on editorial voice and content creation
    """
    start_time = datetime.now(timezone.utc)
    try:
        # Extract briefing_id from event
        briefing_id = event.get("briefing_id")
        if not briefing_id:
            return create_response(400, {"error": "briefing_id is required"})

        # Get database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Retrieve briefing and associated data
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
        if not briefing_data:
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
            return create_response(
                400,
                {"error": f"Briefing status is {execution_status}, expected curated"},
            )

        user_name = f"{first_name} {last_name}"
        delivery_time = format_time_ampm(str(delivery_time))

        # Retrieve raw articles and curator notes from curation_cache
        cursor.execute(
            """
            SELECT raw_articles, curator_notes
            FROM time_brew.curation_cache
            WHERE briefing_id = %s
        """,
            (briefing_id,),
        )

        cache_result = cursor.fetchone()
        if not cache_result:
            return create_response(
                404,
                {
                    "error": f"No articles found in curation cache, was looking for {briefing_id}"
                },
            )

        # Fetch past editorial drafts for this brew to maintain consistency
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

        prompt = f"""You are the lead editor for TimeBrew, channeling the exact voice and style of Morning Brew's newsletter. You're creating content for {user_name}'s "{brew_name}" briefing, delivering at {delivery_time}.

# THE MORNING BREW VOICE
- **Like talking to your smartest friend over coffee** - conversational, witty, but never trying too hard
- **Make complex stuff simple** - use analogies, metaphors, and relatable comparisons  
- **Always answer "So what?"** - explain WHY each story matters, not just what happened
- **Connect dots** - show how stories relate to bigger trends and your reader's life
- **Smart humor** - clever observations, not forced jokes or puns
- **Millennial energy** - culturally aware but professional

# WRITING PRINCIPLES
1. **Lead with impact**: Start each story with WHY it matters
2. **Use the "Netflix analogy" approach**: Compare complex topics to familiar things
3. **Build narrative threads**: Connect stories to show larger patterns  
4. **Write conversationally**: Short sentences, active voice, natural flow
5. **End with memory**: Close with something that sticks

# STORY STRUCTURE (for each article)
- **Hook**: 1-2 sentences on why this matters NOW
- **What happened**: The facts, but make them interesting
- **The bigger picture**: What this means for trends/future/reader
- **The bottom line**: One clear takeaway

# TONE EXAMPLES
❌ "Apple announced new AI features"
✅ "Apple just made your iPhone smarter than your college roommate"

❌ "The Federal Reserve is considering rate changes"  
✅ "The Fed is playing economic Jenga with interest rates again"

❌ "This is important for investors"
✅ "Translation: your portfolio is about to get interesting"

# CONTENT STRATEGY
Arrange articles by priority:
1. **Breaking/urgent news** that affects everyone
2. **High-impact stories** with broad implications  
3. **Industry-specific** developments for this user
4. **Interesting/educational** content that adds value

# BRIEFING CONTEXT
- **Delivery time**: {delivery_time} (set tone accordingly - morning = energizing, evening = wrap-up)
- **User**: {user_name}
- **Focus areas**: {topics_str}
- **Location**: {brew_timezone}
- **Current moment**: {now.strftime('%Y-%m-%d %H:%M %Z')}

# EDITORIAL GUIDANCE
Adapt your approach based on the source material:

- **5-8 articles**: Focus on ordering and relevance - curate the best stories
- **3-4 articles**: Create a more educational briefing, extracting deeper value from each piece
- **1-2 articles**: Write analytically, using your expertise to provide broader context
- **No articles**: Write an original TimeBrew analysis piece about market trends, what a slow news day means, or connect to previous events

{f"**Curator insight**: {curator_notes}" if curator_notes and curator_notes.strip() else ""}

{past_context_str}

# OUTPUT FORMAT
Return ONLY a valid JSON object with this exact structure:

{{
    "subject": "A short catchy subject line for the briefing",
    "intro": "Personal greeting that sets the tone - mention the user's name and briefing focus",
    "articles": [
        {{
        "headline": "TimeBrew-style catchy headline that hooks the reader",
        "story_content": "2-3 paragraph story in Morning Brew voice. Include the hook, what happened, bigger picture, and bottom line.", 
        "original_url": "source URL if from real article, or null if original content",
        "source": "Publication name or 'TimeBrew Analysis' for original content",
        "published_time": "Original publish time or current time for original content",
        "relevance_score": 8.5,
        "type": "news or analysis or trend or education"
        }}
    ],
    "outro": "Engaging sign-off that feels personal and on-brand"
}}

# SOURCE MATERIAL FROM CURATOR
{articles_text}

Create engaging editorial content that makes {user_name} think "This person gets it." Order by importance and relevance.

Return ONLY the JSON object, no other text."""

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

            # Store raw AI response immediately for debugging purposes
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
            conn.commit()

        except Exception as e:
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

        conn.commit()
        cursor.close()
        conn.close()

        # Calculate processing time
        end_time = datetime.now(timezone.utc)
        processing_time = (end_time - start_time).total_seconds()

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
        logger.error("An unexpected error occurred in news_editor", error=str(e))
        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
