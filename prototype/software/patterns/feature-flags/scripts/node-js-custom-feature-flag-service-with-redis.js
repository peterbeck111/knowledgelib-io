// Input:  Redis connection, flag configs stored as JSON
// Output: Boolean flag evaluation with percentage rollout

const Redis = require('ioredis');       // ioredis@5.x
const crypto = require('crypto');

class FeatureFlagService {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.cache = new Map();             // local cache, 30s TTL
  }

  async isEnabled(flagKey, userId, fallback = false) {
    try {
      const config = await this.getConfig(flagKey);
      if (!config || !config.enabled) return false;
      if (config.overrides?.[userId] !== undefined) {
        return config.overrides[userId];
      }
      if (config.percentage < 100) {
        const hash = crypto.createHash('md5')
          .update(`${flagKey}:${userId}`).digest('hex');
        return (parseInt(hash.slice(0, 8), 16) % 100) < config.percentage;
      }
      return true;
    } catch (err) {
      console.error(`Flag ${flagKey} eval failed, using fallback`, err);
      return fallback;  // always return fallback on error
    }
  }

  async getConfig(flagKey) {
    const cached = this.cache.get(flagKey);
    if (cached && Date.now() - cached.ts < 30000) return cached.val;
    const raw = await this.redis.get(`flag:${flagKey}`);
    const val = raw ? JSON.parse(raw) : null;
    this.cache.set(flagKey, { val, ts: Date.now() });
    return val;
  }
}
