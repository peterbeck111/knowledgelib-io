/**
 * RabbitMQ producer and consumer using amqplib.
 * Source: knowledgelib.io -- AI Knowledge Library (verified 2026-02-27)
 *
 * Requirements: npm install amqplib@0.10.4
 *
 * Usage:
 *   node nodejs-amqplib-producer-consumer.js produce "Hello World"
 *   node nodejs-amqplib-producer-consumer.js consume
 */
const amqplib = require('amqplib');  // amqplib@0.10.4

const RABBITMQ_URL = 'amqp://myuser:mypassword@localhost:5672';
const QUEUE = 'task_queue';

async function produce(message) {
  const connection = await amqplib.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Declare a durable quorum queue (RabbitMQ 4.0+ recommended)
  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });

  channel.sendToQueue(
    QUEUE,
    Buffer.from(JSON.stringify({ task: message })),
    {
      persistent: true,          // Message survives broker restart
      contentType: 'application/json',
    }
  );

  console.log(` [x] Sent: ${message}`);

  // Wait for confirms then close
  await channel.close();
  await connection.close();
}

async function consume() {
  const connection = await amqplib.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });

  // Fair dispatch: 1 unacked message per worker
  await channel.prefetch(1);

  console.log(' [*] Waiting for messages. Press Ctrl+C to exit.');

  channel.consume(QUEUE, (msg) => {
    if (msg === null) return;
    const data = JSON.parse(msg.content.toString());
    console.log(` [x] Received:`, data);

    // Acknowledge after processing
    channel.ack(msg);
  });
}

// CLI entry point
const mode = process.argv[2];
if (mode === 'produce') {
  const msg = process.argv[3] || 'Hello World';
  produce(msg).catch(console.error);
} else if (mode === 'consume') {
  consume().catch(console.error);
} else {
  console.log('Usage: node script.js [produce <msg> | consume]');
  process.exit(1);
}
