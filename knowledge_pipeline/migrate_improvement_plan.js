#!/usr/bin/env node
/**
 * Migration: Apply improvement plan changes to all existing knowledge cards.
 *
 * Sub-migrations (all idempotent, safe to re-run):
 *   A: Replace `freshness:` with `temporal_validity:` block in .md frontmatter
 *   B: Parse Related Units body links → inject `related_kos:` in .md frontmatter
 *   C: Inject `## Constraints` placeholder in software .md files
 *   D: Inject `ai:temporal_status` + `ai:change_sensitivity` meta tags in .html
 *   E: Inject `<section id="constraints">` in software .html files
 *   F: Add `jurisdiction: global` in .md frontmatter
 *
 * Usage:
 *   node knowledge_pipeline/migrate_improvement_plan.js [--dry-run] [--sub=A,B,C,D,E,F]
 *
 * Examples:
 *   node knowledge_pipeline/migrate_improvement_plan.js --dry-run
 *   node knowledge_pipeline/migrate_improvement_plan.js --sub=A,D
 *   node knowledge_pipeline/migrate_improvement_plan.js
 */

const fs = require('fs');
const path = require('path');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY_RUN = process.argv.includes('--dry-run');
const SUB_ARG = process.argv.find(a => a.startsWith('--sub='));
const SUBS = SUB_ARG
  ? SUB_ARG.replace('--sub=', '').toUpperCase().split(',')
  : ['A', 'B', 'C', 'D', 'E', 'F'];

const SKIP_DIRS = ['css', 'js', 'images', 'api', '.well-known'];

const stats = { updated: 0, skipped: 0, errors: 0 };

// ============================================================
// File discovery
// ============================================================

function findFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      results.push(...findFiles(full, ext));
    } else if (entry.name.endsWith(ext) && entry.name !== 'index.html') {
      results.push(full);
    }
  }
  return results;
}

function isSoftwareCard(filePath) {
  return filePath.replace(/\\/g, '/').includes('/software/');
}

function getEntityCategory(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  if (norm.includes('/software/debugging/')) return 'software_debugging';
  if (norm.includes('/software/migrations/')) return 'software_migrations';
  if (norm.includes('/software/')) return 'software_other';
  if (norm.includes('/energy/')) return 'energy';
  return 'product';
}

// ============================================================
// Sub-migration A: temporal_validity in .md
// ============================================================

