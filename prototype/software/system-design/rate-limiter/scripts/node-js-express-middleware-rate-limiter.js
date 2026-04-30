// Input:  Express request object
// Output: next() if allowed, 429 response if rate-limited
// Requires: ioredis@^5.0.0, express@^4.18.0

const Redis = require('ioredis');

// Token bucket via Lua — atomic check-and-consume [src3][src4]
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local last_ts = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  last_ts = now
end

local elapsed = math.max(0, now - last_ts)
tokens = math.min(capacity, tokens + elapsed * refill_rate)

if tokens < 1 then
  local wait = (1 - tokens) / refill_rate
  return {0, 0, math.ceil(wait)}
end

tokens = tokens - 1
redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) * 2)
return {1, math.floor(tokens), 0}
`;

function createRateLimiter({ redisUrl = 'redis://localhost:6379',
    capacity = 100, refillRate = 1.67, keyPrefix = 'rl' } = {}) {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1,
    connectTimeout: 2000 });

  return async function rateLimitMiddleware(req, res, next) {
    const clientKey = req.headers['x-api-key'] || req.ip;
    const key = `${keyPrefix}:${clientKey}`;
    const now = Date.now() / 1000;

    try {
      const [allowed, remaining, retryAfter] = await redis.eval(
        TOKEN_BUCKET_LUA, 1, key, capacity, refillRate, now
      );
      res.set({
        'X-RateLimit-Limit': String(capacity),
        'X-RateLimit-Remaining': String(remaining),
      });
      if (!allowed) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: `Rate limit exceeded. Retry after ${retryAfter}s.`,
          retry_after: retryAfter,
        });
      }
      next();
    } catch (err) {
      // Fail-open on Redis errors for non-critical endpoints
      console.error('Rate limiter Redis error:', err.message);
      next();
    }
  };
}

module.exports = { createRateLimiter };
