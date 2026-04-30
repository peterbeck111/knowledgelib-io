// Input:  Server with DB and Redis connections that leak on restart
// Output: Graceful shutdown with comprehensive cleanup

const http = require('http');
const { Pool } = require('pg');
const Redis = require('ioredis');

const pgPool = new Pool({ max: 20 });
const redis = new Redis();
const server = http.createServer(app);
const activeConnections = new Set();

// Track active connections
server.on('connection', (conn) => {
  activeConnections.add(conn);
  conn.on('close', () => activeConnections.delete(conn));
});

async function gracefulShutdown(signal) {
  console.log(`${signal} received — starting graceful shutdown`);

  // 1. Stop accepting new connections
  server.close();

  // 2. Close active connections
  for (const conn of activeConnections) {
    conn.destroy();
  }
  activeConnections.clear();

  // 3. Close external connections
  await pgPool.end();
  await redis.quit();

  // 4. Clear any intervals/timeouts
  // (reference them when creating so you can clear here)

  console.log('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(3000);
