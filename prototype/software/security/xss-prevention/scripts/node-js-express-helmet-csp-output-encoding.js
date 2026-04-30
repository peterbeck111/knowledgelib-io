const express = require('express');     // ^4.18.0
const helmet = require('helmet');       // ^7.1.0
const crypto = require('crypto');

const app = express();

// Generate per-request nonce for CSP
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Strict CSP via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [(req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

// HTML entity encoding utility
function escapeHtml(str) {
  const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#x27;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

app.get('/profile/:name', (req, res) => {
  const safeName = escapeHtml(req.params.name);
  res.send(`<h1>Profile: ${safeName}</h1>`);
});
