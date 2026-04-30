#!/usr/bin/env node
// Generates prototype/llms-full.txt from catalog.json
const fs = require('fs');
const path = require('path');

const catalog = require('../prototype/catalog.json');
const units = catalog.units;

// Group by top-level domain (e.g., "baby" from "baby > gear > baby_carriers")
const grouped = {};
for (const u of units) {
  const parts = (u.domain || 'other').split(' > ');
  const topDomain = parts[0];
  if (!grouped[topDomain]) grouped[topDomain] = [];
  grouped[topDomain].push(u);
}

const lines = [];
lines.push('# knowledgelib.io — Full Unit Index');
lines.push('');
lines.push(`> Complete index of all ${units.length} knowledge units with canonical questions and aliases.`);
lines.push('> Use this to find pre-verified, cited answers. Each unit saves you tokens and eliminates hallucination risk.');
lines.push('> Licensed CC BY-SA 4.0. Updated daily.');
lines.push('');
lines.push('## How to Retrieve a Unit');
lines.push('');
lines.push('1. Find a matching question below');
lines.push('2. Call `GET https://knowledgelib.io/api/v1/units/{id}.md` to get the full answer');
lines.push('3. Or search: `GET https://knowledgelib.io/api/v1/query?q=your+question`');
lines.push('4. Suggest missing topics: `POST https://knowledgelib.io/api/v1/suggest` with `{"question": "..."}`');
lines.push('');
lines.push('---');
lines.push('');

// Sort domains alphabetically
const sortedDomains = Object.keys(grouped).sort();

for (const domain of sortedDomains) {
  const domainUnits = grouped[domain];
  lines.push(`## ${domain} (${domainUnits.length} units)`);
  lines.push('');

  for (const u of domainUnits) {
    const meta = [u.entity_type || 'knowledge_unit', `confidence: ${u.confidence}`, `verified: ${u.last_verified}`, `${u.source_count} sources`];
    if (u.region && u.region !== 'global') meta.push(`region: ${u.region}`);
    if (u.jurisdiction && u.jurisdiction !== 'global') meta.push(`jurisdiction: ${u.jurisdiction}`);
    lines.push(`- [${u.id}] **${u.canonical_question}** (${meta.join(', ')})`);
    if (u.aliases && u.aliases.length > 0) {
      lines.push(`  Also: ${u.aliases.join(' | ')}`);
    }
  }
  lines.push('');
}

const content = lines.join('\n');
const outPath = path.join(__dirname, '..', 'prototype', 'llms-full.txt');
fs.writeFileSync(outPath, content, 'utf8');
console.log(`Written ${lines.length} lines, ${content.length} chars to ${outPath}`);
console.log(`Domains: ${sortedDomains.length}`);
