// Input:  Array of item IDs or cursor-based DB query
// Output: Processed results, failures logged to DLQ

// p-limit@5.0.0
import pLimit from "p-limit";

const CHUNK_SIZE = 500;
const CONCURRENCY = 4;
const MAX_RETRIES = 3;

async function processBatch(db, jobId) {
  const limit = pLimit(CONCURRENCY);
  let cursor = (await getCheckpoint(db, jobId)) || 0;
  let total = 0, failed = 0;

  while (true) {
    const items = await db.query(
      "SELECT * FROM items WHERE id > $1 ORDER BY id LIMIT $2",
      [cursor, CHUNK_SIZE]
    );
    if (items.rows.length === 0) break;

    const tasks = items.rows.map((item) =>
      limit(async () => {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            const result = await processItem(item);
            await upsertResult(db, item.id, result);
            return;
          } catch (err) {
            if (attempt === MAX_RETRIES - 1) {
              await writeToDLQ(db, jobId, item, err.message);
              failed++;
            } else {
              await sleep(Math.pow(2, attempt) * 1000);
            }
          }
        }
      })
    );
    await Promise.all(tasks);
    cursor = items.rows[items.rows.length - 1].id;
    await saveCheckpoint(db, jobId, cursor, items.rows.length);
    total += items.rows.length;
  }
  return { processed: total, failed };
}
