#!/usr/bin/env node
/**
 * Migration: agent-ready schema additions for every existing knowledge card.
 *
 * Adds (idempotently — safe to re-run):
 *   1. Universal Commerce Protocol meta tags
 *   2. AggregateRating field on the existing Dataset / TechArticle / DefinedTerm JSON-LD block
 *   3. FAQPage JSON-LD block (canonical_question + aliases as Q/A pairs)
 *   4. Product + Offer + Review JSON-LD graph (product_comparison cards only — one Product per buy_link)
 *   5. ARIA labels on common landmarks (confidence-badge, unit-meta, tables, related-links, footer, buy links)
 *   6. <main role="main"> wrapper around card body content
 *
 * Usage:
 *   node knowledge_pipeline/migrate_agent_ready.js [--dry-run] [--limit N] [--only path/glob]
 *
 * Examples:
 *   node knowledge_pipeline/migrate_agent_ready.js --dry-run --limit 3
 *   node knowledge_pipeline/migrate_agent_ready.js --only consumer-electronics/audio
 *   node knowledge_pipeline/migrate_agent_ready.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PROTO = path.join(__dirname, '..', 'prototype');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : Infinity;
const ONLY_ARG = process.argv.find(a => a.startsWith('--only='));
const ONLY = ONLY_ARG ? ONLY_ARG.split('=')[1] : null;

const SKIP_DIRS = ['css', 'js', 'images', 'api', '.well-known', 'about', 'methodology'];
// Static pages at prototype root that aren't unit cards
const SKIP_ROOT_FILES = new Set([
  'index.html', 'about.html', 'methodology.html', 'api.html',
  'for-agents.html', 'glossary.html', 'examples.html', 'pricing.html',
]);

const stats = { processed: 0, updated: 0, skipped: 0, errors: 0 };

function findUnitHtml(dir, depth = 0) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      out.push(...findUnitHtml(full, depth + 1));
    } else if (entry.name.endsWith('.html')) {
      if (depth === 0 && SKIP_ROOT_FILES.has(entry.name)) continue;
      if (entry.name === 'index.html') continue;
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(mdContent) {
  const normalized = mdContent.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try {
    return yaml.load(m[1]);
  } catch (err) {
    return null;
  }
}

function extractSummaryText(mdContent) {
  // Match "## Summary" or "## TL;DR" or "## Definition" or "## Rule" (the primary section)
  const headings = ['Summary', 'TL;DR', 'TL\\\\;DR', 'Definition', 'Rule', 'Fact', 'Overview'];
  for (const h of headings) {
    const re = new RegExp(`^##\\s+${h}\\s*\\n+([\\s\\S]+?)(?=\\n##\\s|$)`, 'm');
    const match = mdContent.match(re);
    if (match) {
      // Strip markdown links/citations and code, take plain text
      let txt = match[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')           // [text](url) → text
        .replace(/\[src\d+(?:,\s*src\d+)*\]/g, '')          // [src1, src2]
        .replace(/`([^`]+)`/g, '$1')                          // `code` → code
        .replace(/\*\*([^*]+)\*\*/g, '$1')                    // **bold** → bold
        .replace(/\s+/g, ' ')
        .trim();
      // Take first 600 chars
      if (txt.length > 600) txt = txt.slice(0, 597) + '...';
      return txt;
    }
  }
  return null;
}

function extractProductPriceFromTable(mdContent, productName) {
  // Find a markdown table row containing the product name. Pattern: | Product Name | ~$N or $N |
  const lines = mdContent.split(/\r?\n/);
  // Build candidate match: case-insensitive substring match on product_name
  const target = productName.toLowerCase();
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 3) continue;
    // First non-empty cell is the product
    const nameCell = cells[1] || '';
    if (!nameCell.toLowerCase().includes(target.split(' ')[0].toLowerCase())) continue;
    // Looser match: check all words of target name appear in nameCell
    const words = target.split(/\s+/).filter(w => w.length > 2);
    const ok = words.every(w => nameCell.toLowerCase().includes(w));
    if (!ok) continue;
    // Look for a price pattern in any cell
    for (const cell of cells) {
      const m = cell.match(/\$\s*(\d{1,4}(?:[.,]\d{1,2})?)/);
      if (m) return m[1].replace(/,/g, '');
    }
  }
  return null;
}

