// Input:  Redis connection, database connection
// Output: Cached read with consistent write-through

const Redis = require('ioredis');       // ioredis@5.x
const redis = new Redis({ host: '127.0.0.1', port: 6379 });

// Cache-aside read
async function cacheGet(key, fetchFn, ttlSec = 3600) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const data = await fetchFn();
  if (data) {
    const jitter = Math.floor(Math.random() * ttlSec * 0.1);
    await redis.set(key, JSON.stringify(data), 'EX', ttlSec + jitter);
  }
  return data;
}

// Write-through: update DB then cache atomically
async function cacheSet(key, data, writeFn, ttlSec = 3600) {
  await writeFn(data);                  // DB write first
  await redis.set(key, JSON.stringify(data), 'EX', ttlSec);
}

// Invalidate on delete
async function cacheDel(key, deleteFn) {
  await deleteFn();                     // DB delete first
  await redis.del(key);                 // then invalidate cache
}
