// Input:  Express app using mssql package for SQL Server
// Output: Same routes using pg package for PostgreSQL

import pg from 'pg';
const { Pool } = pg;

// BEFORE: SQL Server
// const pool = new sql.ConnectionPool(sqlServerConfig);
// const result = await pool.request()
//   .input('status', sql.NVarChar, 'active')
//   .query('SELECT TOP 10 * FROM users WHERE status = @status');

// AFTER: PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // postgresql://user:pass@host:5432/dbname
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Middleware: get active users
async function getActiveUsers(req, res) {
  const client = await pool.connect();
  try {
    // @param → $1 positional params, TOP N → LIMIT N
    const { rows } = await client.query(
      'SELECT * FROM users WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
      [req.query.status || 'active', parseInt(req.query.limit) || 10]
    );
    res.json(rows);
  } catch (err) {
    console.error('Query failed:', err.message);
    res.status(500).json({ error: 'Database query failed' });
  } finally {
    client.release();
  }
}

// Transaction example — SQL Server BEGIN TRAN → PostgreSQL BEGIN
async function transferFunds(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SQL Server: UPDATE accounts SET balance = balance - @amount WHERE id = @fromId
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { getActiveUsers, transferFunds };
