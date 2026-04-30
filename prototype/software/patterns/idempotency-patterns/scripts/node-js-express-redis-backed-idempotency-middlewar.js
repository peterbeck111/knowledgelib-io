// Input:  HTTP request with Idempotency-Key header
// Output: Cached response on retry, fresh response on first call

const crypto = require('crypto');
const Redis = require('ioredis');        // ioredis ^5.0.0
const redis = new Redis(process.env.REDIS_URL);

const IDEM_TTL = 86400; // 24 hours in seconds

async function redisIdempotency(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key || req.method === 'GET') return next();

  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(req.body)).digest('hex');
  const redisKey = `idem:${req.user?.id || req.ip}:${key}`;

  // Atomic check-and-set with NX (only set if not exists)
  const locked = await redis.set(redisKey, JSON.stringify({
    status: 'processing', hash
  }), 'EX', IDEM_TTL, 'NX');

  if (!locked) {
    // Key exists -- check if finished
    const existing = JSON.parse(await redis.get(redisKey));
    if (existing?.hash !== hash) {
      return res.status(422).json({ error: 'Key reused with different payload' });
    }
    if (existing?.status === 'finished') {
      return res.status(existing.code).json(existing.body);
    }
    return res.status(409).json({ error: 'Request is still processing' });
  }

  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    await redis.set(redisKey, JSON.stringify({
      status: 'finished', hash, code: res.statusCode, body
    }), 'EX', IDEM_TTL);
    return originalJson(body);
  };
  next();
}
