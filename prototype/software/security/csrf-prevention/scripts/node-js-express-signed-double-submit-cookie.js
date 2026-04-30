const express = require('express');            // ^4.18.0
const { doubleCsrf } = require('csrf-csrf');   // ^3.0.0
const cookieParser = require('cookie-parser'); // ^1.4.0

const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,   // Server-side secret for HMAC
  cookieName: '__Host-csrf',
  cookieOptions: {
    sameSite: 'strict',
    secure: true,
    httpOnly: true,
    path: '/'
  },
  size: 64,
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] || req.body._csrf
});

// Apply CSRF protection to all routes
app.use(doubleCsrfProtection);

// Expose token to views
app.get('/form', (req, res) => {
  const token = generateToken(req, res);
  res.send(`
    <form method="POST" action="/transfer">
      <input type="hidden" name="_csrf" value="${token}">
      <input name="amount" type="number">
      <button type="submit">Transfer</button>
    </form>
  `);
});

app.post('/transfer', (req, res) => {
  // Token validated by doubleCsrfProtection middleware
  res.json({ success: true });
});
