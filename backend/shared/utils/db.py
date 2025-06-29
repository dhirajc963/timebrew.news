import psycopg2
import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone


def get_db_connection():
    """Create database connection using environment variables"""
    print(f"[DB_CONNECTION] Creating database connection")
    
    try:
        conn = psycopg2.connect(
            host=os.environ["DB_HOST"],
            port=os.environ["DB_PORT"],
            database=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
        )
        print(f"[DB_CONNECTION] Database connection successful")
        return conn
    except Exception as e:
        print(f"[DB_CONNECTION] ERROR: Failed to create database connection: {str(e)}")
        import traceback
        print(f"[DB_CONNECTION] ERROR: Traceback: {traceback.format_exc()}")
        raise


def test_db_connection() -> bool:
    """Test if database connection works"""
    print(f"[DB_CONNECTION] Testing database connection")
    try:
        conn = get_db_connection()
        print(f"[DB_CONNECTION] Connection established, testing query")
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
            print(f"[DB_CONNECTION] Test query result: {result}")
        conn.close()
        print(f"[DB_CONNECTION] Database connection test successful")
        return True
    except Exception as e:
        print(f"[DB_CONNECTION] ERROR: Database connection test failed: {e}")
        import traceback
        print(f"[DB_CONNECTION] ERROR: Traceback: {traceback.format_exc()}")
        return False
