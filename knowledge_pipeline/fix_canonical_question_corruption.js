#!/usr/bin/env node
/**
 * Repair files corrupted by the first run of migrate_canonical_question_h2.js.
 *
 * Bug: JavaScript's String.prototype.replace interprets `$1` in the replacement
 * string as a backreference to capture group 1. Canonical questions / H1s
 * containing `$1XXX` (e.g. `$100`, `$1500`) had `$1` substituted with the
 * captured H1 content, leaving the trailing digits literal.
 *
 * Pattern: outer-tag content contains a nested `<h1>...</h1>` followed by
 * leftover digits. To fix, replace the nested `<h1>...</h1>` with the literal
 * two characters `$1`. The trailing digits stay in place — the result is the
 * original `$1XXX` text.
 *
 * Idempotent. Safe to run more than once.
 *
 * Usage:
 *   node knowledge_pipeline/fix_canonical_question_corruption.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY_RUN = process.argv.includes('--dry-run');

function walkHtml(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'scripts' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, results);
    else if (entry.isFile() && entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

function fixContent(html) {
  // Detect: any tag containing a nested <h1>...</h1>. Specifically we expect
  // the corruption inside the outer <h1> and inside the canonical-question <h2>.
  // We replace the inner `<h1>...</h1>` (non-greedy) with `$1`.
  let updated = html;
  let changed = false;
  let pass = 0;
  // Run up to 3 passes — typically there are 2 corruption sites per file
  // (outer H1 + canonical-question H2). Both share the same captured inner.
  while (pass < 5) {
    pass++;
    // Find an outer block that contains TWO H1 open tags before its first close.
    // Simpler heuristic: any place where </h1> is followed (no intervening start
    // tag pair) by either text-then-</h1> or text-then-</h2>, indicating the
    // outer was H1 or H2 wrapping a nested H1.
    //
    // Concrete pattern: "<h1>" + non-greedy + "<h1>" + non-greedy + "</h1>"
    // — restore by collapsing the inner <h1>...</h1> to "$1".
    const before = updated;
    updated = updated.replace(/<h1[^>]*>([^<]*)<h1[^>]*>([^<]*)<\/h1>/g, (_m, prefix, _inner) => {
      changed = true;
      return `<h1>${prefix}$1`;
    });
    // Same for canonical-question H2 wrapping a nested H1.
    updated = updated.replace(/(<h2[^>]*class="canonical-question"[^>]*>)([^<]*)<h1[^>]*>([^<]*)<\/h1>/g, (_m, h2open, prefix, _inner) => {
      changed = true;
      return `${h2open}${prefix}$1`;
    });
    if (updated === before) break;
  }
  return { updated, changed };
}

function main() {
  const files = walkHtml(PROTO);
  let fixed = 0;
  let clean = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const { updated, changed } = fixContent(original);
    if (!changed) { clean++; continue; }
    const rel = path.relative(PROTO, file).replace(/\\/g, '/');
    if (!DRY_RUN) fs.writeFileSync(file, updated, 'utf8');
    console.log(`${DRY_RUN ? '[dry-run]' : '[fix]    '} ${rel}`);
    fixed++;
  }

  console.log('');
  console.log(`Done. ${fixed} files ${DRY_RUN ? 'would be ' : ''}fixed, ${clean} clean, ${files.length} scanned.`);
}

main();