function extractReviewSnippetForProduct(mdContent, productName) {
  // Look for "### ... {productName} ..." then take first sentence of the following paragraph
  const target = productName.toLowerCase();
  const blocks = mdContent.split(/\r?\n/);
  for (let i = 0; i < blocks.length; i++) {
    const line = blocks[i];
    if (!line.startsWith('### ')) continue;
    if (!line.toLowerCase().includes(target.split(' ')[0].toLowerCase())) continue;
    const words = target.split(/\s+/).filter(w => w.length > 2);
    if (!words.every(w => line.toLowerCase().includes(w))) continue;
    // Find the next non-empty, non-heading line as the body
    for (let j = i + 1; j < blocks.length && j < i + 8; j++) {
      const candidate = blocks[j].trim();
      if (!candidate) continue;
      if (candidate.startsWith('#')) break;
      // Strip citations, take first sentence
      let sentence = candidate
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\[src\d+(?:,\s*src\d+)*\]/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      const dot = sentence.search(/\.(\s|$)/);
      if (dot > 0) sentence = sentence.slice(0, dot + 1);
      if (sentence.length > 280) sentence = sentence.slice(0, 277) + '...';
      return sentence;
    }
  }
  return null;
}

function escapeJsonString(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
}

function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildFaqBlock(canonicalQuestion, aliases, answerText) {
  const questions = [canonicalQuestion, ...(Array.isArray(aliases) ? aliases.slice(0, 5) : [])];
  const seen = new Set();
  const entities = questions
    .filter(q => q && typeof q === 'string')
    .filter(q => { if (seen.has(q)) return false; seen.add(q); return true; })
    .map(q => `      {
        "@type": "Question",
        "name": "${escapeJsonString(q)}",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "${escapeJsonString(answerText)}"
        }
      }`)
    .join(',\n');
  return `  <!-- FAQPage structured data — canonical question + aliases (auto-generated) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
${entities}
    ]
  }
  </script>

`;
}

function buildProductGraph(cardId, buyLinks, mdContent) {
  if (!Array.isArray(buyLinks) || buyLinks.length === 0) return null;
  const graphItems = [];
  for (const bl of buyLinks) {
    if (!bl.slug || !bl.product_name) continue;
    const price = extractProductPriceFromTable(mdContent, bl.product_name);
    const review = extractReviewSnippetForProduct(mdContent, bl.product_name)
      || `Editorial pick from knowledgelib.io comparison.`;
    const offerFields = [
      `          "@type": "Offer"`,
      ...(price ? [`          "price": "${price}"`, `          "priceCurrency": "USD"`] : []),
      `          "availability": "https://schema.org/InStock"`,
      `          "url": "https://knowledgelib.io/go/${bl.slug}"`,
      `          "seller": {"@type": "Organization", "name": "Amazon"}`,
    ].join(',\n');
    graphItems.push(`      {
        "@type": "Product",
        "@id": "https://knowledgelib.io/${cardId}#product-${bl.slug}",
        "name": "${escapeJsonString(bl.product_name)}",
        "url": "https://knowledgelib.io/go/${bl.slug}",
        ${bl.asin ? `"sku": "${escapeJsonString(bl.asin)}",
        ` : ''}"offers": {
${offerFields}
        },
        "review": {
          "@type": "Review",
          "author": {"@type": "Organization", "name": "knowledgelib.io"},
          "reviewBody": "${escapeJsonString(review)}",
          "itemReviewed": {"@type": "Product", "name": "${escapeJsonString(bl.product_name)}"}
        }
      }`);
  }
  if (graphItems.length === 0) return null;
  return `  <!-- Product + Offer + Review structured data — agent-shoppable signals (auto-generated) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
${graphItems.join(',\n')}
    ]
  }
  </script>

`;
}

