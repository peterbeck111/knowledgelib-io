// Input:  HTTP GET request with short code in URL path
// Output: HTTP 302 redirect to original long URL

const express = require('express');           // express@4.18
const Redis = require('ioredis');             // ioredis@5.3
const { Kafka } = require('kafkajs');         // kafkajs@2.2

const app = express();
const redis = new Redis({ host: 'redis-cluster', port: 6379 });
const kafka = new Kafka({ brokers: ['kafka:9092'] });
const producer = kafka.producer();

const CACHE_TTL = 3600; // seconds

app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;

    // 1. Check Redis cache
    let longUrl = await redis.get(`url:${shortCode}`);

    if (!longUrl) {
        // 2. Cache miss -> query database
        const row = await db.query(
            'SELECT long_url FROM url_mappings WHERE short_code = $1',
            [shortCode]
        );
        if (!row) return res.status(404).json({ error: 'Not found' });

        longUrl = row.long_url;
        await redis.setex(`url:${shortCode}`, CACHE_TTL, longUrl);
    }

    // 3. Publish analytics event (non-blocking)
    producer.send({
        topic: 'click-events',
        messages: [{ value: JSON.stringify({
            short_code: shortCode,
            timestamp: new Date().toISOString(),
            referrer: req.headers.referer || '',
            user_agent: req.headers['user-agent'] || '',
        })}],
    }).catch(err => console.error('Kafka send error:', err));

    // 4. Redirect (302 for analytics, 301 if no analytics needed)
    return res.redirect(302, longUrl);
});

app.listen(3000, () => console.log('Redirect service on :3000'));
