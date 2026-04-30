// Input:  Express app needing cross-origin access from specific frontends
// Output: CORS headers on all responses, validated against allowlist

const express = require('express');  // ^4.18.0
const cors = require('cors');        // ^2.8.5

const app = express();

const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://staging.example.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, origin);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,              // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600                     // Cache preflight for 10 minutes
}));

app.get('/api/data', (req, res) => {
  res.json({ message: 'CORS-enabled response' });
});

app.listen(3000);
