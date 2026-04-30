// Input:  HTTP request - single-instance only
// Output: { allowed: bool, remaining: int, retryAfter: int }
// Zero dependencies - for development/single-process

class InMemoryRateLimiter {
  constructor({ capacity = 100, windowMs = 60000 }) {
    this.capacity = capacity;
    this.windowMs = windowMs;
    this.windows = new Map();
    // Cleanup expired entries every 60s
    setInterval(() => this._cleanup(), 60000).unref();
  }

  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }
    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter(t => t > windowStart);
    if (entry.timestamps.length >= this.capacity) {
      const oldest = entry.timestamps[0];
      const retryAfter = Math.ceil((oldest + this.windowMs - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter };
    }
    entry.timestamps.push(now);
    return { allowed: true, remaining: this.capacity - entry.timestamps.length, retryAfter: 0 };
  }

  _cleanup() {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, entry] of this.windows) {
      if (entry.timestamps.every(t => t < cutoff)) this.windows.delete(key);
    }
  }
}

module.exports = { InMemoryRateLimiter };
