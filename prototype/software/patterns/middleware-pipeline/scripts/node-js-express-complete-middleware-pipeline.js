// Input:  HTTP request
// Output: HTTP response processed through logging, auth, and timing middleware

const express = require('express');
const app = express();

// Timing middleware -- measures response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Auth middleware -- short-circuits on failure
app.use('/api', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/api/data', (req, res) => {
  res.json({ message: 'protected data' });
});

// Error handler -- always last, always 4 args
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
