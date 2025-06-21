import os
import json
from datetime import datetime
import pytz
from utils.db import get_db_connection
from utils.response import create_response
from utils.text_utils import format_list_simple
from utils.ai_service import ai_service
import json
import os


def lambda_handler(event, context):
    """
    News Editor Lambda Function
    Formats collected articles into a Morning Brew-style briefing using OpenAI
    Now adapts strategy based on curator notes and variable article counts
    """
    start_time = datetime.utcnow()
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

        if execution_status != "curated":
            return create_response(
                400,
                {"error": f"Briefing status is {execution_status}, expected curated"},
            )

        # Determine briefing type and build user name
        delivery_hour = delivery_time.hour
        briefing_type = "morning" if delivery_hour < 12 else "evening"
        user_name = (
            f"{first_name} {last_name}"
            if first_name and last_name
            else first_name or "there"
        )

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
                404, {"error": "No articles found in curation cache"}
            )

        raw_articles_data, curator_notes = cache_result
        if isinstance(raw_articles_data, str):
            raw_articles = json.loads(raw_articles_data)
        else:
            raw_articles = raw_articles_data

        # Add position to each article for reference
        for i, article in enumerate(raw_articles):
            article["position"] = i + 1

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

        # Determine content strategy based on curator notes and article count
        article_count_actual = len(raw_articles)

        # Build curator context and strategy guidance
        curator_context = ""
        content_strategy = ""

        if curator_notes and curator_notes.strip():
            curator_context = f"""
# CURATOR INSIGHTS
Your news curator provided this context: "{curator_notes}"

Use this insight to adapt your approach appropriately.
"""

            # Provide strategy guidance based on common curator note patterns
            if "limited" in curator_notes.lower() or "slow" in curator_notes.lower():
                content_strategy = """
**ADAPTED STRATEGY - Limited News Day:**
- Go deeper on each story with more analysis and context
- Connect stories to bigger trends and implications  
- Add "what this means" and "looking ahead" perspectives
- Use a more analytical, thoughtful tone
- Explain WHY the quiet news cycle might be significant
"""
            elif "rich" in curator_notes.lower() or "diverse" in curator_notes.lower():
                content_strategy = """
**ADAPTED STRATEGY - Rich News Day:**
- Keep articles punchy and scannable
- Focus on key takeaways and immediate impacts
- Use dynamic, energetic pacing
- Highlight the variety and significance of developments
"""
            else:
                content_strategy = """
**BALANCED STRATEGY:**
- Mix quick hits with deeper insights
- Balance breaking news with analysis
- Maintain engaging, conversational flow
"""
        else:
            content_strategy = """
**STANDARD STRATEGY:**
- Balance breaking news with insightful analysis
- Keep content engaging and scannable
- Focus on practical implications for the reader
"""

        # Article count context
        if article_count_actual <= 3:
            article_strategy = "With fewer articles today, dive deeper into each story and provide richer context and analysis."
        elif article_count_actual >= 6:
            article_strategy = "With more stories to cover, keep each article punchy while maintaining depth."
        else:
            article_strategy = (
                "Perfect article count for balanced coverage with good depth."
            )

        prompt = f"""
        You are the lead editor for TimeBrew, channeling the exact voice and style of Morning Brew's newsletter. You're preparing {user_name}'s "{brew_name}" briefing for delivery at {delivery_hour:02d}:00 {brew_timezone}.

        {curator_context}

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

        {content_strategy}

        # ARTICLE COUNT STRATEGY
        **Today's Article Count: {article_count_actual} articles**
        {article_strategy}

        # VISUAL FORMATTING REQUIREMENTS
        Use this exact CSS foundation for all emails:

        <!-- Base Email Structure -->
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px;">
            <!-- Header -->
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e9ecef; margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 600; color: #1a252f; margin: 0;">Your {brew_name} • {now.strftime('%A, %B %d')}</h1>
            </div>
            
            <!-- Personal Greeting -->
            <div style="margin-bottom: 24px;">
                <p style="font-size: 16px; line-height: 1.6; color: #2c3e50; margin: 0;">Good morning, {first_name}! Here are today’s top stories in {topics_str}…</p>
            </div>
            
            <!-- Repeat this block for each article -->
            <div style="padding: 20px; margin: 16px 0; border: 1px solid #e9ecef; border-radius: 8px;">
                <!-- SOURCE and TIME AGO -->
                <div style="font-size: 14px; color: #6c757d; margin-bottom: 8px; font-weight: 500;">
                    [SOURCE] • [TIME AGO]
                </div>
                <!-- HEADLINE -->
                <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1a252f; line-height: 1.4;">
                    [HEADLINE]
                </h3>
                <!-- SUMMARY / CONTENT -->
                <p style="margin: 0 0 16px 0; line-height: 1.6; color: #2c3e50; font-size: 16px;">
                    [STORY CONTENT]
                </p>
                <!-- READ MORE LINK -->
                <a href="[URL]" style="color: #3498db; text-decoration: none; font-weight: 500; font-size: 15px;">
                    Read the full story →
                </a>
            </div>
            <!-- End story card -->

            <!-- Sign-off -->
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                <p style="font-size: 16px; line-height: 1.6; color: #2c3e50; margin: 0;">Any custom sign off message!</p>
                <p style="font-size: 14px; color: #6c757d; margin: 8px 0 0 0;">Your TimeBrew Team</p>
            </div>
        </div>


        **Typography Rules:**
        - Body text: 16px, line-height: 1.6, color: #2c3e50
        - Headers: 18px (only 2px bigger), font-weight: 600, color: #1a252f
        - Metadata: 14px, color: #6c757d
        - Links: color: #3498db, font-weight: 500

        **Visual Formatting Examples:**
        ❌ Large headers: <h1 style="font-size: 24px;">Breaking News</h1>
        ✅ Proper headers: <h3 style="font-size: 18px; font-weight: 600;">Breaking News</h3>

        ❌ Plain text blocks with no spacing
        ✅ Story cards with backgrounds and proper padding

        ❌ Generic "Read more" links
        ✅ Contextual links: "Read the full story →" or "Get the details →"

        # {briefing_type.upper()} BRIEFING SPECIFICS
        {"Morning briefings: Set the tone for the day ahead. Focus on 'Here's what you need to know before your first meeting' energy." if briefing_type == "morning" else "Evening briefings: Wrap up the day's chaos. Focus on 'Here's what actually mattered today' energy."}

        # FORMATTING REQUIREMENTS
        - **Email Structure**: Clean, card-based layout with consistent spacing using the exact templates above
        - **Typography**: Headers only 2px larger than body text (18px vs 16px), use font-weight for emphasis
        - **Story Cards**: Each article MUST use the story card template with background and padding
        - **Visual Hierarchy**: Source info → Headline → Summary → Read more link
        - **Brand Feel**: Professional but friendly, like a premium newsletter
        - **Mobile-First**: 600px max width, proper padding for mobile readability
        - **Consistency**: Use the exact CSS values provided - don't deviate from colors, spacing, or sizing

        # PERSONALIZATION CONTEXT
        User Profile:
        - Name: {user_name}
        - Briefing Name: {brew_name}
        - Focus Areas: {topics_str}
        - Location Context: {brew_timezone}
        - Current Moment: {now.strftime('%A, %B %d, %Y at %I:%M %p %Z')}

        # YOUR MISSION
        Transform these {article_count_actual} articles into a briefing that makes {user_name} think "This person gets it" while keeping them informed on {topics_str}. Use the exact HTML structure and CSS provided above.

        # CURATOR INSIGHTS INTEGRATION
        {f"Your curator noted: '{curator_notes}' - weave this insight naturally into your editorial approach." if curator_notes and curator_notes.strip() else "Use standard editorial approach for today's briefing."}

        Raw Articles:
        {articles_text}

        # OUTPUT REQUIREMENTS
        Return your response using XML-like tags for easier parsing. This format is more reliable than JSON for HTML content:
        
        <email_subject>
        Your specific, benefit-driven subject line (not 'Your briefing for...')
        </email_subject>
        
        <email_content>
        Full HTML using the exact structure and CSS templates provided above. Include the complete email with header, greeting, story cards, and sign-off.
        </email_content>
        
        Do not include any other text outside these tags.

        Remember: You're not just summarizing news - you're being {user_name}'s smart friend who helps them understand what actually matters. Use the visual formatting religiously - every story must be in a card, every element must use the specified styles. Adapt your editorial approach based on the curator's insights about today's content landscape.
        """

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
                        "content": "You are an expert newsletter editor who creates engaging, Morning Brew-style briefings with professional visual formatting. You adapt your editorial strategy based on curator insights about content availability and news landscape. You MUST respond using XML-like tags: <email_subject>subject here</email_subject> and <email_content>Pure HTML content, without any ``` marks</email_content>. Use the exact HTML structure and CSS provided in the prompt. Do not include any other text outside these tags.",
                    },
                    {"role": "user", "content": prompt},
                ],
                model=model,
                temperature=0.7,
                max_tokens=3000,
            )
            ai_response = ai_response_data["content"]
        except Exception as e:
            raise Exception(f"{provider.title()} API error: {str(e)}")

        # Truncate prompt and response for storage (similar to news_collector)
        truncated_prompt = prompt[:5000] if len(prompt) > 5000 else prompt
        truncated_ai_response = (
            ai_response[:5000] if len(ai_response) > 5000 else ai_response
        )

        # Parse the XML-tagged response (much more reliable than JSON for HTML content)
        import re

        try:
            # Extract subject using XML tags
            subject_match = re.search(
                r"<email_subject>\s*(.+?)\s*</email_subject>", ai_response, re.DOTALL
            )
            content_match = re.search(
                r"<email_content>\s*(.+?)\s*</email_content>", ai_response, re.DOTALL
            )

            if subject_match and content_match:
                subject_line = subject_match.group(1).strip()
                html_content = content_match.group(1).strip()

                formatted_content = {
                    "subject_line": subject_line,
                    "html_content": html_content,
                }
            else:
                # Fallback: try to find the content even if tags are malformed
                print("XML tags not found, attempting fallback extraction")

                # Look for subject line patterns
                subject_patterns = [
                    r"<email_subject>(.+?)</email_subject>",
                    r"Subject:\s*(.+?)\n",
                    r'subject_line["\']?\s*:\s*["\'](.+?)["\']',
                ]

                subject_line = None
                for pattern in subject_patterns:
                    match = re.search(pattern, ai_response, re.DOTALL | re.IGNORECASE)
                    if match:
                        subject_line = match.group(1).strip()
                        break

                # Look for HTML content patterns
                content_patterns = [
                    r"<email_content>(.+?)</email_content>",
                    r"<html[^>]*>(.+?)</html>",
                    r'html_content["\']?\s*:\s*["\'](.+?)["\']',
                ]

                html_content = None
                for pattern in content_patterns:
                    match = re.search(pattern, ai_response, re.DOTALL | re.IGNORECASE)
                    if match:
                        html_content = match.group(1).strip()
                        break

                if subject_line and html_content:
                    formatted_content = {
                        "subject_line": subject_line,
                        "html_content": html_content,
                    }
                else:
                    raise Exception(
                        "Could not extract content using any parsing method"
                    )

        except Exception as e:
            print(f"XML parsing error: {e}")
            print(f"Raw AI response (first 1000 chars): {ai_response[:1000]}")
            print(f"Raw AI response (last 500 chars): {ai_response[-500:]}")

            # Re-raise the exception instead of providing a fallback
            print(f"Failed to parse AI response after all attempts: {str(e)}")
            raise

        subject_line = formatted_content.get("subject_line")
        html_content = formatted_content.get("html_content")

        if not html_content or not subject_line:
            raise Exception("No HTML content generated by AI")

        # Update briefing with formatted content
        cursor.execute(
            """
            UPDATE time_brew.briefings 
            SET execution_status = 'edited',
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

        # Calculate processing time
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()

        return {
            "statusCode": 200,
            "body": {
                "message": "Briefing formatted successfully",
                "briefing_id": briefing_id,
                "user_name": user_name,
                "brew_name": brew_name,
                "briefing_type": briefing_type,
                "subject_line": subject_line,
                "content_length": len(html_content),
                "articles_processed": article_count_actual,
                "curator_notes": curator_notes,
                "ai_response_preview": str(ai_response)[:200],
                "processing_time_seconds": round(processing_time, 2),
            },
        }

    except Exception as e:
        print(f"Error in news_editor: {str(e)}")
        # Re-raise the exception to ensure Step Functions marks this as failed
        raise e
