// Input:  Express app with async routes that crash on errors
// Output: Production-ready error handling setup

const express = require('express');
require('express-async-errors');  // Auto-catch async rejections

const app = express();
app.use(express.json());

// Routes — async errors auto-forwarded to error middleware
app.get('/users/:id', async (req, res) => {
  const user = await db.getUser(req.params.id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;  // Caught by error middleware
  }
  res.json(user);
});

app.post('/users', async (req, res) => {
  const user = await db.createUser(req.body);
  res.status(201).json(user);
});

// 404 handler (after all routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error middleware (must have 4 params)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  // Log full error server-side
  console.error(`[${req.method} ${req.path}] ${status}:`, err.message);
  if (status === 500) console.error(err.stack);

  // Send safe response to client
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

app.listen(3000);
