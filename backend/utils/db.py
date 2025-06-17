import psycopg2
import os
from typing import Optional

def get_db_connection():
    """Create database connection using environment variables"""
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        port=os.environ['DB_PORT'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD']
    )

def test_db_connection() -> bool:
    """Test if database connection works"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT 1')
        conn.close()
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False