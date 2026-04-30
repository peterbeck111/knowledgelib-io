#!/usr/bin/env node
/**
 * Extract long code blocks from software reference .md files into separate
 * script files under a scripts/ subdirectory alongside each card.
 *
 * This reduces token cost for API consumers by ~40%.
 * Only extracts code blocks >25 lines (configurable via --min-lines=N).
 *
 * Usage:
 *   node knowledge_pipeline/extract_scripts.js [--dry-run] [--min-lines=25]
 *
 * What it does:
 *   1. Scans prototype/software/**\/*.md for fenced code blocks >N lines
 *   2. Extracts each to scripts/{name}.{ext} alongside the card
 *   3. Replaces inline block with short excerpt + link to full script
 *
 * Idempotent: skips files that already have a scripts/ directory with content.
 */

const fs = require('fs');
const path = require('path');

const PROTO = path.join(__dirname, '..', 'prototype');
const SOFTWARE_DIR = path.join(PROTO, 'software');
const DRY_RUN = process.argv.includes('--dry-run');
const MIN_LINES_ARG = process.argv.find(a => a.startsWith('--min-lines='));
const MIN_LINES = MIN_LINES_ARG ? parseInt(MIN_LINES_ARG.split('=')[1], 10) : 25;

const LANG_TO_EXT = {
  bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh',
  python: 'py', py: 'py', python3: 'py',
  javascript: 'js', js: 'js', node: 'js',
  typescript: 'ts', ts: 'ts',
  jsx: 'jsx', tsx: 'tsx',
  go: 'go', golang: 'go',
  java: 'java',
  ruby: 'rb',
  rust: 'rs',
  sql: 'sql',
  yaml: 'yml', yml: 'yml',
  json: 'json',
  toml: 'toml',
  dockerfile: 'Dockerfile',
  '': 'txt',
};

const stats = { files_processed: 0, scripts_extracted: 0, files_skipped: 0 };

function findSoftwareMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'scripts') continue;
      results.push(...findSoftwareMdFiles(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function extractScripts(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const hadCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  const cardDir = path.dirname(filePath);
  const scriptsDir = path.join(cardDir, 'scripts');

  // Check if already extracted (scripts/ dir exists with files)
  if (fs.existsSync(scriptsDir)) {
    const existing = fs.readdirSync(scriptsDir);
    if (existing.length > 0) {
      return { extracted: 0, reason: 'scripts/ already exists' };
    }
  }

  // Find all fenced code blocks
  const codeBlockRegex = /^(###?\s+.+)\n\n```(\w*)\n([\s\S]*?)```$/gm;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const heading = match[1].trim();
    const lang = match[2] || '';
    const code = match[3];
    const lines = code.split('\n').filter(l => l.trim().length > 0);

    if (lines.length >= MIN_LINES) {
      blocks.push({
        fullMatch: match[0],
        heading,
        lang,
        code,
        lineCount: lines.length,
        startIndex: match.index,
      });
    }
  }

  if (blocks.length === 0) return { extracted: 0, reason: 'no long code blocks' };

  // Create scripts directory
  if (!DRY_RUN) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  let extracted = 0;
  const usedNames = new Set();

  for (const block of blocks) {
    // Derive script filename from heading
    let baseName = slugify(block.heading.replace(/^#+\s*/, ''));
    if (usedNames.has(baseName)) {
      baseName = `${baseName}-${extracted + 1}`;
    }
    usedNames.add(baseName);

    const ext = LANG_TO_EXT[block.lang.toLowerCase()] || 'txt';
    const scriptFileName = `${baseName}.${ext}`;
    const scriptPath = path.join(scriptsDir, scriptFileName);

    // Write the script file
    if (!DRY_RUN) {
      fs.writeFileSync(scriptPath, block.code, 'utf-8');
    }

    // Build excerpt (first 5 non-empty lines + comment)
    const codeLines = block.code.split('\n');
    const excerptLines = codeLines.filter(l => l.trim().length > 0).slice(0, 5);
    const excerpt = excerptLines.join('\n');

    // Replace inline block with excerpt + link
    const replacement = [
      block.heading,
      '',
      `> Full script: [${scriptFileName}](scripts/${scriptFileName}) (${block.lineCount} lines)`,
      '',
      '```' + block.lang,
      excerpt,
      '# ... (see full script)',
      '```',
    ].join('\n');

    content = content.replace(block.fullMatch, replacement);
    extracted++;

    if (DRY_RUN) {
      const rel = path.relative(PROTO, scriptPath);
      console.log(`  [would extract] ${rel} (${block.lineCount} lines)`);
    }
  }

  // Write updated .md
  if (hadCRLF) content = content.replace(/\n/g, '\r\n');
  if (!DRY_RUN && extracted > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { extracted };
}

function run() {
  console.log(`\n=== Script Extraction Tool ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Min lines: ${MIN_LINES}\n`);

  if (!fs.existsSync(SOFTWARE_DIR)) {
    console.log('No software/ directory found. Nothing to do.');
    return;
  }

  const mdFiles = findSoftwareMdFiles(SOFTWARE_DIR);
  console.log(`Found: ${mdFiles.length} software .md files\n`);

  for (const file of mdFiles) {
    const rel = path.relative(PROTO, file);
    try {
      const result = extractScripts(file);
      if (result.extracted > 0) {
        stats.files_processed++;
        stats.scripts_extracted += result.extracted;
        if (!DRY_RUN) console.log(`  [updated] ${rel} — ${result.extracted} script(s) extracted`);
      } else {
        stats.files_skipped++;
      }
    } catch (err) {
      console.error(`  [error] ${rel}: ${err.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files processed: ${stats.files_processed}`);
  console.log(`Scripts extracted: ${stats.scripts_extracted}`);
  console.log(`Files skipped: ${stats.files_skipped}`);
  if (DRY_RUN) console.log(`\n(Dry run — no files were modified.)`);
}

run();
