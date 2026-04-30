# Input:  Python app using pyodbc for SQL Server
# Output: Same app using psycopg for PostgreSQL

import psycopg
from contextlib import contextmanager

# BEFORE: SQL Server with pyodbc
# conn_str = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=sqlhost;DATABASE=mydb;UID=sa;PWD=pass"
# conn = pyodbc.connect(conn_str)
# cursor.execute("SELECT TOP 10 * FROM users WHERE status = ?", ('active',))

# AFTER: PostgreSQL with psycopg 3
DATABASE_URL = "postgresql://pguser:pgpass@pghost:5432/mydb"

@contextmanager
def get_connection():
    """Context manager for database connections with auto-cleanup."""
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_active_users(limit: int = 10) -> list[dict]:
    """Fetch active users — note PostgreSQL syntax differences."""
    with get_connection() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            # TOP N → LIMIT N, ? → %s for positional params
            cur.execute(
                "SELECT * FROM users WHERE status = %s ORDER BY created_at DESC LIMIT %s",
                ("active", limit)
            )
            return cur.fetchall()

def upsert_user(user_id: int, name: str, email: str) -> int:
    """Insert or update a user — uses PostgreSQL ON CONFLICT instead of MERGE."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            # SQL Server MERGE → PostgreSQL INSERT ... ON CONFLICT
            cur.execute("""
                INSERT INTO users (user_id, name, email, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    updated_at = NOW()
                RETURNING user_id
            """, (user_id, name, email))
            return cur.fetchone()[0]
