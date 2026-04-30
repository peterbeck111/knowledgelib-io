#!/usr/bin/env node
/**
 * Validation script: confirms agent-ready migration applied cleanly across all cards.
 * Checks JSON-LD validity, presence of UCP meta, FAQPage, and <main> wrapper.
 * Also flags any leftover aggregateRating blocks (Google Search Console rejects them on
 * Dataset/TechArticle/DefinedTerm with "Invalid object type for field <parent_node>").
 *
 * Usage: node knowledge_pipeline/validate_agent_ready.js
 */
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = ['css', 'js', 'images', 'api', '.well-known', 'about', 'methodology'];
const SKIP_ROOT = new Set(['index.html', 'about.html', 'methodology.html', 'api.html', 'for-agents.html']);

function walk(d, depth = 0) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.includes(e.name)) continue;
      out.push(...walk(f, depth + 1));
    } else if (e.name.endsWith('.html') && e.name !== 'index.html') {
      if (depth === 0 && SKIP_ROOT.has(e.name)) continue;
      out.push(f);
    }
  }
  return out;
}

const files = walk('prototype');
let total = 0, badJson = 0, missingFAQ = 0, missingUCP = 0, leftoverRating = 0, missingMain = 0;
const badJsonExamples = [];

for (const f of files) {
  const html = fs.readFileSync(f, 'utf-8');
  if (!html.includes('commerce:protocol')) missingUCP++;
  if (!html.includes('FAQPage')) missingFAQ++;
  if (html.includes('aggregateRating')) leftoverRating++;
  if (!html.includes('<main role="main"')) missingMain++;
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    total++;
    try {
      JSON.parse(m[1]);
    } catch (e) {
      badJson++;
      if (badJsonExamples.length < 5) badJsonExamples.push(`${f.replace(/\\/g, '/')}: ${e.message.slice(0, 80)}`);
    }
  }
}

console.log('Files checked:', files.length);
console.log('Total JSON-LD blocks:', total);
console.log('');
console.log('Invalid JSON:           ', badJson);
console.log('Missing UCP meta:       ', missingUCP);
console.log('Missing FAQPage:        ', missingFAQ);
console.log('Leftover aggregateRating:', leftoverRating);
console.log('Missing <main>:         ', missingMain);
if (badJsonExamples.length) {
  console.log('\nFirst few JSON errors:');
  badJsonExamples.forEach(e => console.log(' -', e));
}
