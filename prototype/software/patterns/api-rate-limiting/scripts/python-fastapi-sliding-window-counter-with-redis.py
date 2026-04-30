# Input:  HTTP request to any FastAPI route
# Output: 429 JSONResponse if rate limited, None if allowed
# Requires: redis>=5.0.0, fastapi>=0.100.0

import time
import redis.asyncio as aioredis
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local curr_key = key .. ":" .. math.floor(now / window)
local prev_key = key .. ":" .. (math.floor(now / window) - 1)
local curr = tonumber(redis.call("GET", curr_key) or "0")
local prev = tonumber(redis.call("GET", prev_key) or "0")
local weight = (window - (now % window)) / window
local count = math.floor(prev * weight) + curr
if count >= limit then
    return {0, 0, math.ceil(window - (now % window))}
end
redis.call("INCR", curr_key)
redis.call("EXPIRE", curr_key, window * 2)
return {1, limit - count - 1, 0}
"""


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url="redis://localhost:6379",
                 limit=100, window=60):
        super().__init__(app)
        self.redis = aioredis.from_url(redis_url)
        self.limit = limit
        self.window = window
        self.sha = None  # cached script SHA

    async def dispatch(self, request: Request, call_next):
        key = f"rl:{request.headers.get('x-api-key', request.client.host)}"
        now = time.time()
        try:
            if not self.sha:
                self.sha = await self.redis.script_load(SLIDING_WINDOW_LUA)
            result = await self.redis.evalsha(
                self.sha, 1, key, self.window, self.limit, int(now))
            allowed, remaining, retry_after = result
        except Exception:
            allowed, remaining, retry_after = 1, -1, 0  # fail open

        response = (await call_next(request)) if allowed else JSONResponse(
            status_code=429,
            content={"error": {"code": "RATE_LIMIT_EXCEEDED",
                               "retry_after": retry_after}})
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        if retry_after > 0:
            response.headers["Retry-After"] = str(retry_after)
        return response


# Usage: app.add_middleware(RateLimitMiddleware,
#            redis_url="redis://localhost:6379", limit=100, window=60)
