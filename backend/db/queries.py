"""Optimized database queries - eliminates query duplication and improves performance."""
from utils.db import get_db_connection


class OptimizedQueries:
    """Centralized, optimized database queries using prepared statements."""
    
    @staticmethod
    def get_briefings_for_user(user_id, brew_id, limit=20, offset=0):
        """Single optimized query for briefings listing - replaces 3 separate queries."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    run_id, editorial_content, email_sent, email_sent_time, created_at,
                    COUNT(*) OVER() as total_count, id as editorial_id
                FROM time_brew.editor_logs
                WHERE user_id = %s AND brew_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (user_id, brew_id, limit, offset))
            
            return cursor.fetchall()
        finally:
            conn.close()
    
    @staticmethod
    def get_briefing_by_id(user_id, run_id):
        """Single JOIN query for briefing details - replaces 3 separate queries."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    el.run_id, el.brew_id, el.editorial_content, el.email_sent, 
                    el.email_sent_time, el.created_at,
                    u.email, u.first_name, u.last_name,
                    b.delivery_time, b.last_sent_date
                FROM time_brew.editor_logs el
                JOIN time_brew.users u ON el.user_id = u.id
                JOIN time_brew.brews b ON el.brew_id = b.id
                WHERE el.run_id = %s AND el.user_id = %s
            """, (run_id, user_id))
            
            return cursor.fetchone()
        finally:
            conn.close()
    
    @staticmethod
    def get_user_brews(user_id):
        """Optimized brew listing with briefing counts."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    b.id, b.name, b.topics, b.delivery_time, b.created_at, b.is_active,
                    COALESCE(COUNT(el.run_id) FILTER (WHERE el.email_sent = true), 0) as briefings_sent
                FROM time_brew.brews b
                LEFT JOIN time_brew.editor_logs el ON b.id = el.brew_id
                WHERE b.user_id = %s 
                GROUP BY b.id, b.name, b.topics, b.delivery_time, b.created_at, b.is_active
                ORDER BY b.created_at DESC
            """, (user_id,))
            
            return cursor.fetchall()
        finally:
            conn.close()
    
    @staticmethod
    def get_feedback_status(user_id, editorial_id):
        """Get feedback status for a specific editorial (briefing) by editorial_id."""
        print(f"[DB] get_feedback_status called: user_id={user_id}, editorial_id={editorial_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get article count from editorial_content and all feedback
            print(f"[DB] Executing feedback status query")
            cursor.execute("""
                SELECT 
                    COALESCE(
                        jsonb_array_length(el.editorial_content->'articles'), 0
                    ) as article_count,
                    array_agg(
                        json_build_object(
                            'position', uf.article_position,
                            'feedback', uf.feedback_type,
                            'title', uf.article_title,
                            'source', uf.article_source
                        ) ORDER BY uf.article_position NULLS FIRST
                    ) FILTER (WHERE uf.id IS NOT NULL) as feedback_data
                FROM time_brew.editor_logs el
                LEFT JOIN time_brew.user_feedback uf ON el.id = uf.editorial_id AND uf.user_id = %s
                WHERE el.id = %s
                GROUP BY el.editorial_content
            """, (user_id, editorial_id))
            
            result = cursor.fetchone()
            print(f"[DB] get_feedback_status query result: {result}")
            return result
        except Exception as e:
            print(f"[DB] ERROR in get_feedback_status: {str(e)}")
            import traceback
            print(f"[DB] ERROR: Traceback: {traceback.format_exc()}")
            raise
        finally:
            print(f"[DB] Closing connection for get_feedback_status")
            conn.close()
    
    @staticmethod
    def submit_feedback(user_id, editorial_id, feedback_type, article_position=None, 
                       source_url=None, article_title=None, article_source=None):
        """Optimized feedback submission with editorial_id and toggle logic."""
        print(f"[DB] submit_feedback called with: user_id={user_id}, editorial_id={editorial_id}, feedback_type={feedback_type}, article_position={article_position}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Check for existing feedback on this editorial/article position
            print(f"[DB] Checking for existing feedback...")
            cursor.execute("""
                SELECT id, feedback_type FROM time_brew.user_feedback
                WHERE editorial_id = %s AND user_id = %s AND 
                      (article_position = %s OR (article_position IS NULL AND %s IS NULL))
            """, (editorial_id, user_id, article_position, article_position))
            
            existing = cursor.fetchone()
            print(f"[DB] Existing feedback found: {existing}")
            
            if existing:
                existing_id, existing_type = existing
                print(f"[DB] Found existing feedback: id={existing_id}, type={existing_type}")
                
                if existing_type == feedback_type:
                    # Toggle off - delete same feedback
                    print(f"[DB] Deleting existing feedback (toggle off): id={existing_id}")
                    cursor.execute("DELETE FROM time_brew.user_feedback WHERE id = %s", (existing_id,))
                    conn.commit()
                    print(f"[DB] Feedback deleted successfully")
                    return None, "removed"
                else:
                    # Update to different feedback type
                    print(f"[DB] Updating feedback type from {existing_type} to {feedback_type}")
                    cursor.execute("""
                        UPDATE time_brew.user_feedback 
                        SET feedback_type = %s, created_at = NOW()
                        WHERE id = %s RETURNING id
                    """, (feedback_type, existing_id))
                    feedback_id = cursor.fetchone()[0]
                    conn.commit()
                    print(f"[DB] Feedback updated successfully: feedback_id={feedback_id}")
                    return feedback_id, "updated"
            else:
                # Insert new feedback
                print(f"[DB] Inserting new feedback record")
                cursor.execute("""
                    INSERT INTO time_brew.user_feedback
                    (user_id, editorial_id, feedback_type, article_position, 
                     source_url, article_title, article_source, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW()) RETURNING id
                """, (user_id, editorial_id, feedback_type, article_position, 
                      source_url, article_title, article_source))
                feedback_id = cursor.fetchone()[0]
                conn.commit()
                print(f"[DB] New feedback inserted successfully: feedback_id={feedback_id}")
                return feedback_id, "submitted"
                
        except Exception as e:
            print(f"[DB] ERROR: Exception in submit_feedback: {str(e)}")
            print(f"[DB] ERROR: Exception type: {type(e).__name__}")
            import traceback
            print(f"[DB] ERROR: Traceback: {traceback.format_exc()}")
            conn.rollback()
            raise e
        finally:
            print(f"[DB] Closing database connection")
            conn.close()
    
    @staticmethod
    def create_brew(user_id, name, topics, delivery_time):
        """Simplified brew creation."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO time_brew.brews (user_id, name, topics, delivery_time, created_at)
                VALUES (%s, %s, %s, %s, NOW()) RETURNING id
            """, (user_id, name, topics, delivery_time))
            
            brew_id = cursor.fetchone()[0]
            conn.commit()
            return brew_id
        finally:
            conn.close()
    
    @staticmethod
    def get_scheduled_brews():
        """Optimized scheduler query for active brews."""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT b.id, b.user_id, b.delivery_time, b.last_sent_date,
                       u.timezone, u.email
                FROM time_brew.brews b
                JOIN time_brew.users u ON b.user_id = u.id
                WHERE b.is_active = true AND u.is_active = true
            """)
            
            return cursor.fetchall()
        finally:
            conn.close()