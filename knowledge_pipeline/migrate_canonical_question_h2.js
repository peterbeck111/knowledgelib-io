#!/usr/bin/env node
/**
 * Inject the canonical-question H2 immediately after H1 on every unit page.
 *
 * Why: AI tree-walking algorithms read H1 then H2 first. The canonical
 * question phrased the way users ask it ("What are the best...") gives
 * ChatGPT / Perplexity / Google AI Overviews a clean question→answer
 * pair before they see any prose. The TL;DR / Summary that follows is
 * the answer.
 *
 * What it does:
 *   1. Scans prototype/**\/*.html
 *   2. For each unit page (has ai:canonical_question meta tag), inserts
 *      <h2 class="canonical-question">{question}</h2> right after <h1>...</h1>
 *      if it is not already present.
 *   3. Idempotent: skips files that already have the canonical-question H2.
 *
 * Usage:
 *   node knowledge_pipeline/migrate_canonical_question_h2.js [--dry-run]
 *   node knowledge_pipeline/migrate_canonical_question_h2.js --card consumer-electronics/audio/bluetooth-speakers-under-100/2026
 */

const fs = require('fs');
const path = require('path');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY_RUN = process.argv.includes('--dry-run');
const CARD_ARG = process.argv.find(a => a.startsWith('--card='));
const CARD_FILTER = CARD_ARG ? CARD_ARG.split('=')[1] : null;

function walkHtml(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'scripts' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, results);
    else if (entry.isFile() && entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function encodeHtmlEntities(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processFile(htmlPath) {
  const original = fs.readFileSync(htmlPath, 'utf8');

  // Only process knowledge unit pages — they all have ai:canonical_question.
  const cqMatch = original.match(/<meta\s+name="ai:canonical_question"\s+content="([^"]+)"\s*\/?>/i);
  if (!cqMatch) return { status: 'skip-not-unit' };

  // Already has it?
  if (/class="canonical-question"|id="canonical-question-heading"/.test(original)) {
    return { status: 'skip-already-present' };
  }

  // Locate the first <h1>...</h1> in the body and insert after.
  const h1Re = /(<h1[^>]*>[\s\S]*?<\/h1>)/;
  const h1Match = original.match(h1Re);
  if (!h1Match) return { status: 'skip-no-h1' };

  const question = decodeHtmlEntities(cqMatch[1]);
  const safe = encodeHtmlEntities(question);

  const insertion = `\n\n  <h2 id="canonical-question-heading" class="canonical-question">${safe}</h2>`;
  // CRITICAL: use a function callback so JS does NOT interpret `$N` patterns
  // in the canonical question text or the H1 (e.g. `$100`, `$1500`) as
  // backreferences. A string replacement would corrupt the file.
  const updated = original.replace(h1Re, (m) => `${m}${insertion}`);

  if (updated === original) return { status: 'skip-no-change' };

  if (!DRY_RUN) fs.writeFileSync(htmlPath, updated, 'utf8');
  return { status: 'updated' };
}

function main() {
  const files = walkHtml(PROTO);
  const counts = { updated: 0, 'skip-already-present': 0, 'skip-not-unit': 0, 'skip-no-h1': 0, 'skip-no-change': 0 };

  for (const file of files) {
    const rel = path.relative(PROTO, file).replace(/\\/g, '/');
    if (CARD_FILTER && !rel.startsWith(CARD_FILTER)) continue;
    const { status } = processFile(file);
    counts[status] = (counts[status] || 0) + 1;
    if (status === 'updated') {
      console.log(`${DRY_RUN ? '[dry-run]' : '[update] '} ${rel}`);
    }
  }

  console.log('');
  console.log('Summary:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`  total scanned: ${files.length}`);
}

main();
