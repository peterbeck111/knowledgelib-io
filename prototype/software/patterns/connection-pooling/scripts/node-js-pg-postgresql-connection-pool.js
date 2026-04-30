// Input:  PostgreSQL connection string
// Output: Pooled query results with automatic connection management

const { Pool } = require('pg');  // pg@8.x

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if no connection available in 5s
  maxUses: 7500,              // Recycle connection after N uses
});

// Always use pool.query() for single queries (auto-acquires and releases)
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// For transactions, manually acquire and release
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO orders (user_id) VALUES ($1)', [userId]);
  await client.query('UPDATE inventory SET qty = qty - 1 WHERE item_id = $1', [itemId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();  // CRITICAL: always release back to pool
}
