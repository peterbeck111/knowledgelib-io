// Input:  Express app without security headers
// Output: Express app with 11 security headers set

const express = require('express');     // ^4.18.0
const helmet = require('helmet');       // ^8.0.0
const app = express();

// Default: sets 11 headers with secure defaults
app.use(helmet());

// Custom: override specific headers
app.use(helmet({
  strictTransportSecurity: {
    maxAge: 63072000,           // 2 years
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    geolocation: [],
    camera: [],
    microphone: []
  }
}));
