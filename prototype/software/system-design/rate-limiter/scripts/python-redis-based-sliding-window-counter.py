# Input:  client_key (str), max_requests (int), window_seconds (int)
# Output: (allowed: bool, remaining: int, retry_after: int)
# Requires: redis>=5.0.0

import time
import redis

# Sliding window counter — Cloudflare approach [src2]
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local curr_window = tostring(math.floor(now / window) * window)
local prev_window = tostring(tonumber(curr_window) - window)

local curr_key = key .. ':' .. curr_window
local prev_key = key .. ':' .. prev_window

local prev_count = tonumber(redis.call('GET', prev_key) or '0')
local curr_count = tonumber(redis.call('GET', curr_key) or '0')

local elapsed = now - tonumber(curr_window)
local weight = (window - elapsed) / window
local estimated = math.floor(prev_count * weight) + curr_count

if estimated >= limit then
    local retry_after = window - elapsed
    return {0, 0, retry_after}
end

redis.call('INCR', curr_key)
redis.call('EXPIRE', curr_key, window * 2)

local remaining = limit - estimated - 1
return {1, remaining, 0}
"""

class SlidingWindowRateLimiter:
    def __init__(self, redis_url="redis://localhost:6379"):
        self.r = redis.from_url(redis_url, decode_responses=True)
        self._script_sha = self.r.script_load(SLIDING_WINDOW_LUA)

    def is_allowed(self, client_key, max_requests=100, window_seconds=60):
        """Check if request is allowed. Returns (allowed, remaining, retry_after)."""
        now = time.time()
        try:
            result = self.r.evalsha(
                self._script_sha, 1,
                f"rl:{client_key}", max_requests, window_seconds, now
            )
            return bool(result[0]), int(result[1]), int(result[2])
        except redis.ConnectionError:
            # Fail-open: allow request when Redis is down
            return True, -1, 0
