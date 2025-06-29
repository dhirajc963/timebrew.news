from handlers.base import BaseHandler
from middleware.auth import validate_ownership
from db.queries import OptimizedQueries


class BriefingsGetHandler(BaseHandler):
    def process_authenticated_request(self):
        # Get and validate parameters
        brew_id, error = self.get_query_param("brew_id", required=True)
        if error:
            return error
        
        # Validate ownership
        error = self.validate_ownership_required("brew", brew_id)
        if error:
            return error
        
        # Get pagination parameters
        limit, _ = self.get_query_param("limit", default="20")
        offset, _ = self.get_query_param("offset", default="0")
        
        try:
            limit = min(max(int(limit), 1), 100)
            offset = max(int(offset), 0)
        except ValueError:
            return self.error_response(400, "Invalid pagination parameters")
        
        # Get briefings using optimized query
        try:
            rows = OptimizedQueries.get_briefings_for_user(
                self.user_data["id"], brew_id, limit, offset
            )
            
            total_count = rows[0][5] if rows else 0
            briefings = []
            
            for row in rows:
                run_id, editorial_content, email_sent, email_sent_time, created_at, _, editorial_id = row
                
                article_count = 0
                if editorial_content and "articles" in editorial_content:
                    article_count = len(editorial_content["articles"])
                
                briefings.append({
                    "id": run_id,
                    "editorial_id": editorial_id,
                    "brew_id": brew_id,
                    "user_id": self.user_data["id"],
                    "editor_draft": editorial_content,
                    "sent_at": email_sent_time.isoformat() if email_sent_time else None,
                    "article_count": article_count,
                    "delivery_status": "sent" if email_sent else "pending",
                    "created_at": created_at.isoformat() if created_at else None,
                })
            
            return self.success_response({
                "briefings": briefings,
                "total_count": total_count
            })
            
        except Exception:
            return self.error_response(500, "Failed to retrieve briefings")


def lambda_handler(event, context):
    return BriefingsGetHandler(event, context).handle_auth_required()
