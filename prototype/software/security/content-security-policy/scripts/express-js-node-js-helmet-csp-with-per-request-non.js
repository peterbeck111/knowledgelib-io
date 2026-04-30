const express = require('express');     // ^4.18.0
const helmet = require('helmet');       // ^8.0.0
const crypto = require('crypto');

const app = express();

// Generate per-request nonce middleware
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Configure CSP via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        "'strict-dynamic'"
      ],
      styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      imgSrc: ["'self'", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

// In templates, use res.locals.cspNonce:
// <script nonce="<%= cspNonce %>">...</script>