function migrateA(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // Already migrated?
  if (content.includes('temporal_validity:')) {
    return false;
  }

  // Find freshness line
  const freshnessMatch = content.match(/^freshness:\s*(.+)$/m);
  if (!freshnessMatch) {
    return false;
  }

  const oldFreshness = freshnessMatch[1].trim();
  const category = getEntityCategory(filePath);

  let status, changeSensitivity, nextReviewMonths;
  switch (category) {
    case 'software_debugging':
      status = 'stable'; changeSensitivity = 'low'; nextReviewMonths = 12;
      break;
    case 'software_migrations':
      status = 'evolving'; changeSensitivity = 'medium'; nextReviewMonths = 6;
      break;
    case 'energy':
      status = 'evolving'; changeSensitivity = 'medium'; nextReviewMonths = 3;
      break;
    default:
      status = 'volatile'; changeSensitivity = 'high'; nextReviewMonths = 1;
  }

  // Compute next_review from last_verified
  const verifiedMatch = content.match(/^last_verified:\s*(\d{4}-\d{2}-\d{2})$/m);
  let nextReview;
  if (verifiedMatch) {
    const d = new Date(verifiedMatch[1]);
    d.setMonth(d.getMonth() + nextReviewMonths);
    nextReview = d.toISOString().split('T')[0];
  } else {
    const d = new Date();
    d.setMonth(d.getMonth() + nextReviewMonths);
    nextReview = d.toISOString().split('T')[0];
  }

  const temporalBlock = [
    '',
    '# === TEMPORAL VALIDITY ===',
    'temporal_validity:',
    `  status: ${status}`,
    '  last_breaking_change: null',
    `  next_review: ${nextReview}`,
    `  change_sensitivity: ${changeSensitivity}`,
  ].join('\n');

  // Replace freshness line with temporal_validity block
  content = content.replace(
    /^freshness:\s*.+$/m,
    `# freshness: ${oldFreshness}  # deprecated — see temporal_validity${temporalBlock}`
  );

  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

// ============================================================
// Sub-migration B: related_kos in .md
// ============================================================

function migrateB(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // Already migrated?
  if (content.includes('related_kos:')) {
    return false;
  }

  // Parse Related Units from body
  const relatedSection = content.match(/## Related Units\n([\s\S]*?)(?=\n## |\n---|\Z)/);
  if (!relatedSection) return false;

  const linkPattern = /- \[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkPattern.exec(relatedSection[1])) !== null) {
    const label = match[1];
    const href = match[2];
    // Normalize path: strip leading / and trailing whitespace
    const id = href.replace(/^\//, '').trim();
    if (id) links.push({ id, label });
  }

  if (links.length === 0) return false;

  // Build related_kos block
  const relatedLines = [
    '',
    '# === RELATED UNITS ===',
    'related_kos:',
    '  related_to:',
  ];
  for (const link of links) {
    relatedLines.push(`    - id: "${link.id}"`);
    relatedLines.push(`      label: "${link.label}"`);
  }
  relatedLines.push('  depends_on: []');
  relatedLines.push('  solves: []');
  relatedLines.push('  alternative_to: []');

  const relatedBlock = relatedLines.join('\n');

  // Insert before sources block in frontmatter
  const sourcesIndex = content.indexOf('# === SOURCES');
  if (sourcesIndex === -1) {
    // Fallback: insert before first source entry
    const srcIndex = content.indexOf('sources:');
    if (srcIndex === -1) return false;
    content = content.slice(0, srcIndex) + relatedBlock + '\n\n' + content.slice(srcIndex);
  } else {
    content = content.slice(0, sourcesIndex) + relatedBlock + '\n\n' + content.slice(sourcesIndex);
  }

  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

// ============================================================
// Sub-migration C: ## Constraints in software .md
// ============================================================

function migrateC(filePath) {
  if (!isSoftwareCard(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // Already has Constraints section?
  if (content.includes('## Constraints')) return false;

  // Find ## TL;DR and the section after it
  const tldrIndex = content.indexOf('## TL;DR');
  if (tldrIndex === -1) return false;

  // Find next ## heading after TL;DR
  const afterTldr = content.indexOf('\n## ', tldrIndex + 8);
  if (afterTldr === -1) return false;

  const constraintsBlock = [
    '',
    '## Constraints',
    '<!-- TODO: Fill with 3-6 key constraints an agent must know before recommending actions.',
    '     Extract from Important Caveats, Anti-Patterns, and Common Pitfalls sections. -->',
    '',
    '- <!-- Constraint 1: safety-critical rule or hard requirement -->',
    '- <!-- Constraint 2: version/platform requirement -->',
    '- <!-- Constraint 3: action that must never be taken -->',
    '',
  ].join('\n');

  content = content.slice(0, afterTldr) + constraintsBlock + content.slice(afterTldr);

  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

// ============================================================
// Sub-migration D: ai:temporal_status + ai:change_sensitivity in .html
// ============================================================

function migrateD(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = html.includes('\r\n');
  html = html.replace(/\r\n/g, '\n');

  // Already migrated?
  if (html.includes('ai:temporal_status')) return false;

  const category = getEntityCategory(filePath);
  let status, changeSensitivity;
  switch (category) {
    case 'software_debugging':
      status = 'stable'; changeSensitivity = 'low'; break;
    case 'software_migrations':
      status = 'evolving'; changeSensitivity = 'medium'; break;
    case 'energy':
      status = 'evolving'; changeSensitivity = 'medium'; break;
    default:
      status = 'volatile'; changeSensitivity = 'high';
  }

  // Insert after ai:freshness line
  const freshnessTag = html.match(/<meta name="ai:freshness" content="[^"]*">/);
  if (!freshnessTag) {
    // Fallback: insert after ai:source_count
    const sourceTag = html.match(/<meta name="ai:source_count" content="[^"]*">/);
    if (!sourceTag) return false;

    const insertPoint = html.indexOf(sourceTag[0]) + sourceTag[0].length;
    const newTags = [
      '',
      `  <meta name="ai:temporal_status" content="${status}">`,
      `  <meta name="ai:change_sensitivity" content="${changeSensitivity}">`,
    ].join('\n');

    html = html.slice(0, insertPoint) + newTags + html.slice(insertPoint);
  } else {
    const insertPoint = html.indexOf(freshnessTag[0]) + freshnessTag[0].length;
    const newTags = [
      '',
      `  <meta name="ai:temporal_status" content="${status}">`,
      `  <meta name="ai:change_sensitivity" content="${changeSensitivity}">`,
    ].join('\n');

    html = html.slice(0, insertPoint) + newTags + html.slice(insertPoint);
  }

  if (hadCRLF) html = html.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(filePath, html, 'utf-8');
  return true;
}

// ============================================================
// Sub-migration E: <section id="constraints"> in software .html
// ============================================================

function migrateE(filePath) {
  if (!isSoftwareCard(filePath)) return false;

  let html = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = html.includes('\r\n');
  html = html.replace(/\r\n/g, '\n');

  // Already has constraints section?
  if (html.includes('id="constraints"')) return false;

  // Find closing of TL;DR section
  const tldrClose = html.indexOf('</section>', html.indexOf('id="tldr"'));
  if (tldrClose === -1) return false;

  const insertPoint = html.indexOf('</section>', tldrClose) === tldrClose
    ? tldrClose + '</section>'.length
    : tldrClose + '</section>'.length;

  const constraintsHtml = [
    '',
    '',
    '  <!-- Constraints — agents: read before recommending any action -->',
    '  <section id="constraints">',
    '  <h2>Constraints</h2>',
    '  <ul>',
    '    <li><!-- TODO: Fill with key constraints from Anti-Patterns and Caveats --></li>',
    '  </ul>',
    '  </section>',
  ].join('\n');

  html = html.slice(0, insertPoint) + constraintsHtml + html.slice(insertPoint);

  // Also update ai:sections if present
  html = html.replace(
    /(<meta name="ai:sections" content="tldr,)/,
    '$1constraints,'
  );

  if (hadCRLF) html = html.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(filePath, html, 'utf-8');
  return true;
}

// ============================================================
// Sub-migration F: jurisdiction in .md
// ============================================================

function migrateF(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // Already has jurisdiction?
  if (content.match(/^jurisdiction:/m)) return false;

  // Determine jurisdiction from path
  const norm = filePath.replace(/\\/g, '/');
  const jurisdiction = norm.includes('/energy/us/') ? 'US' : 'global';

  // Insert after region: line in frontmatter
  const regionMatch = content.match(/^region:\s*.+$/m);
  if (!regionMatch) return false;

  const insertPoint = content.indexOf(regionMatch[0]) + regionMatch[0].length;
  content = content.slice(0, insertPoint) + `\njurisdiction: ${jurisdiction}` + content.slice(insertPoint);

  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

// ============================================================
// Main
// ============================================================

function run() {
  console.log(`\n=== Improvement Plan Migration ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files modified)' : 'LIVE'}`);
  console.log(`Sub-migrations: ${SUBS.join(', ')}\n`);

  const mdFiles = findFiles(PROTO, '.md');
  const htmlFiles = findFiles(PROTO, '.html');

  console.log(`Found: ${mdFiles.length} .md files, ${htmlFiles.length} .html files\n`);

  const migrations = {
    A: { files: mdFiles, fn: migrateA, label: 'temporal_validity in .md' },
    B: { files: mdFiles, fn: migrateB, label: 'related_kos in .md' },
    C: { files: mdFiles, fn: migrateC, label: '## Constraints in software .md' },
    D: { files: htmlFiles, fn: migrateD, label: 'ai:temporal_status in .html' },
    E: { files: htmlFiles, fn: migrateE, label: '<section id="constraints"> in software .html' },
    F: { files: mdFiles, fn: migrateF, label: 'jurisdiction in .md' },
  };

  for (const sub of SUBS) {
    const m = migrations[sub];
    if (!m) {
      console.log(`Unknown sub-migration: ${sub}\n`);
      continue;
    }

    console.log(`--- Sub-migration ${sub}: ${m.label} ---`);
    let updated = 0, skipped = 0, errors = 0;

    for (const file of m.files) {
      try {
        const changed = m.fn(file);
        if (changed) {
          updated++;
          if (DRY_RUN) {
            const rel = path.relative(PROTO, file);
            console.log(`  [would update] ${rel}`);
          }
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
        const rel = path.relative(PROTO, file);
        console.error(`  [error] ${rel}: ${err.message}`);
      }
    }

    console.log(`  Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}\n`);
    stats.updated += updated;
    stats.skipped += skipped;
    stats.errors += errors;
  }

  console.log(`=== Summary ===`);
  console.log(`Total updated: ${stats.updated}`);
  console.log(`Total skipped: ${stats.skipped}`);
  console.log(`Total errors: ${stats.errors}`);
  if (DRY_RUN) console.log(`\n(Dry run — no files were modified. Remove --dry-run to apply.)`);
}

run();
