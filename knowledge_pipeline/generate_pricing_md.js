#!/usr/bin/env node
/**
 * Generate pricing.md alongside every product_comparison card.
 *
 * AI shopping agents (and LLM-mediated buyers) need machine-parseable
 * pricing. The card .html buries product/price data inside Schema.org
 * JSON-LD; the .md frontmatter has buy_links but no prices. This file
 * collapses both into one flat, plain-markdown listing per card so an
 * agent can answer "how much is X?" without rendering the page.
 *
 * Output path: prototype/{category}/{subcategory}/{topic}/pricing.md
 *
 * Usage:
 *   node knowledge_pipeline/generate_pricing_md.js                       # all product_comparison cards
 *   node knowledge_pipeline/generate_pricing_md.js --card consumer-electronics/audio/bluetooth-speakers-under-100/2026
 *   node knowledge_pipeline/generate_pricing_md.js --dry-run             # preview without writing
 *
 * Idempotent: rewrites pricing.md every run with the latest data.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY_RUN = process.argv.includes('--dry-run');
const CARD_ARG = process.argv.find(a => a.startsWith('--card='));
const CARD_FILTER = CARD_ARG ? CARD_ARG.split('=')[1] : null;

function walkMd(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'scripts' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, results);
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'pricing.md') results.push(full);
  }
  return results;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  try {
    return { frontmatter: yaml.load(match[1]), body: match[2] };
  } catch {
    return { frontmatter: null, body: content };
  }
}

function extractPriceMap(body) {
  // Returns Map<lowercased product name, raw price string>.
  // Walks the first markdown table that has a "Price" column header.
  const priceMap = new Map();
  const lines = body.split('\n');
  let inTable = false;
  let priceCol = -1;
  let nameCol = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      if (inTable) break; // table ended
      continue;
    }
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (!inTable) {
      // Detect header row containing "Price" or "Model"
      const lower = cells.map(c => c.toLowerCase());
      const pIdx = lower.findIndex(c => c === 'price' || c.startsWith('price '));
      const nIdx = lower.findIndex(c => c === 'model' || c === 'product' || c === 'name');
      if (pIdx >= 0 && nIdx >= 0 && lines[i + 1] && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
        priceCol = pIdx;
        nameCol = nIdx;
        inTable = true;
        i++; // skip separator row
      }
      continue;
    }
    if (cells.length <= Math.max(priceCol, nameCol)) continue;
    const name = cells[nameCol].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    const price = cells[priceCol].trim();
    if (name) priceMap.set(name.toLowerCase(), price);
  }
  return priceMap;
}

function fmtDate(d) {
  if (!d) return 'unknown';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d);
}

function buildPricingMd(cardPath, fm, priceMap) {
  const verified = fmtDate(fm.last_verified);
  const cardId = fm.id || cardPath.replace(/\.md$/, '').replace(/\\/g, '/').split('prototype/').pop();
  const title = fm.canonical_question || cardId;
  const buyLinks = Array.isArray(fm.buy_links) ? fm.buy_links : [];

  const lines = [];
  lines.push(`# Pricing — ${title}`);
  lines.push('');
  lines.push(`> Machine-readable pricing for AI shopping agents. Plain markdown, no JS, no rendering required.`);
  lines.push('');
  lines.push(`- **Card**: [${cardId}](https://knowledgelib.io/${cardId})`);
  lines.push(`- **Last verified**: ${verified}`);
  lines.push(`- **Currency**: USD`);
  lines.push(`- **Source of prices**: comparison table in the card .md (street-price approximations)`);
  lines.push(`- **Checkout**: affiliate-redirect via /go/{slug} → Amazon`);
  lines.push('');
  lines.push(`## Products (${buyLinks.length})`);
  lines.push('');

  for (const link of buyLinks) {
    const name = link.product_name || link.product || link.slug || '(unknown)';
    const slug = link.slug || '';
    const asin = link.asin || null;
    const price = priceMap.get(name.toLowerCase()) || 'see card';
    const buyUrl = slug ? `https://knowledgelib.io/go/${slug}` : (link.destination_url || '');
    const amazonUrl = link.destination_url || (asin ? `https://www.amazon.com/dp/${asin}?tag=knowledgelib-20` : '');

    lines.push(`### ${name}`);
    lines.push(`- Price: ${price}`);
    if (asin) lines.push(`- ASIN: ${asin}`);
    else lines.push(`- ASIN: null (unreleased or unlisted)`);
    if (buyUrl) lines.push(`- Buy: ${buyUrl}`);
    if (amazonUrl && amazonUrl !== buyUrl) lines.push(`- Amazon: ${amazonUrl}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`Generated by knowledge_pipeline/generate_pricing_md.js. Re-run after card updates.`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const mdFiles = walkMd(PROTO);
  let written = 0;
  let skipped = 0;
  let scanned = 0;

  for (const mdFile of mdFiles) {
    const rel = mdFile.replace(PROTO + path.sep, '').replace(/\\/g, '/');
    const cardId = rel.replace(/\.md$/, '');
    if (CARD_FILTER && !cardId.startsWith(CARD_FILTER)) continue;

    const content = fs.readFileSync(mdFile, 'utf8');
    const { frontmatter: fm, body } = parseFrontmatter(content);
    if (!fm || fm.entity_type !== 'product_comparison') {
      scanned++;
      continue;
    }
    if (!Array.isArray(fm.buy_links) || fm.buy_links.length === 0) {
      console.warn(`[skip] ${cardId}: no buy_links`);
      skipped++;
      continue;
    }

    const priceMap = extractPriceMap(body);
    const pricingMd = buildPricingMd(mdFile, fm, priceMap);
    const outPath = path.join(path.dirname(mdFile), 'pricing.md');

    if (DRY_RUN) {
      console.log(`[dry-run] would write ${path.relative(PROTO, outPath)} (${fm.buy_links.length} products)`);
    } else {
      fs.writeFileSync(outPath, pricingMd, 'utf8');
      console.log(`[write]   ${path.relative(PROTO, outPath)} (${fm.buy_links.length} products)`);
    }
    written++;
  }

  console.log('');
  console.log(`Done. Wrote ${written} pricing.md file${written === 1 ? '' : 's'}, skipped ${skipped}, scanned ${mdFiles.length} .md files total.`);
}

main();
