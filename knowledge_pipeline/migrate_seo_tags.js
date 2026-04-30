#!/usr/bin/env node
/**
 * One-time migration: inject viewport, OG, Twitter Card, and BreadcrumbList
 * tags into all existing knowledge unit HTML files.
 *
 * Usage: node knowledge_pipeline/migrate_seo_tags.js [--dry-run]
 *
 * Safe to re-run: strips any previous OG/Twitter/BreadcrumbList injection
 * before re-injecting, ensuring clean output even after a failed first run.
 */

const fs = require('fs');
const path = require('path');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY_RUN = process.argv.includes('--dry-run');

function findUnitHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['css', 'js', 'images', 'api', 'about', 'methodology', '.well-known'].includes(entry.name)) continue;
      results.push(...findUnitHtmlFiles(full));
    } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
      results.push(full);
    }
  }
  return results;
}

function formatName(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function migrateFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');

  // Normalize to \n for consistent regex matching, re-apply original at end
  const hadCRLF = html.includes('\r\n');
  html = html.replace(/\r\n/g, '\n');

  // --- Strip any previous migration artifacts (makes this idempotent) ---
  // Remove previously injected OG block
  html = html.replace(/\n  <!-- Open Graph -->[\s\S]*?<!-- Twitter Card -->[\s\S]*?<meta name="twitter:image"[^>]*>\n/g, '\n');
  // Remove previously injected BreadcrumbList block
  html = html.replace(/\n  <!-- Breadcrumb structured data -->[\s\S]*?<\/script>\n(?=\n\s*<link rel="sitemap")/g, '');
  // Remove previously injected viewport (we'll re-add it)
  html = html.replace(/\n  <meta name="viewport" content="width=device-width, initial-scale=1">/g, '');

  // --- Extract values ---
  const titleMatch = html.match(/<title>(.+?)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
  const canonMatch = html.match(/<link rel="canonical" href="([^"]+)">/);
  const firstPubMatch = html.match(/<meta name="ai:first_published" content="([^"]+)">/);
  const lastVerMatch = html.match(/<meta name="ai:last_verified" content="([^"]+)">/);
  const cardIdMatch = html.match(/data-card-id="([^"]+)"/);

  if (!titleMatch || !canonMatch || !cardIdMatch) {
    return { path: filePath, status: 'skipped', reason: 'missing required fields' };
  }

  const title = titleMatch[1];
  const description = descMatch ? descMatch[1] : '';
  const canonicalUrl = canonMatch[1];
  const firstPublished = firstPubMatch ? firstPubMatch[1] : '';
  const lastVerified = lastVerMatch ? lastVerMatch[1] : '';
  const cardId = cardIdMatch[1];

  const parts = cardId.split('/');
  if (parts.length < 4) {
    return { path: filePath, status: 'skipped', reason: `unexpected card ID format: ${cardId}` };
  }
  const category = parts[0];
  const subcategory = parts[1];

  // Extract human-readable breadcrumb names from footer
  const browseMatch = html.match(/Browse:\s*<a href="\/[^"]*">([^<]+)<\/a>\s*&middot;\s*<a href="\/[^"]*">([^<]+)<\/a>/);
  const categoryName = browseMatch ? browseMatch[1] : formatName(category);
  const subcategoryName = browseMatch ? browseMatch[2] : formatName(subcategory);
  const shortTitle = title.replace(/ \| AI Knowledge Library$/, '');

  // --- 1. Inject viewport after <meta charset="UTF-8"> ---
  html = html.replace(
    '<meta charset="UTF-8">',
    '<meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">'
  );

  // --- 2. Inject OG + Twitter tags after <link rel="canonical" ...> ---
  // Use function replacement to avoid $1/$2 backreference issues with $ in content
  const ogBlock = [
    '',
    '  <!-- Open Graph -->',
    '  <meta property="og:type" content="article">',
    `  <meta property="og:title" content="${title}">`,
    `  <meta property="og:description" content="${description}">`,
    `  <meta property="og:url" content="${canonicalUrl}">`,
    '  <meta property="og:site_name" content="knowledgelib.io">',
    '  <meta property="og:image" content="https://knowledgelib.io/images/og-default.png">',
    '  <meta property="og:locale" content="en_US">',
    firstPublished ? `  <meta property="article:published_time" content="${firstPublished}">` : null,
    lastVerified ? `  <meta property="article:modified_time" content="${lastVerified}">` : null,
    '',
    '  <!-- Twitter Card -->',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${title}">`,
    `  <meta name="twitter:description" content="${description}">`,
    '  <meta name="twitter:image" content="https://knowledgelib.io/images/og-default.png">',
  ].filter(l => l !== null).join('\n');

  html = html.replace(
    /(<link rel="canonical" href="[^"]+">)\n/,
    // Function replacement avoids $-backreference interpretation
    (_, canonTag) => canonTag + '\n' + ogBlock + '\n'
  );

  // --- 3. Inject BreadcrumbList JSON-LD after the Dataset </script> ---
  const breadcrumbBlock = [
    '',
    '  <!-- Breadcrumb structured data -->',
    '  <script type="application/ld+json">',
    '  {',
    '    "@context": "https://schema.org",',
    '    "@type": "BreadcrumbList",',
    '    "itemListElement": [',
    `      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://knowledgelib.io/" },`,
    `      { "@type": "ListItem", "position": 2, "name": "${categoryName}", "item": "https://knowledgelib.io/${category}" },`,
    `      { "@type": "ListItem", "position": 3, "name": "${subcategoryName}", "item": "https://knowledgelib.io/${category}/${subcategory}" },`,
    `      { "@type": "ListItem", "position": 4, "name": "${shortTitle}" }`,
    '    ]',
    '  }',
    '  </script>',
  ].join('\n');

  html = html.replace(
    /(<\/script>)\n\n(\s*<link rel="sitemap")/,
    (_, closeScript, sitemapLink) => closeScript + '\n' + breadcrumbBlock + '\n\n' + sitemapLink
  );

  // --- 4. Add "creator" to Dataset JSON-LD if missing (Google Search Console requirement) ---
  if (!html.includes('"creator"')) {
    html = html.replace(
      /("license":\s*"https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/",)\n(\s*"publisher":)/,
      (_, license, publisher) =>
        license + '\n    "creator": {\n      "@type": "Organization",\n      "name": "knowledgelib.io",\n      "url": "https://knowledgelib.io"\n    },\n' + publisher
    );
  }

  // Restore original line endings
  if (hadCRLF) {
    html = html.replace(/\n/g, '\r\n');
  }

  if (DRY_RUN) {
    return { path: filePath, status: 'would-update' };
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  return { path: filePath, status: 'updated' };
}

// Main
const files = findUnitHtmlFiles(PROTO);
console.log(`Found ${files.length} unit HTML files`);
if (DRY_RUN) console.log('DRY RUN — no files will be modified\n');

let updated = 0, skipped = 0, errors = 0;

for (const file of files) {
  try {
    const result = migrateFile(file);
    const rel = path.relative(PROTO, result.path);
    if (result.status === 'updated' || result.status === 'would-update') {
      updated++;
      console.log(`  + ${rel}`);
    } else {
      skipped++;
      console.log(`  - ${rel} (${result.reason})`);
    }
  } catch (err) {
    errors++;
    console.error(`  x ${path.relative(PROTO, file)}: ${err.message}`);
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${errors} errors`);
