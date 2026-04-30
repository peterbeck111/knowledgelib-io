# Input:  Database query that may fail
# Output: Query result or fallback
import pybreaker  # >=1.2.0
import psycopg2

# Custom listener for monitoring
class MonitorListener(pybreaker.CircuitBreakerListener):
    def state_change(self, cb, old_state, new_state):
        print(f"[CB] {cb.name}: {old_state.name} -> {new_state.name}")

    def failure(self, cb, exc):
        print(f"[CB] {cb.name}: failure - {exc}")

db_breaker = pybreaker.CircuitBreaker(
    fail_max=5,             # open after 5 failures
    reset_timeout=30,       # half-open after 30s
    exclude=[ValueError],   # don't count validation errors
    listeners=[MonitorListener()],
    name="postgres-primary",
)

@db_breaker
def get_user(user_id: str) -> dict:
    conn = psycopg2.connect("host=db.example.com dbname=app")
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cur.fetchone()

# Usage with fallback
try:
    user = get_user("user-123")
except pybreaker.CircuitBreakerError:
    user = {"id": "user-123", "cached": True}  # fallback
