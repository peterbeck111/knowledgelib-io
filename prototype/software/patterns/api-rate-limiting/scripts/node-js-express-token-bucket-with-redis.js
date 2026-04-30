// Input:  HTTP request to any Express route
// Output: 429 if rate limited, next() if allowed
// Requires: ioredis ^5.0.0

const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

const TOKEN_BUCKET_SCRIPT = ;

function rateLimiter({ capacity = 100, refillRate = 1.67, keyFn }) {
  return async (req, res, next) => {
    const key = ;
    const now = Date.now() / 1000;
    try {
      const [allowed, remaining, retryAfter] = await redis.eval(
        TOKEN_BUCKET_SCRIPT, 1, key, capacity, refillRate, now, 1
      );
      res.set('X-RateLimit-Limit', String(capacity));
      res.set('X-RateLimit-Remaining', String(remaining));
      if (!allowed) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: { code: 'RATE_LIMIT_EXCEEDED', retry_after: retryAfter }
        });
      }
      next();
    } catch (err) {
      console.error('Rate limiter error:', err.message);
      next(); // fail open
    }
  };
}

// Usage: app.use('/api', rateLimiter({
//   capacity: 100,         // 100 requests max burst
//   refillRate: 100 / 60,  // refill 100 tokens per 60 seconds
//   keyFn: (req) => req.headers['x-api-key'] || req.ip
// }));

module.exports = { rateLimiter };
