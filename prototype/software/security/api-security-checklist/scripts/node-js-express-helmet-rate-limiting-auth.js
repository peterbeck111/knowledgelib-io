// Input:  HTTP request to Express API
// Output: Secured response with all hardening applied

const express = require('express');   // ^4.21.0
const helmet = require('helmet');     // ^8.0.0
const rateLimit = require('express-rate-limit');  // ^7.4.0
const jwt = require('jsonwebtoken'); // ^9.0.0
const app = express();

// Security headers via Helmet
app.use(helmet({ contentSecurityPolicy: false }));  // CSP optional for APIs

// Rate limiting -- per IP (layer with per-user in auth middleware)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests' }
});
app.use('/api/', apiLimiter);

// Auth middleware -- verify JWT on protected routes
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET,
      { algorithms: ['RS256'], audience: 'your-api' });
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}
app.use('/api/protected', authenticate);
