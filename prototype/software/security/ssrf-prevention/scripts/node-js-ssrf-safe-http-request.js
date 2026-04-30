// Input:  User-supplied URL string
// Output: HTTP response or throws Error if URL targets blocked IP

const { URL } = require('url');          // built-in
const dns = require('dns').promises;     // built-in
const https = require('https');          // built-in
const http = require('http');            // built-in
const net = require('net');              // built-in

const BLOCKED_CIDRS = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
  '127.0.0.0/8', '169.254.0.0/16', '0.0.0.0/8',
];

function isPrivateIP(ip) {
  // Check if IP falls in any private/reserved range
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 0) return true;
  if (net.isIPv6(ip)) return true; // Block all IPv6 as safe default
  return false;
}

async function ssrfSafeFetch(userUrl, timeoutMs = 10000) {
  const parsed = new URL(userUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }

  // Resolve DNS and validate before fetching
  const { address } = await dns.lookup(parsed.hostname);
  if (isPrivateIP(address)) {
    throw new Error(`Blocked IP: ${address} for host ${parsed.hostname}`);
  }

  const client = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(userUrl, {
      timeout: timeoutMs,
      headers: { Host: parsed.hostname },
      // Do NOT follow redirects
    }, resolve);
    req.on('error', reject);
    // Prevent redirect following
    req.on('response', (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        res.destroy();
        reject(new Error(`Redirect blocked: ${res.headers.location}`));
      }
    });
  });
}