function buildUcpMeta(buyLinkCount) {
  return `
  <!-- Universal Commerce Protocol — agent-readiness signals (auto-generated) -->
  <meta name="commerce:protocol" content="schema.org-offer; ucp">
  <meta name="commerce:agent-ready" content="true">
  <meta name="commerce:checkout-via" content="${buyLinkCount > 0 ? 'affiliate-redirect' : 'none'}">
  <meta name="commerce:offers-count" content="${buyLinkCount}">
${buyLinkCount > 0 ? '  <meta name="commerce:currency" content="USD">\n' : ''}`;
}

function migrateFile(htmlPath) {
  const mdPath = htmlPath.replace(/\.html$/, '.md');
  if (!fs.existsSync(mdPath)) {
    return { status: 'skipped', reason: 'no matching .md' };
  }
  let md = fs.readFileSync(mdPath, 'utf-8');
  md = md.replace(/\r\n/g, '\n');
  const fm = parseFrontmatter(md);
  if (!fm || !fm.canonical_question) {
    return { status: 'skipped', reason: 'no/invalid frontmatter' };
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');
  const hadCRLF = html.includes('\r\n');
  html = html.replace(/\r\n/g, '\n');
  const orig = html;

  const entityType = (fm.entity_type || '').toString();
  const isProduct = entityType === 'product_comparison';
  const buyLinks = isProduct && Array.isArray(fm.buy_links) ? fm.buy_links : [];
  const summaryText = extractSummaryText(md) || `${fm.canonical_question}`;
  const cardId = fm.id || htmlPath
    .replace(/\\/g, '/')
    .replace(/.*\/prototype\//, '')
    .replace(/\.html$/, '');

  // ---- 1. Strip prior auto-generated sections (idempotent re-run) ----
  // Remove prior UCP meta block (auto-generated marker)
  html = html.replace(/\n  <!-- Universal Commerce Protocol[^\n]*-->\n(?:  <meta name="commerce:[^"]+" content="[^"]*">\n)+/g, '\n');
  // Remove prior auto-generated FAQPage block (and any hand-coded FAQPage — we always replace
  // with the auto-generated, canonical-question + aliases form for consistency)
  html = html.replace(/  <!-- FAQPage structured data — canonical question \+ aliases \(auto-generated\) -->\n  <script type="application\/ld\+json">\n  \{[\s\S]*?\n  \}\n  <\/script>\n\n/g, '');
  // Also strip any other FAQPage block, including hand-coded ones, to avoid duplicates.
  html = html.replace(/(?:\s*<!--[^\n]*FAQ[^\n]*-->\n)?\s*<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"FAQPage",[\s\S]*?<\/script>\n?/g, '');
  // Remove prior auto-generated Product graph block
  html = html.replace(/  <!-- Product \+ Offer \+ Review structured data — agent-shoppable signals \(auto-generated\) -->\n  <script type="application\/ld\+json">\n  \{[\s\S]*?\n  \}\n  <\/script>\n\n/g, '');
  // Strip any aggregateRating block from earlier migrations.
  // Google Search Console rejects aggregateRating on Dataset/TechArticle/DefinedTerm
  // ("Invalid object type for field <parent_node>"). Editorial confidence is exposed via
  // <meta name="ai:confidence"> and the visible badge instead.
  html = html.replace(/,\s*"aggregateRating":\s*\{[\s\S]*?"name":\s*"Editorial confidence \(per \/methodology\)"\s*\}/g, '');
  html = html.replace(/"aggregateRating":\s*\{[\s\S]*?"name":\s*"Editorial confidence \(per \/methodology\)"\s*\},\s*/g, '');

  // ---- 2. Inject UCP meta block — placed after the last ai:* meta tag ----
  // Allow ai:* meta tags to span multiple lines (long content attribute split for readability)
  const lastAiRegex = /(<meta name="ai:[^"]+"\s+content="[^"]*">)(\s*\n)(?!\s*<meta name="ai:)/;
  const ucpBlock = buildUcpMeta(buyLinks.length);
  if (lastAiRegex.test(html)) {
    html = html.replace(lastAiRegex, (full, m1, m2) => `${m1}${m2}${ucpBlock}`);
  } else {
    // Fallback: before <!-- Structured data or before <script type="application/ld+json">
    if (/\n\s*<!-- Structured data/.test(html)) {
      html = html.replace(/(\n\s*<!-- Structured data)/, ucpBlock + '$1');
    } else {
      html = html.replace(/(\n\s*<script type="application\/ld\+json">)/, ucpBlock + '$1');
    }
  }

  // ---- 3. Inject FAQPage JSON-LD block (after BreadcrumbList) ----
  const faqBlock = buildFaqBlock(fm.canonical_question, fm.aliases, summaryText);
  // Find the BreadcrumbList closing </script>
  const bcClose = html.match(/(<script type="application\/ld\+json">[\s\S]*?"@type":\s*"BreadcrumbList"[\s\S]*?<\/script>\n)/);
  if (bcClose) {
    html = html.replace(bcClose[0], bcClose[0] + '\n' + faqBlock);
  }

  // ---- 4. Inject Product graph (product_comparison only) ----
  if (isProduct && buyLinks.length > 0) {
    const productBlock = buildProductGraph(cardId, buyLinks, md);
    if (productBlock) {
      // Insert after FAQPage block we just added (or before <link rel="sitemap">)
      const sitemapAnchor = html.match(/(\n\s*<link rel="sitemap")/);
      if (sitemapAnchor) {
        html = html.replace(sitemapAnchor[0], '\n' + productBlock + sitemapAnchor[0]);
      }
    }
  }

  // ---- 5. ARIA: confidence-badge ----
  html = html.replace(
    /<span class="confidence-badge">([0-9.]+)<\/span>/g,
    (_, conf) => `<span class="confidence-badge" aria-label="Confidence score ${conf} out of 1">${conf}</span>`
  );

  // ---- 6. ARIA: unit-meta div → aside (idempotent) ----
  html = html.replace(
    /<div class="unit-meta" data-card-id="([^"]+)">/g,
    '<aside class="unit-meta" data-card-id="$1" aria-label="Knowledge unit metadata">'
  );
  // Match the </div> that closes unit-meta (the one immediately following the verified-date span sequence)
  html = html.replace(
    /(<aside class="unit-meta"[\s\S]*?id="verified-date">[^<]*<\/span><\/span>(?:\s*<span>[\s\S]*?<\/span>)*\s*)<\/div>/g,
    '$1</aside>'
  );

  // ---- 7. ARIA: tables ----
  // Add aria-label to <table> tags missing one
  html = html.replace(/<table>(?!\s*<caption>)/g, '<table aria-label="Reference table">');
  // Add scope="col" to <th> elements missing scope
  html = html.replace(/<th>([^<]+)<\/th>/g, '<th scope="col">$1</th>');

  // ---- 8. ARIA: related-links ----
  html = html.replace(
    /<h2>Related Units<\/h2>\s*\n\s*<div class="related-links">/g,
    '<nav class="related-links" aria-label="Related knowledge units">\n    <h2>Related Units</h2>'
  );
  // Convert the matching </div> to </nav>. The related-links block ends right before the <footer.
  html = html.replace(
    /(<nav class="related-links"[\s\S]*?<\/a>\s*)<\/div>(\s*\n\s*<footer)/g,
    '$1</nav>$2'
  );
  // Belt-and-suspenders fallback: any leftover <div class="related-links"> opening
  html = html.replace(
    /<div class="related-links">/g,
    '<nav class="related-links" aria-label="Related knowledge units">'
  );

  // ---- 9. ARIA: footer ----
  html = html.replace(/<footer>\n/, '<footer role="contentinfo" aria-label="Site footer">\n');

  // ---- 10. ARIA: buy links → aria-label ----
  // Match <a href="https://knowledgelib.io/go/{slug}" rel="sponsored nofollow">Check price</a>
  // Build a slug→product_name lookup
  const slugMap = {};
  for (const bl of buyLinks) {
    if (bl.slug && bl.product_name) slugMap[bl.slug] = bl.product_name;
  }
  html = html.replace(
    /<a href="https:\/\/knowledgelib\.io\/go\/([^"]+)" rel="sponsored nofollow"(?![^>]*aria-label)>/g,
    (full, slug) => {
      const name = slugMap[slug] || slug.replace(/-/g, ' ');
      return `<a href="https://knowledgelib.io/go/${slug}" rel="sponsored nofollow" aria-label="Check price for ${escapeAttr(name)} on Amazon">`;
    }
  );

  // ---- 11. <main role="main"> wrapper around card body ----
  // Both the opening and closing tag must be inserted together. If we can't find an anchor
  // for the opening tag, skip the closing tag too — otherwise repeated runs would stack
  // multiple </main> tags before <footer>.
  const hasMainOpen = /<main[^>]*role="main"/.test(html);
  const hasMainClose = /<\/main>/.test(html);
  if (!hasMainOpen) {
    const beforeOpen = html;
    html = html.replace(
      /(<body class="[^"]*">\n(?:\s*<!--[^]*?-->\n)?\s*\n?)(\s*<h1>)/,
      '$1\n  <main role="main">\n\n$2'
    );
    if (html !== beforeOpen && !hasMainClose) {
      // Opening was just inserted — now insert the matching closing tag before <footer>
      html = html.replace(/(\n)(\s*<footer)/, '$1  </main>\n\n$2');
    }
  } else if (!hasMainClose) {
    // Opening exists but closing is missing — repair by inserting closing before <footer>
    html = html.replace(/(\n)(\s*<footer)/, '$1  </main>\n\n$2');
  }

  // ---- Done. Restore CRLF if original used it. ----
  if (html === orig) return { status: 'noop' };

  if (hadCRLF) html = html.replace(/\n/g, '\r\n');
  if (!DRY_RUN) fs.writeFileSync(htmlPath, html);
  return { status: 'updated' };
}

