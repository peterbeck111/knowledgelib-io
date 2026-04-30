# Input:  A cache key and a callable that fetches from the database
# Output: Cached value from fastest available layer

import redis
import json
from cachetools import TTLCache
from threading import Lock

class MultiLayerCache:
    def __init__(self, redis_url="redis://localhost:6379",
                 l1_maxsize=1000, l1_ttl=60, l2_ttl=300):
        self.l1 = TTLCache(maxsize=l1_maxsize, ttl=l1_ttl)
        self.l1_lock = Lock()
        self.l2 = redis.from_url(redis_url, decode_responses=True)
        self.l2_ttl = l2_ttl
        self.stats = {"l1_hit": 0, "l2_hit": 0, "miss": 0}

    def get(self, key: str, fetch_fn=None):
        # L1: in-process (~0.1ms)
        with self.l1_lock:
            val = self.l1.get(key)
        if val is not None:
            self.stats["l1_hit"] += 1
            return val

        # L2: Redis (~1-5ms)
        raw = self.l2.get(f"c:{key}")
        if raw:
            val = json.loads(raw)
            with self.l1_lock:
                self.l1[key] = val
            self.stats["l2_hit"] += 1
            return val

        # Miss: fetch from source
        if fetch_fn:
            val = fetch_fn(key)
            if val is not None:
                self.set(key, val)
            self.stats["miss"] += 1
            return val
        return None

    def set(self, key: str, value):
        with self.l1_lock:
            self.l1[key] = value
        self.l2.setex(f"c:{key}", self.l2_ttl, json.dumps(value))

    def invalidate(self, key: str):
        with self.l1_lock:
            self.l1.pop(key, None)
        self.l2.delete(f"c:{key}")

# Usage:
cache = MultiLayerCache(redis_url="redis://redis:6379")
user = cache.get("user:123", fetch_fn=lambda k: db.get_user(k.split(":")[1]))
