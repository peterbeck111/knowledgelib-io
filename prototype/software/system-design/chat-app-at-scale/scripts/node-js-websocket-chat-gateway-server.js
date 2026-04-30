// Input:  WebSocket connections from authenticated clients
// Output: Real-time message delivery between connected users
// Deps:   npm install ws ioredis uuid (ws@8.x, ioredis@5.x)

const WebSocket = require('ws');
const Redis = require('ioredis');
const { randomUUID } = require('crypto');

const HEARTBEAT_INTERVAL = 15000; // 15s
const PRESENCE_TTL = 30;          // 30s Redis TTL

// Redis clients: one for pub, one for sub (required by ioredis)
const redisPub = new Redis(process.env.REDIS_URL);
const redisSub = new Redis(process.env.REDIS_URL);
const redisStore = new Redis(process.env.REDIS_URL);

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map(); // user_id -> WebSocket

wss.on('connection', (ws, req) => {
  const userId = authenticateFromToken(req); // extract from JWT
  if (!userId) { ws.close(4001, 'Unauthorized'); return; }

  clients.set(userId, ws);
  refreshPresence(userId);

  // Subscribe to messages targeted at this user
  redisSub.subscribe(`deliver:${userId}`);

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'heartbeat') {
      refreshPresence(userId);
      return;
    }

    if (msg.type === 'send_message') {
      const messageId = generateSnowflakeId();
      const envelope = {
        message_id: messageId,
        conversation_id: msg.conversation_id,
        sender_id: userId,
        content: msg.content,
        content_type: msg.content_type || 'text',
        created_at: new Date().toISOString(),
      };

      // Acknowledge receipt to sender immediately
      ws.send(JSON.stringify({ type: 'ack', message_id: messageId }));

      // Publish to Kafka for durable processing (simplified: using Redis here)
      await redisPub.publish(
        `conversation:${msg.conversation_id}`,
        JSON.stringify(envelope)
      );
    }

    if (msg.type === 'typing') {
      // Ephemeral — broadcast to conversation members, never persist
      await redisPub.publish(
        `typing:${msg.conversation_id}`,
        JSON.stringify({ user_id: userId, conversation_id: msg.conversation_id })
      );
    }
  });

  ws.on('close', () => {
    clients.delete(userId);
    redisStore.del(`presence:${userId}`);
    redisSub.unsubscribe(`deliver:${userId}`);
  });
});

// Receive messages from Redis Pub/Sub for local delivery
redisSub.on('message', (channel, message) => {
  const [prefix, targetUserId] = channel.split(':');
  if (prefix === 'deliver' && clients.has(targetUserId)) {
    const ws = clients.get(targetUserId);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
});

async function refreshPresence(userId) {
  await redisStore.setex(`presence:${userId}`, PRESENCE_TTL, Date.now());
}

function authenticateFromToken(req) {
  // In production: verify JWT from query param or header
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('user_id'); // simplified
}

function generateSnowflakeId() {
  // In production: use a proper snowflake generator (timestamp + worker + sequence)
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

console.log('WebSocket gateway running on :8080');
