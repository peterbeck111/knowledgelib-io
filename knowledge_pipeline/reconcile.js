const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Reconciliation script for parallel card creation.
 *
 * Run this after all parallel Claude Code sessions have completed.
 * It regenerates catalog.json and sitemap.xml from the database,
 * and syncs tracker.md statistics.
 *
 * Usage: node knowledge_pipeline/reconcile.js
 */

const PROTOTYPE_DIR = path.resolve(__dirname, '..', 'prototype');
const TRACKER_PATH = path.resolve(__dirname, 'tracker.md');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL.\n');

    // 1. Fetch all active cards from DB
    const { rows: cards } = await client.query(`
      SELECT id, category, subcategory, topic, version_tag,
             canonical_question, aliases, confidence, source_count,
             token_estimate, md_path, html_path, published_at
      FROM knowledge_cards
      WHERE status = 'active'
      ORDER BY id
    `);

    console.log(`Found ${cards.length} active cards in database.\n`);

    // 2. Regenerate catalog.json
    regenerateCatalog(cards);

    // 3. Regenerate sitemap.xml
    regenerateSitemap(cards);

    // 4. Sync tracker.md statistics
    syncTrackerStats();

    // 5. Clean up parallel temp files
    cleanupTempFiles();

    console.log('\nReconciliation complete.');
  } catch (err) {
    console.error('Reconciliation failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function regenerateCatalog(cards) {
  console.log('Regenerating catalog.json...');

  // Build domains/subdomains structure
  const domainMap = {};
  for (const card of cards) {
    const domId = card.category;
    const subId = card.subcategory;

    if (!domainMap[domId]) {
      domainMap[domId] = {
        id: domId,
        name: formatName(domId),
        unit_count: 0,
        subdomains: {}
      };
    }
    domainMap[domId].unit_count++;

    if (!domainMap[domId].subdomains[subId]) {
      domainMap[domId].subdomains[subId] = {
        id: subId,
        name: formatName(subId),
        unit_count: 0
      };
    }
    domainMap[domId].subdomains[subId].unit_count++;
  }

  // Convert subdomains from map to array
  const domains = Object.values(domainMap).map(d => ({
    ...d,
    subdomains: Object.values(d.subdomains)
  }));

  // Build units array
  const units = cards.map(card => ({
    id: card.id,
    canonical_question: card.canonical_question,
    aliases: card.aliases || [],
    domain: `${formatName(card.category).toLowerCase().replace(/ /g, '_')} > ${formatName(card.subcategory).toLowerCase().replace(/ /g, '_')} > ${formatName(card.topic).toLowerCase().replace(/ /g, '_')}`,
    confidence: parseFloat(card.confidence),
    last_verified: formatDate(card.published_at),
    freshness: 'quarterly',
    temporal_scope: '2025-2026',
    url: `https://knowledgelib.io/${card.id}`,
    raw_md: `https://knowledgelib.io/api/v1/units/${card.id}.md`,
    source_count: card.source_count,
    token_estimate: card.token_estimate
  }));

  const catalog = {
    schema_version: '1.0',
    generated: formatDate(new Date()),
    total_units: cards.length,
    domains,
    units
  };

  const catalogPath = path.join(PROTOTYPE_DIR, 'catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`  Written ${catalogPath} (${cards.length} units)`);
}

function regenerateSitemap(cards) {
  console.log('Regenerating sitemap.xml...');

  const today = formatDate(new Date());

  // Static entries
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Homepage & navigation -->
  <url>
    <loc>https://knowledgelib.io/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://knowledgelib.io/about</loc>
    <lastmod>2026-02-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://knowledgelib.io/methodology</loc>
    <lastmod>2026-02-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://knowledgelib.io/api</loc>
    <lastmod>2026-02-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;

  // Dynamic entries from DB
  for (const card of cards) {
    const lastmod = formatDate(card.published_at);
    xml += `
  <url>
    <loc>https://knowledgelib.io/${card.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>quarterly</changefreq>
    <priority>0.9</priority>
  </url>
`;
  }

  xml += `
  <!--
    ADD NEW KNOWLEDGE UNITS HERE
    Template:
    <url>
      <loc>https://knowledgelib.io/{domain}/{subtopic}/{unit-name}/{year-or-version}</loc>
      <lastmod>{YYYY-MM-DD}</lastmod>
      <changefreq>{monthly|quarterly|yearly}</changefreq>
      <priority>0.8</priority>
    </url>
  -->

</urlset>
`;

  const sitemapPath = path.join(PROTOTYPE_DIR, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);
  console.log(`  Written ${sitemapPath} (${cards.length} knowledge unit URLs)`);
}

function syncTrackerStats() {
  console.log('Syncing tracker.md statistics...');

  if (!fs.existsSync(TRACKER_PATH)) {
    console.log('  tracker.md not found, skipping.');
    return;
  }

  let tracker = fs.readFileSync(TRACKER_PATH, 'utf-8');

  // Count statuses from the table rows
  const rows = tracker.match(/^\|.*\|$/gm) || [];
  let pending = 0, inProgress = 0, done = 0, skipped = 0;

  for (const row of rows) {
    // Skip header and separator rows
    if (row.includes('Status') || row.match(/^\|\s*-+/)) continue;

    if (row.includes('| pending |')) pending++;
    else if (row.includes('| in-progress |')) inProgress++;
    else if (row.includes('| done |')) done++;
    else if (row.includes('| skipped |')) skipped++;
  }

  const total = pending + inProgress + done + skipped;

  // Replace statistics section
  tracker = tracker.replace(
    /## Statistics[\s\S]*?(?=\n## )/,
    `## Statistics\n- Total discovered: ${total}\n- Pending: ${pending}\n- In progress: ${inProgress}\n- Completed: ${done}\n- Skipped: ${skipped}\n\n`
  );

  fs.writeFileSync(TRACKER_PATH, tracker);
  console.log(`  Stats: ${done} done, ${pending} pending, ${inProgress} in-progress, ${skipped} skipped (${total} total)`);
}

function cleanupTempFiles() {
  console.log('Cleaning up parallel temp files...');

  const pipelineDir = path.resolve(__dirname);
  const files = fs.readdirSync(pipelineDir);
  let cleaned = 0;

  for (const file of files) {
    if (file.startsWith('card_data_') && file.endsWith('.json')) {
      fs.unlinkSync(path.join(pipelineDir, file));
      cleaned++;
    }
  }

  console.log(`  Removed ${cleaned} temp file(s).`);
}

function formatName(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

run();
