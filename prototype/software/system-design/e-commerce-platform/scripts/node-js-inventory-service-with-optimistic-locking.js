// inventory_service/reserve.js — Atomic inventory reservation
// Input:  saga_id, items [{sku, qty}]
// Output: reservation confirmation or rejection

const { Pool } = require("pg");  // pg@8.13
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reserveInventory(sagaId, items) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of items) {
      // Optimistic lock: only deduct if stock >= requested qty
      const result = await client.query(
        `UPDATE inventory
         SET reserved = reserved + $1, updated_at = NOW()
         WHERE sku = $2 AND (stock - reserved) >= $1
         RETURNING sku, stock, reserved`,
        [item.qty, item.sku]
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return { success: false, reason: `Insufficient stock: ${item.sku}` };
      }
    }
    // Record reservation for saga compensation
    await client.query(
      `INSERT INTO reservations (saga_id, items, status)
       VALUES ($1, $2, 'reserved')`,
      [sagaId, JSON.stringify(items)]
    );
    await client.query("COMMIT");
    return { success: true, saga_id: sagaId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { reserveInventory };
