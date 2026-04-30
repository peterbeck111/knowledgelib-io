// Input:  job data object { orderId: number }
// Output: completed job with return value in Redis

import { Queue, Worker, QueueEvents } from 'bullmq';  // bullmq@5.x
import IORedis from 'ioredis';                         // ioredis@5.x

const connection = new IORedis({ host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null });

// Producer: add jobs
const orderQueue = new Queue('orders', { connection });
await orderQueue.add('process', { orderId: 42 }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
});

// Worker: process jobs
const worker = new Worker('orders', async (job) => {
  const order = await db.get(job.data.orderId);
  if (order.status === 'done') return;         // idempotent guard
  await charge(order);
  order.status = 'done';
  await db.save(order);
  return { success: true };
}, { connection, concurrency: 5 });

// Events: monitor completion and failure
const events = new QueueEvents('orders', { connection });
events.on('completed', ({ jobId, returnvalue }) =>
  console.log(`Job ${jobId} completed:`, returnvalue));
events.on('failed', ({ jobId, failedReason }) =>
  console.error(`Job ${jobId} failed:`, failedReason));
