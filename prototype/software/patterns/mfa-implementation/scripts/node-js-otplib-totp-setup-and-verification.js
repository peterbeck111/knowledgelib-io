// Input:  User email, app name
// Output: QR code data URL, encrypted secret, backup codes

const { authenticator } = require('otplib'); // v12.0.1
const QRCode = require('qrcode');            // v1.5.3
const crypto = require('crypto');

authenticator.options = {
  digits: 6,
  step: 30,     // 30-second window (RFC 6238 default)
  window: 1,    // accept +/- 1 step for clock drift
};

async function setupTOTP(userEmail, appName, encryptionKey) {
  const secret = authenticator.generateSecret(20);
  const uri = authenticator.keyuri(userEmail, appName, secret);
  const qr = await QRCode.toDataURL(uri);

  // Encrypt secret for storage
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  let enc = cipher.update(secret, 'utf8', 'hex') + cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  const encryptedSecret = `${iv.toString('hex')}:${tag}:${enc}`;

  return { qrCodeDataUrl: qr, encryptedSecret, plaintextSecret: secret };
}

function verifyTOTP(token, secret) {
  return authenticator.check(token, secret); // true/false
}
