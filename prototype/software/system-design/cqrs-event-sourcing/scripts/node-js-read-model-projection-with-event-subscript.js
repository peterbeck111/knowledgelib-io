// Input:  Events from an event store (EventStoreDB or Kafka)
// Output: Denormalized read model in PostgreSQL

const { Pool } = require('pg');  // pg@8.x

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Projection: maintains a denormalized order_summary table
const projectionHandlers = {
  async OrderCreated(event) {
    const { customer_id, items, total } = event.data;
    await pool.query(
      `INSERT INTO order_summary
       (order_id, customer_id, status, item_count, total, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $5)
       ON CONFLICT (order_id) DO NOTHING`,
      [event.aggregate_id, customer_id, items.length, total, event.timestamp]
    );
  },

  async OrderConfirmed(event) {
    await pool.query(
      `UPDATE order_summary
       SET status = 'confirmed', updated_at = $2
       WHERE order_id = $1`,
      [event.aggregate_id, event.timestamp]
    );
  },

  async OrderShipped(event) {
    const { tracking_number, carrier } = event.data;
    await pool.query(
      `UPDATE order_summary
       SET status = 'shipped', tracking_number = $2,
           carrier = $3, updated_at = $4
       WHERE order_id = $1`,
      [event.aggregate_id, tracking_number, carrier, event.timestamp]
    );
  },

  async OrderCancelled(event) {
    await pool.query(
      `UPDATE order_summary
       SET status = 'cancelled', updated_at = $2
       WHERE order_id = $1`,
      [event.aggregate_id, event.timestamp]
    );
  }
};

// Projection runner with checkpoint tracking
async function runProjection(eventStore, projectionName) {
  // Load last processed position
  const checkpoint = await loadCheckpoint(projectionName);
  let position = checkpoint;

  console.log(`Starting projection '${projectionName}' from position ${position}`);

  // Subscribe to all events from last checkpoint
  const stream = eventStore.subscribeToAll({ fromPosition: position });

  for await (const resolvedEvent of stream) {
    const event = resolvedEvent.event;
    const handler = projectionHandlers[event.event_type];

    if (handler) {
      try {
        await handler(event);
        await saveCheckpoint(projectionName, resolvedEvent.position);
        position = resolvedEvent.position;
      } catch (err) {
        console.error(`Projection error at ${resolvedEvent.position}:`, err);
        // Send to dead letter queue for manual inspection
        await sendToDeadLetter(projectionName, resolvedEvent, err);
      }
    }
  }
}

async function loadCheckpoint(name) {
  const result = await pool.query(
    'SELECT position FROM projection_checkpoints WHERE name = $1',
    [name]
  );
  return result.rows[0]?.position || 0;
}

async function saveCheckpoint(name, position) {
  await pool.query(
    `INSERT INTO projection_checkpoints (name, position, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (name) DO UPDATE SET position = $2, updated_at = NOW()`,
    [name, position]
  );
}

async function sendToDeadLetter(projection, event, error) {
  await pool.query(
    `INSERT INTO dead_letter_queue (projection, event_id, event_data, error, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [projection, event.event?.event_id, JSON.stringify(event), error.message]
  );
}

module.exports = { runProjection, projectionHandlers };
