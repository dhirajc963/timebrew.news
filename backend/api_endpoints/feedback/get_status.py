from shared.base import BaseHandler
from shared.db.queries import OptimizedQueries
import traceback


class FeedbackStatusHandler(BaseHandler):
    def process_authenticated_request(self):
        print(f"[FEEDBACK_STATUS] Starting feedback status request for user: {self.user_data['id']}")
        
        # Get editorial_id from path
        editorial_id, error = self.get_path_param("id")
        print(f"[FEEDBACK_STATUS] Editorial ID: {editorial_id}")
        if error:
            print(f"[FEEDBACK_STATUS] ERROR: Failed to get editorial_id from path: {error}")
            return error
        
        # Validate ownership
        print(f"[FEEDBACK_STATUS] Validating ownership for editorial: {editorial_id}")
        error = self.validate_ownership_required("editorial", editorial_id)
        if error:
            print(f"[FEEDBACK_STATUS] ERROR: Ownership validation failed: {error}")
            return error
        print(f"[FEEDBACK_STATUS] Ownership validation successful")
        
        try:
            # Get feedback status using optimized query
            print(f"[FEEDBACK_STATUS] Querying feedback status from database")
            result = OptimizedQueries.get_feedback_status(self.user_data["id"], editorial_id)
            print(f"[FEEDBACK_STATUS] Database query result: {result is not None}")
            
            if not result:
                print(f"[FEEDBACK_STATUS] ERROR: Editorial content not found")
                return self.error_response(404, "Editorial content not found")

            article_count, feedback_data = result
            print(f"[FEEDBACK_STATUS] Article count: {article_count}, Feedback data count: {len(feedback_data) if feedback_data else 0}")
            
            # Process feedback data - separate overall vs article feedback
            print(f"[FEEDBACK_STATUS] Processing feedback data")
            overall_feedback = None
            articles = []
            feedback_map = {}
            
            if feedback_data:
                print(f"[FEEDBACK_STATUS] Processing {len(feedback_data)} feedback entries")
                for feedback in feedback_data:
                    position = feedback["position"]
                    if position is None:
                        # Overall briefing feedback
                        print(f"[FEEDBACK_STATUS] Found overall feedback: {feedback['feedback']}")
                        overall_feedback = feedback["feedback"]
                    else:
                        # Article feedback
                        print(f"[FEEDBACK_STATUS] Found article feedback at position {position}: {feedback['feedback']}")
                        feedback_map[position] = feedback
            else:
                print(f"[FEEDBACK_STATUS] No feedback data found")
            
            # Build articles array with all positions (0-based indexing)
            print(f"[FEEDBACK_STATUS] Building articles array for {article_count} articles")
            for position in range(article_count):
                article_feedback = feedback_map.get(position, {})
                articles.append({
                    "position": position,
                    "feedback": article_feedback.get("feedback"),
                    "title": article_feedback.get("title"),
                    "source": article_feedback.get("source"),
                })
            
            print(f"[FEEDBACK_STATUS] Successfully processed feedback status")
            return self.success_response({
                "editorial_id": editorial_id,
                "overall_feedback": overall_feedback,
                "articles": articles,
            })
            
        except Exception as e:
            print(f"[FEEDBACK_STATUS] ERROR: Exception occurred: {str(e)}")
            print(f"[FEEDBACK_STATUS] ERROR: Traceback: {traceback.format_exc()}")
            return self.error_response(500, "Failed to get feedback status")


def lambda_handler(event, context):
    return FeedbackStatusHandler(event, context).handle_auth_required()