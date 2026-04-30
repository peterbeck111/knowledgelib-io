# Input:  PostgreSQL connection, flag configs in flags table
# Output: Boolean flag evaluation with user targeting

import hashlib
from typing import Optional
import psycopg2  # psycopg2-binary==2.9.x

class FeatureFlagService:
    def __init__(self, dsn: str):
        self.conn = psycopg2.connect(dsn)
        self._cache: dict = {}

    def is_enabled(
        self, flag_key: str, user_id: str, fallback: bool = False
    ) -> bool:
        try:
            config = self._get_config(flag_key)
            if not config or not config["enabled"]:
                return False
            # Check user override
            overrides = config.get("overrides", {})
            if user_id in overrides:
                return overrides[user_id]
            # Percentage rollout with stable hashing
            pct = config.get("percentage", 100)
            if pct < 100:
                h = hashlib.md5(f"{flag_key}:{user_id}".encode()).hexdigest()
                bucket = int(h[:8], 16) % 100
                return bucket < pct
            return True
        except Exception as e:
            print(f"Flag {flag_key} eval failed: {e}")
            return fallback

    def _get_config(self, flag_key: str) -> Optional[dict]:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT config FROM flags WHERE key = %s", (flag_key,)
            )
            row = cur.fetchone()
            return row[0] if row else None
