const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * IndexNow submission script.
 *
 * Usage:
 *   node indexnow.js          — submit ALL URLs from sitemap.xml
 *   node indexnow.js --new    — submit only NEW URLs (not in last snapshot)
 *
 * After submission, saves a snapshot of submitted URLs to
 * .indexnow_last_urls.json for diffing on next --new run.
 */

const INDEXNOW_KEY = 'ef8e8f4c-3591-49d6-be16-a7e0368a03d7';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITE_HOST = 'knowledgelib.io';
const KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

const PROTOTYPE_DIR = path.resolve(__dirname, '..', 'prototype');
const SITEMAP_PATH = path.join(PROTOTYPE_DIR, 'sitemap.xml');
const SNAPSHOT_PATH = path.resolve(__dirname, '.indexnow_last_urls.json');

function extractUrlsFromSitemap(sitemapXml) {
  const urls = [];
  const regex = /<loc>(https:\/\/knowledgelib\.io\/[^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(sitemapXml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function loadLastSnapshot() {
  try {
    if (fs.existsSync(SNAPSHOT_PATH)) {
      return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not load last snapshot:', e.message);
  }
  return [];
}

function saveSnapshot(urls) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(urls, null, 2) + '\n');
  console.log(`Snapshot saved: ${urls.length} URLs`);
}

async function submitToIndexNow(urls) {
  if (urls.length === 0) {
    console.log('No URLs to submit.');
    return;
  }

  console.log(`Submitting ${urls.length} URLs to IndexNow...`);
  urls.forEach(u => console.log(`  ${u}`));

  const payload = JSON.stringify({
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  });

  return new Promise((resolve, reject) => {
    const url = new URL(INDEXNOW_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`IndexNow: ${res.statusCode} — URLs accepted and queued for indexing.`);
        } else if (res.statusCode === 202) {
          console.log(`IndexNow: ${res.statusCode} — URLs received, will be processed.`);
        } else {
          console.warn(`IndexNow: ${res.statusCode} — ${body}`);
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (err) => {
      console.error('IndexNow request failed:', err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  const newOnly = process.argv.includes('--new');

  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error(`Sitemap not found: ${SITEMAP_PATH}`);
    console.error('Run reconcile.js first to generate it.');
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const allUrls = extractUrlsFromSitemap(sitemapXml);
  console.log(`Found ${allUrls.length} URLs in sitemap.xml`);

  let urlsToSubmit;

  if (newOnly) {
    const lastUrls = new Set(loadLastSnapshot());
    urlsToSubmit = allUrls.filter(url => !lastUrls.has(url));
    console.log(`New URLs since last submission: ${urlsToSubmit.length}`);
  } else {
    urlsToSubmit = allUrls;
    console.log('Full submission mode — sending all URLs.');
  }

  if (urlsToSubmit.length > 0) {
    await submitToIndexNow(urlsToSubmit);
  }

  saveSnapshot(allUrls);
}

run().catch(err => {
  console.error('IndexNow submission failed:', err);
  process.exit(1);
});
