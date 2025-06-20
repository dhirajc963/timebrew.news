import os
import json
from datetime import datetime
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.text_utils import format_list_simple
import openai


def lambda_handler(event, context):
    """
    News Editor Lambda Function
    Formats collected articles into a Morning Brew-style briefing using OpenAI
    """
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
            SELECT bf.id, bf.brew_id, bf.user_id, bf.article_count, bf.execution_status,
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
            article_count,
            execution_status,
            brew_name,
            topics,
            delivery_time,
            brew_timezone,
            email,
            first_name,
            last_name,
        ) = briefing_data

        if execution_status != "processing":
            return create_response(
                400,
                {
                    "error": f"Briefing status is {execution_status}, expected processing"
                },
            )

        # Determine briefing type and build user name
        delivery_hour = delivery_time.hour
        briefing_type = "morning" if delivery_hour < 12 else "evening"
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "there"
        )

        # Retrieve raw articles from curation_cache
        cursor.execute(
            """
            SELECT raw_articles
            FROM time_brew.curation_cache
            WHERE briefing_id = %s
        """,
            (briefing_id,),
        )

        cache_result = cursor.fetchone()
        if not cache_result:
            return create_response(
                404, {"error": "No articles found in curation cache"}
            )

        raw_articles_data = cache_result[0]
        if isinstance(raw_articles_data, str):
            raw_articles = json.loads(raw_articles_data)
        else:
            raw_articles = raw_articles_data

        # Add position to each article for reference
        for i, article in enumerate(raw_articles):
            article["position"] = i + 1

        if not raw_articles:
            return create_response(400, {"error": "No articles found for briefing"})

        # Get user timezone for personalization
        user_tz = pytz.timezone(brew_timezone)
        now = datetime.now(user_tz)

        # Construct OpenAI prompt for formatting
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

        topics_str = format_list_simple(topics_list)

        prompt = f"""
        You are the lead editor for TimeBrew, channeling the exact voice and style of Morning Brew's newsletter. You're writing {user_name}'s personalized {briefing_type} briefing.

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
        4. **Write scannable**: Use formatting that works for busy readers
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

        # {briefing_type.upper()} BRIEFING SPECIFICS
        {"Morning briefings: Set the tone for the day ahead. Focus on 'Here's what you need to know before your first meeting' energy." if briefing_type == "morning" else "Evening briefings: Wrap up the day's chaos. Focus on 'Here's what actually mattered today' energy."}

        # FORMATTING REQUIREMENTS
        - **Subject line**: Specific, curious, benefit-driven (not generic)
        - **Opening**: Personal greeting + one-liner about the day/briefing
        - **Transitions**: Smooth bridges between unrelated stories
        - **Closing**: Memorable sign-off that feels personal

        # PERSONALIZATION CONTEXT
        User Profile:
        - Name: {user_name}
        - Briefing Name: {brew_name}
        - Focus Areas: {topics_str}
        - Location Context: {brew_timezone}
        - Current Moment: {now.strftime('%A, %B %d, %Y at %I:%M %p %Z')}

        # YOUR MISSION
        Transform these raw articles into a briefing that makes {user_name} think "This person gets it" while keeping them informed on {topics_str}.

        Raw Articles:
        {articles_text}

        # OUTPUT REQUIREMENTS
        Return valid JSON with enhanced structure:
        {{
            "subject_line": "Specific, benefit-driven subject line (not 'Your briefing for...')",
            "html_content": "Full HTML with proper email formatting and inline CSS and clear separation where applicable"
        }}

        Remember: You're not just summarizing news - you're being {user_name}'s smart friend who helps them understand what actually matters.
        """

        # Call OpenAI API
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        if not openai_api_key:
            raise Exception("OPENAI_API_KEY not found in environment variables")

        client = openai.OpenAI(api_key=openai_api_key)

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert newsletter editor who creates engaging, Morning Brew-style briefings. Always respond with valid JSON containing subject_line and html_content fields.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=3000,
        )

        ai_response = response.choices[0].message.content

        # Truncate prompt and response for storage (similar to news_collector)
        truncated_prompt = prompt[:5000] if len(prompt) > 5000 else prompt
        truncated_ai_response = (
            ai_response[:5000] if len(ai_response) > 5000 else ai_response
        )

        # Parse the JSON response
        try:
            # Extract JSON from the response
            start_idx = ai_response.find("{")
            end_idx = ai_response.rfind("}") + 1
            if start_idx != -1 and end_idx != 0:
                json_str = ai_response[start_idx:end_idx]
                formatted_content = json.loads(json_str)
            else:
                # Fallback: try to parse the entire content
                formatted_content = json.loads(ai_response)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw AI response: {ai_response}")
            raise Exception("Failed to parse formatted content from AI response")

        subject_line = formatted_content.get(
            "subject_line", f'Your TimeBrew for {now.strftime("%B %d")}'
        )
        html_content = formatted_content.get("html_content", "")

        if not html_content:
            raise Exception("No HTML content generated by AI")

        # Update briefing with formatted content
        cursor.execute(
            """
            UPDATE time_brew.briefings 
            SET execution_status = 'completed',
                subject_line = %s,
                html_content = %s,
                editor_prompt = %s,
                raw_ai_response = %s,
                updated_at = now()
            WHERE id = %s
        """,
            (
                subject_line,
                html_content,
                truncated_prompt,
                truncated_ai_response,
                briefing_id,
            ),
        )

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "statusCode": 200,
            "body": {
                "briefing_id": briefing_id,
                "subject_line": subject_line,
                "content_length": len(html_content),
                "message": "Briefing formatted successfully",
            },
        }

    except Exception as e:
        print(f"Error in news_editor: {str(e)}")
        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
