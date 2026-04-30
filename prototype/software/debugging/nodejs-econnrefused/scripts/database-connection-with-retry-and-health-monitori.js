// Input:  App crashing on ECONNREFUSED when DB is temporarily unavailable
// Output: Resilient connection with retry, health checks, graceful degradation

const { Pool } = require('pg');

class ResilientDatabase {
  constructor(connectionString, options = {}) {
    this.pool = new Pool({
      connectionString,
      max: options.maxConnections || 20,
      idleTimeoutMillis: options.idleTimeout || 30000,
      connectionTimeoutMillis: options.connectTimeout || 5000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected pool error:', err.message);
    });
  }

  async connect(maxRetries = 5) {
    for (let i = 1; i <= maxRetries; i++) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('✅ Database connected');
        return;
      } catch (err) {
        const delay = Math.min(1000 * Math.pow(2, i - 1), 15000);
        console.warn(
          `⚠️ DB connection attempt ${i}/${maxRetries} failed: ${err.code}. ` +
          `Retry in ${delay}ms`
        );
        if (i === maxRetries) throw err;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  async query(text, params) {
    try {
      return await this.pool.query(text, params);
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error('Database unavailable — attempting reconnect');
        await this.connect(3);
        return await this.pool.query(text, params);
      }
      throw err;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Usage
const db = new ResilientDatabase(process.env.DATABASE_URL);
await db.connect();
