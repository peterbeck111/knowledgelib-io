// Input:  incoming HTTP POST request with webhook-id, webhook-timestamp, webhook-signature headers
// Output: 200 OK (accepted) or 401 Unauthorized (invalid signature)

const express = require('express');       // express@4.x
const crypto = require('crypto');
const { Queue } = require('bullmq');      // bullmq@5.x

const app = express();
const webhookQueue = new Queue('webhooks');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // base64-encoded
const TOLERANCE_SEC = 300; // 5-minute replay window

// Must capture raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks', async (req, res) => {
  const msgId = req.headers['webhook-id'];
  const timestamp = req.headers['webhook-timestamp'];
  const sigHeader = req.headers['webhook-signature'];

  // 1. Reject stale timestamps
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp));
  if (age > TOLERANCE_SEC) return res.status(401).json({ error: 'Stale timestamp' });

  // 2. Verify HMAC signature (constant-time comparison)
  const toSign = `${msgId}.${timestamp}.${req.body.toString()}`;
  const expected = crypto
    .createHmac('sha256', Buffer.from(WEBHOOK_SECRET, 'base64'))
    .update(toSign)
    .digest('base64');

  const isValid = sigHeader.split(' ').some(sig => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected), Buffer.from(sig.replace('v1,', ''))
      );
    } catch { return false; }
  });
  if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

  // 3. Enqueue for async processing (return 200 immediately)
  await webhookQueue.add('process', {
    webhookId: msgId,
    payload: JSON.parse(req.body.toString()),
  }, { jobId: msgId }); // jobId = msgId for built-in deduplication

  res.status(200).json({ received: true });
});

app.listen(3000);
