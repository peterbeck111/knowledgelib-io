// Input:  Express request with ?code=...&state=...
// Output: Token response from authorization server

const crypto = require('node:crypto');

function generatePKCE() {
  const verifier = crypto.randomBytes(32)
    .toString('base64url'); // Node 16+
  const challenge = crypto.createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

// In Express route handler:
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.oauthState) {
    return res.status(403).send('State mismatch');
  }
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      code_verifier: req.session.codeVerifier,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const tokens = await resp.json();
  req.session.accessToken = tokens.access_token;
  res.redirect('/dashboard');
});