// =============================================================
// Main
// =============================================================

function main() {
  const allFiles = findUnitHtml(PROTO);
  let files = allFiles;
  if (ONLY) files = files.filter(f => f.replace(/\\/g, '/').includes(ONLY));
  if (files.length > LIMIT) files = files.slice(0, LIMIT);

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Processing ${files.length} card files...`);

  for (const fp of files) {
    stats.processed++;
    try {
      const result = migrateFile(fp);
      if (result.status === 'updated') {
        stats.updated++;
        console.log(`  UPDATED ${path.relative(PROTO, fp).replace(/\\/g, '/')}`);
      } else if (result.status === 'skipped') {
        stats.skipped++;
        console.log(`  SKIP    ${path.relative(PROTO, fp).replace(/\\/g, '/')} — ${result.reason}`);
      } else if (result.status === 'noop') {
        // already current — silent unless --verbose
      }
    } catch (err) {
      stats.errors++;
      console.error(`  ERROR   ${path.relative(PROTO, fp).replace(/\\/g, '/')} — ${err.message}`);
    }
  }

  console.log(`\nProcessed: ${stats.processed}`);
  console.log(`Updated:   ${stats.updated}`);
  console.log(`Skipped:   ${stats.skipped}`);
  console.log(`Errors:    ${stats.errors}`);
  if (DRY_RUN) console.log('\n[DRY RUN] No files were modified.');
}

main();
