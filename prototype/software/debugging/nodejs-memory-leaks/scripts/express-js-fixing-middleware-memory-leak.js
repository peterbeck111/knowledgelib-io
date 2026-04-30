// Input:  Express middleware leaking memory via event listeners
// Output: Properly cleaned up middleware

const express = require('express');
const EventEmitter = require('events');
const app = express();

const eventBus = new EventEmitter();

// ❌ LEAKY middleware — listeners accumulate
app.use((req, res, next) => {
  eventBus.on('notification', (msg) => {
    console.log(`Request ${req.url}: ${msg}`);
  });
  next();
});

// ✅ FIXED middleware — listeners cleaned up
app.use((req, res, next) => {
  const handler = (msg) => {
    console.log(`Request ${req.url}: ${msg}`);
  };
  eventBus.on('notification', handler);

  // Clean up when request finishes (success or error)
  res.on('finish', () => eventBus.off('notification', handler));
  res.on('close', () => eventBus.off('notification', handler));

  next();
});

app.listen(3000);
