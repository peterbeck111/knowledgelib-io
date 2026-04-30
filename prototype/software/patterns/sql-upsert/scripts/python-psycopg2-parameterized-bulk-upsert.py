# Input:  List of (email, name, count) tuples
# Output: All rows upserted atomically with parameters

import psycopg2
from psycopg2.extras import execute_values

conn = psycopg2.connect("dbname=mydb")
cur = conn.cursor()

data = [
    ("alice@example.com", "Alice", 1),
    ("bob@example.com", "Bob", 1),
]

execute_values(
    cur,
    """
    INSERT INTO users (email, display_name, login_count, last_login)
    VALUES %s
    ON CONFLICT (email)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      login_count  = users.login_count + 1,
      last_login   = NOW()
    """,
    [(e, n, c, ) for e, n, c in data],
    template="(%s, %s, %s, NOW())",
)
conn.commit()
