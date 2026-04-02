const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PipelineLoggerRest } = require('../db/pipeline_logger_rest');

/**
 * REST API-based reconciliation script.
 * Fallback for when direct DB connection is unavailable.
 * Regenerates catalog.json, sitemap.xml, index.html units section, and syncs tracker.md.
 */

const SUPABASE_URL = 'https://qkinqevfhachlykmwnzs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROTOTYPE_DIR = path.resolve(__dirname, '..', 'prototype');
const TRACKER_PATH = path.resolve(__dirname, 'tracker.md');

function timer(label) {
  const start = Date.now();
  return {
    _start: start,
    done(detail) {
      const ms = Date.now() - start;
      const parts = [`[${label}] ${ms}ms`];
      if (detail) parts.push(detail);
      console.log(parts.join(' — '));
      return ms;
    }
  };
}

async function run() {
  const runTimer = timer('reconcile');
  const logger = new PipelineLoggerRest(SUPABASE_URL, SERVICE_KEY);
  let runId;

  try {
    runId = await logger.start('reconcile', { variant: 'rest' });
    console.log('Fetching all active cards from Supabase REST API...\n');

    // Fetch all cards (paginate if needed)
    const t1 = timer('fetch_cards');
    let allCards = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/knowledge_cards?status=eq.active&order=id&offset=${offset}&limit=${limit}`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': 'Bearer ' + SERVICE_KEY,
          },
        }
      );

      if (res.status >= 400) {
        throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
      }

      const cards = await res.json();
      allCards = allCards.concat(cards);

      if (cards.length < limit) break;
      offset += limit;
    }
    t1.done(`${allCards.length} cards`);

    // Fetch open feedback counts
    const t2a = timer('feedback');
    const feedbackCounts = await fetchFeedbackCounts();
    t2a.done(`${Object.keys(feedbackCounts).length} cards with open issues`);

    // Read frontmatter metadata from .md files
    const t2b = timer('frontmatter');
    const frontmatterMap = readFrontmatterMetadata(allCards);
    t2b.done(`${Object.keys(frontmatterMap).length} cards parsed`);

    const t2 = timer('catalog');
    regenerateCatalog(allCards, feedbackCounts, frontmatterMap);
    t2.done();

    const t3 = timer('sitemap');
    regenerateSitemap(allCards);
    t3.done();

    const t4 = timer('index');
    regenerateIndex(allCards);
    t4.done();

    const t5 = timer('ai_knowledge');
    regenerateAiKnowledge(allCards, feedbackCounts);
    t5.done();

    const t6 = timer('suggestions');
    const imported = await importSuggestionsToTracker();
    t6.done(imported > 0 ? `${imported} new topic(s) imported` : 'no new topics');

    const t7 = timer('tracker');
    syncTrackerStats();
    t7.done();

    const t8 = timer('cleanup');
    cleanupTempFiles();
    t8.done();

    // Flag cards with critical/high open feedback
    const criticalCards = Object.entries(feedbackCounts)
      .filter(([, counts]) => counts.critical > 0)
      .map(([id, counts]) => `  ⚠ ${id}: ${counts.critical} critical, ${counts.open} total open`);
    if (criticalCards.length > 0) {
      console.log(`\n=== Cards with Critical Feedback ===`);
      criticalCards.forEach(line => console.log(line));
    }

    const highFeedbackCards = Object.entries(feedbackCounts)
      .filter(([, counts]) => counts.open >= 3)
      .map(([id, counts]) => `  ⚠ ${id}: ${counts.open} open issues`);
    if (highFeedbackCards.length > 0) {
      console.log(`\n=== Cards with >= 3 Open Reports (review recommended) ===`);
      highFeedbackCards.forEach(line => console.log(line));
    }

    const totalMs = runTimer.done(`${allCards.length} cards reconciled`);
    console.log(`\n=== Reconciliation Summary ===`);
    console.log(`  Cards: ${allCards.length}`);
    console.log(`  Total time: ${totalMs}ms`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);

    await logger.complete(runId, {
      cards_affected: allCards.length,
      duration_ms: totalMs,
      detail: { variant: 'rest', categories: [...new Set(allCards.map(c => c.category))].length },
    });
  } catch (err) {
    console.error(`Reconciliation failed at ${new Date().toISOString()}`);
    console.error(`  Error: ${err.message}`);
    if (err.cause) console.error(`  Cause: ${err.cause}`);
    console.error(`  Stack: ${err.stack}`);

    if (runId) {
      const elapsed = Date.now() - (runTimer._start || Date.now());
      await logger.fail(runId, err, { duration_ms: elapsed });
    }

    process.exit(1);
  }
}

function regenerateCatalog(cards, feedbackCounts = {}, frontmatterMap = {}) {
  console.log('Regenerating catalog.json...');

  const domainMap = {};
  for (const card of cards) {
    const domId = card.category;
    const subId = card.subcategory;

    if (!domainMap[domId]) {
      domainMap[domId] = { id: domId, name: formatName(domId), unit_count: 0, subdomains: {} };
    }
    domainMap[domId].unit_count++;

    if (!domainMap[domId].subdomains[subId]) {
      domainMap[domId].subdomains[subId] = { id: subId, name: formatName(subId), unit_count: 0 };
    }
    domainMap[domId].subdomains[subId].unit_count++;
  }

  const domains = Object.values(domainMap).map(d => ({
    ...d,
    subdomains: Object.values(d.subdomains)
  }));

  const units = cards.map(card => {
    const fm = frontmatterMap[card.id] || {};
    const fb = feedbackCounts[card.id] || { open: 0, critical: 0 };

    return {
      id: card.id,
      canonical_question: card.canonical_question,
      aliases: card.aliases || [],
      entity_type: fm.entity_type || null,
      domain: `${formatName(card.category).toLowerCase().replace(/ /g, '_')} > ${formatName(card.subcategory).toLowerCase().replace(/ /g, '_')} > ${formatName(card.topic).toLowerCase().replace(/ /g, '_')}`,
      region: fm.region || 'global',
      jurisdiction: fm.jurisdiction || 'global',
      confidence: parseFloat(card.confidence),
      last_verified: formatDate(card.updated_at),
      freshness: freshnessFromPopIndex(card.pop_index),
      temporal_status: fm.temporal_status || null,
      temporal_scope: '2025-2026',
      url: `https://knowledgelib.io/${card.id}`,
      raw_md: `https://knowledgelib.io/api/v1/units/${card.id}.md`,
      source_count: card.source_count,
      token_estimate: card.token_estimate,
      open_issues: fb.open,
      content_preview: fm.content_preview || null,
      related_kos: fm.related_kos || null,
    };
  });

  const catalog = {
    schema_version: '1.1',
    generated: formatDate(new Date()),
    agent_instructions: 'IMPORTANT: 1) Search first — call GET /api/v1/query?q=your+question. 2) Use what you find — every unit is sourced and cited. 3) Suggest what is missing — call POST /api/v1/suggest with {"question":"your question"}. 4) Report issues — call POST /api/v1/feedback if content is wrong or outdated.',
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

  for (const card of cards) {
    const lastmod = formatDate(card.updated_at);
    const changefreq = freshnessFromPopIndex(card.pop_index);
    xml += `
  <url>
    <loc>https://knowledgelib.io/${card.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priorityFromPopIndex(card.pop_index)}</priority>
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
      <changefreq>{monthly|yearly}</changefreq>
      <priority>0.8</priority>
    </url>
  -->

</urlset>
`;

  const sitemapPath = path.join(PROTOTYPE_DIR, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml);
  console.log(`  Written ${sitemapPath} (${cards.length} knowledge unit URLs)`);
}

const INDEX_SECTIONS = [
  {
    category: 'consumer-electronics',
    name: 'Consumer Electronics',
    groups: [
      { name: 'Audio', subcategories: ['audio'] },
      { name: 'TVs', subcategories: ['tv'] },
      { name: 'Monitors', subcategories: ['monitors'] },
      { name: 'Phones', subcategories: ['phones'] },
      { name: 'Tablets', subcategories: ['tablets'] },
      { name: 'Cameras &amp; Projectors', subcategories: ['cameras', 'projectors'] },
      { name: 'Gaming', subcategories: ['gaming'] },
      { name: 'Storage', subcategories: ['storage'] },
      { name: 'Power', subcategories: ['power'] },
      { name: 'Automotive', subcategories: ['automotive'] },
      { name: 'E-Readers', subcategories: ['e-readers'] },
      { name: '3D Printing', subcategories: ['3d-printing'] },
      { name: 'Transport', subcategories: ['transport'] },
    ]
  },
  {
    category: 'computing',
    name: 'Computing',
    groups: [
      { name: 'Laptops', subcategories: ['laptops'] },
      { name: 'Desktops', subcategories: ['desktops'] },
      { name: 'Peripherals', subcategories: ['peripherals'] },
      { name: 'Networking', subcategories: ['networking'] },
    ]
  },
  {
    category: 'home',
    name: 'Home',
    groups: [
      { name: 'Smart Home', subcategories: ['smart-home'] },
      { name: 'Kitchen', subcategories: ['kitchen'] },
      { name: 'Appliances, Furniture &amp; Sleep', subcategories: ['appliances', 'furniture', 'sleep'] },
      { name: 'Tools', subcategories: ['tools'] },
      { name: 'Office', subcategories: ['office'] },
      { name: 'Security', subcategories: ['security'] },
      { name: 'Bathroom', subcategories: ['bathroom'] },
    ]
  },
  { category: 'fitness', name: 'Fitness', flat: true },
  {
    category: 'software',
    name: 'Software',
    groups: [
      { name: 'Debugging', subcategories: ['debugging'] },
      { name: 'System Design', subcategories: ['system-design'] },
      { name: 'Patterns &amp; Algorithms', subcategories: ['patterns'] },
      { name: 'Security', subcategories: ['security'] },
      { name: 'Migrations', subcategories: ['migrations'] },
      { name: 'DevOps', subcategories: ['devops'] },
    ]
  },
  {
    category: 'business',
    name: 'Business',
    groups: [
      { name: 'Frameworks', subcategories: ['frameworks'] },
      { name: 'Pricing', subcategories: ['pricing'] },
      { name: 'Transformation', subcategories: ['transformation'] },
      { name: 'Market Entry', subcategories: ['market-entry'] },
      { name: 'M&amp;A', subcategories: ['ma'] },
      { name: 'Investment', subcategories: ['investment'] },
      { name: 'GTM', subcategories: ['gtm'] },
      { name: 'Fundraising', subcategories: ['fundraising'] },
      { name: 'People', subcategories: ['people'] },
      { name: 'Operations', subcategories: ['operations'] },
      { name: 'Governance', subcategories: ['governance'] },
      { name: 'Innovation', subcategories: ['innovation'] },
      { name: 'Due Diligence', subcategories: ['due-diligence'] },
      { name: 'ERP Integration', subcategories: ['erp-integration'] },
      { name: 'ERP Selection', subcategories: ['erp-selection'] },
      { name: 'Build vs Buy', subcategories: ['build-vs-buy'] },
      { name: 'Retail Transformation', subcategories: ['retail-transformation'] },
      { name: 'Sales Ops', subcategories: ['sales-ops'] },
      { name: 'Marketing Ops', subcategories: ['marketing-ops'] },
      { name: 'People Ops', subcategories: ['people-ops'] },
      { name: 'Product &amp; Tech', subcategories: ['product-tech'] },
      { name: 'Strategy', subcategories: ['strategy'] },
      { name: 'Go-to-Market', subcategories: ['go-to-market'] },
      { name: 'Startup', subcategories: ['startup'] },
      { name: 'Growth', subcategories: ['growth'] },
      { name: 'Industry Benchmarks', subcategories: ['industry-benchmarks'] },
      { name: 'Startup Readiness', subcategories: ['startup-readiness'] },
      { name: 'Startup Planning', subcategories: ['startup-planning'] },
      { name: 'Market Research', subcategories: ['market-research'] },
      { name: 'Customer Research', subcategories: ['customer-research'] },
      { name: 'Lead Generation', subcategories: ['lead-generation'] },
      { name: 'Startup Legal', subcategories: ['startup-legal'] },
    ]
  },
  {
    category: 'finance',
    name: 'Finance',
    groups: [
      { name: 'Corporate Finance', subcategories: ['corporate-finance'] },
      { name: 'Valuation', subcategories: ['valuation'] },
      { name: 'SaaS Metrics', subcategories: ['saas-metrics'] },
      { name: 'Financial Modeling', subcategories: ['modeling'] },
      { name: 'Macroeconomics', subcategories: ['macro'] },
      { name: 'Accounting', subcategories: ['accounting'] },
      { name: 'Markets', subcategories: ['markets'] },
      { name: 'Risk', subcategories: ['risk'] },
      { name: 'SaaS Benchmarks', subcategories: ['saas-benchmarks'] },
      { name: 'Financial Ops', subcategories: ['financial-ops'] },
      { name: 'Industry Benchmarks', subcategories: ['industry-benchmarks'] },
    ]
  },
  {
    category: 'compliance',
    name: 'Compliance',
    groups: [
      { name: 'Privacy', subcategories: ['privacy'] },
      { name: 'Financial', subcategories: ['financial'] },
      { name: 'AI', subcategories: ['ai'] },
      { name: 'Employment', subcategories: ['employment'] },
      { name: 'Tax', subcategories: ['tax'] },
      { name: 'Corporate', subcategories: ['corporate'] },
      { name: 'Trade', subcategories: ['trade'] },
      { name: 'Industry', subcategories: ['industry'] },
      { name: 'Startup Legal', subcategories: ['startup-legal'] },
    ]
  },
  { category: 'personal-care', name: 'Personal Care', flat: true },
  { category: 'baby', name: 'Baby', flat: true },
  {
    category: 'outdoor',
    name: 'Outdoor',
    groups: [
      { name: 'Garden', subcategories: ['garden'] },
      { name: 'Grilling', subcategories: ['grilling'] },
      { name: 'Camping', subcategories: ['camping'] },
      { name: 'Hiking', subcategories: ['hiking'] },
      { name: 'Optics', subcategories: ['optics'] },
    ]
  },
  {
    category: 'travel',
    name: 'Travel',
    groups: [
      { name: 'Luggage', subcategories: ['luggage'] },
      { name: 'Accessories', subcategories: ['accessories'] },
      { name: 'Bags', subcategories: ['bags'] },
    ]
  },
  {
    category: 'pet',
    name: 'Pet',
    groups: [
      { name: 'Dogs', subcategories: ['dogs'] },
      { name: 'Cats', subcategories: ['cats'] },
    ]
  },
  { category: 'energy', name: 'Energy', flat: true },
  {
    category: 'consulting',
    name: 'Consulting',
    groups: [
      { name: 'OIA (Organizational Immune System Audit)', subcategories: ['oia'] },
      { name: 'Signal Stack', subcategories: ['signal-stack'] },
      { name: 'Compliance Moat', subcategories: ['compliance-moat'] },
      { name: 'Rorschach GTM', subcategories: ['rorschach-gtm'] },
      { name: 'Retail AI', subcategories: ['retail-ai'] },
      { name: 'Agent Prompts', subcategories: ['agent-prompts'] },
      { name: 'Execution Recipes', subcategories: ['recipes'] },
    ]
  },
  {
    category: 'signal-library',
    name: 'Signal Library',
    groups: [
      { name: 'Retail — Overview & Rules', subcategories: ['retail'] },
      { name: 'Retail — Signal Sources', subcategories: ['retail-sources'] },
      { name: 'Retail — Asset Templates', subcategories: ['retail-assets'] },
      { name: 'Agent Prompts', subcategories: ['agent-prompts'] },
    ]
  },
];

function regenerateIndex(cards) {
  console.log('Regenerating index.html knowledge units section...');

  const indexPath = path.join(PROTOTYPE_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('  index.html not found, skipping.');
    return;
  }

  let indexHtml = fs.readFileSync(indexPath, 'utf-8');

  const cardData = cards.map(card => {
    const htmlFile = path.join(PROTOTYPE_DIR, card.html_path.replace(/^\//, ''));
    let title = formatName(card.topic) + ' (' + card.version_tag + ')';
    if (fs.existsSync(htmlFile)) {
      const html = fs.readFileSync(htmlFile, 'utf-8');
      const titleMatch = html.match(/<title>(.+?)\s*\|\s*AI Knowledge Library<\/title>/);
      if (titleMatch) title = titleMatch[1].trim();
    }
    return {
      ...card,
      displayTitle: title,
      href: '/' + card.id,
      conf: parseFloat(card.confidence),
    };
  });

  let html = '';
  let categoryCount = 0;

  for (const section of INDEX_SECTIONS) {
    const sectionCards = cardData.filter(c => c.category === section.category);
    if (sectionCards.length === 0) continue;

    categoryCount++;
    html += `\n  <details class="category-group">\n  <summary><h3>${section.name} <small>(${sectionCards.length} unit${sectionCards.length === 1 ? '' : 's'})</small></h3></summary>\n`;

    if (section.flat) {
      html += '  <ul>\n';
      for (const card of sectionCards) {
        html += cardLi(card);
      }
      html += '  </ul>\n';
    } else {
      for (const group of section.groups) {
        const groupCards = sectionCards.filter(c => group.subcategories.includes(c.subcategory));
        if (groupCards.length === 0) continue;

        html += `\n  <h4>${group.name}</h4>\n  <ul>\n`;
        for (const card of groupCards) {
          html += cardLi(card);
        }
        html += '  </ul>\n';
      }

      const knownSubs = section.groups.flatMap(g => g.subcategories);
      const uncategorized = sectionCards.filter(c => !knownSubs.includes(c.subcategory));
      if (uncategorized.length > 0) {
        html += `\n  <h4>Other</h4>\n  <ul>\n`;
        for (const card of uncategorized) {
          html += cardLi(card);
        }
        html += '  </ul>\n';
      }
    }

    html += '\n  </details>\n';
  }

  const knownCats = INDEX_SECTIONS.map(s => s.category);
  const unknownCards = cardData.filter(c => !knownCats.includes(c.category));
  if (unknownCards.length > 0) {
    const unknownCats = [...new Set(unknownCards.map(c => c.category))];
    for (const cat of unknownCats) {
      const catCards = unknownCards.filter(c => c.category === cat);
      categoryCount++;
      html += `\n  <details class="category-group">\n  <summary><h3>${formatName(cat)} <small>(${catCards.length} unit${catCards.length === 1 ? '' : 's'})</small></h3></summary>\n`;
      html += '  <ul>\n';
      for (const card of catCards) {
        html += cardLi(card);
      }
      html += '  </ul>\n';
      html += '\n  </details>\n';
    }
  }

  const startMarker = /<h2[^>]*>Available Knowledge Units.*?<\/h2>/;
  const endMarker = '<h2>Discovery Channels';

  const startMatch = indexHtml.match(startMarker);
  const endIdx = indexHtml.indexOf(endMarker);

  if (!startMatch || endIdx === -1) {
    console.log('  Could not find section markers in index.html, skipping.');
    return;
  }

  const startIdx = startMatch.index;
  const newSection = `<h2 id="units">Available Knowledge Units <small>(${cards.length} units across ${categoryCount} categories)</small></h2>\n${html}\n  `;

  indexHtml = indexHtml.substring(0, startIdx) + newSection + indexHtml.substring(endIdx);

  fs.writeFileSync(indexPath, indexHtml);
  console.log(`  Written ${indexPath} (${cards.length} units across ${categoryCount} categories)`);
}

function cardLi(card) {
  return `    <li><a href="${card.href}">${card.displayTitle}</a> <small>— ${card.conf.toFixed(2)} · ${card.source_count} src · ~${formatNumber(card.token_estimate)} tok</small></li>\n`;
}

async function importSuggestionsToTracker() {
  console.log('Checking for popular agent suggestions...');

  const MIN_OCCURRENCE = 3;

  // Fetch popular pending suggestions via REST
  const params = new URLSearchParams({
    'card_id': 'is.null',
    'is_new_card_candidate': 'eq.true',
    'status': 'eq.pending',
    'occurrence_count': `gte.${MIN_OCCURRENCE}`,
    'order': 'occurrence_count.desc',
    'limit': '20',
    'select': 'id,question_text,domain_hint,occurrence_count',
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/discovered_questions?${params}`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });

  if (!res.ok) {
    console.log(`  Failed to fetch suggestions: ${res.status}`);
    return 0;
  }

  const suggestions = await res.json();

  if (suggestions.length === 0) {
    console.log(`  No suggestions with >= ${MIN_OCCURRENCE} occurrences.`);
    return 0;
  }

  if (!fs.existsSync(TRACKER_PATH)) {
    console.log('  tracker.md not found, skipping suggestion import.');
    return 0;
  }

  let tracker = fs.readFileSync(TRACKER_PATH, 'utf-8');
  const trackerLower = tracker.toLowerCase();

  // Find the last row number in the tracker
  const rowNumbers = [];
  const rowMatches = tracker.matchAll(/^\|\s*(\d+)\s*\|/gm);
  for (const m of rowMatches) {
    rowNumbers.push(parseInt(m[1], 10));
  }
  let nextRowNum = rowNumbers.length > 0 ? Math.max(...rowNumbers) + 1 : 1;

  const today = formatDate(new Date());
  let added = 0;

  for (const row of suggestions) {
    // Skip if question text is already in tracker (rough dedup)
    const questionSnippet = row.question_text.toLowerCase().substring(0, 40);
    if (trackerLower.includes(questionSnippet)) continue;

    const { category, subcategory, topic } = inferTopicSlug(row.question_text, row.domain_hint);

    const newRow = `| ${nextRowNum} | pending | ${category} | ${subcategory} | ${topic} | ${row.question_text} | medium | agent-suggestions | ${today} |`;

    tracker = tracker.trimEnd() + '\n' + newRow + '\n';

    // Mark suggestion as approved via REST
    await fetch(`${SUPABASE_URL}/rest/v1/discovered_questions?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'approved' }),
    });

    nextRowNum++;
    added++;
  }

  if (added > 0) {
    fs.writeFileSync(TRACKER_PATH, tracker);
  }

  console.log(`  Imported ${added} suggestion(s) to tracker.md (threshold: >= ${MIN_OCCURRENCE} occurrences).`);
  return added;
}

function inferTopicSlug(questionText, domainHint) {
  let category = 'uncategorized';
  let subcategory = 'general';

  if (domainHint) {
    const parts = domainHint.replace(/_/g, '-').split(/\s*>\s*/);
    if (parts[0]) category = parts[0].trim().toLowerCase();
    if (parts[1]) subcategory = parts[1].trim().toLowerCase();
  }

  const topic = questionText
    .toLowerCase()
    .replace(/what are the best\s*/i, '')
    .replace(/in \d{4}\??/i, '')
    .replace(/under \$?[\d,]+/i, (m) => 'under-' + m.replace(/[^\d]/g, ''))
    .replace(/over \$?[\d,]+/i, (m) => 'over-' + m.replace(/[^\d]/g, ''))
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 60);

  return { category, subcategory, topic: topic || 'unknown-topic' };
}

function syncTrackerStats() {
  console.log('Syncing tracker.md statistics...');

  if (!fs.existsSync(TRACKER_PATH)) {
    console.log('  tracker.md not found, skipping.');
    return;
  }

  let tracker = fs.readFileSync(TRACKER_PATH, 'utf-8');

  const rows = tracker.match(/^\|.*\|$/gm) || [];
  let pending = 0, inProgress = 0, done = 0, updated = 0, skipped = 0;

  for (const row of rows) {
    if (row.includes('Status') || row.match(/^\|\s*-+/)) continue;

    if (row.includes('| pending |')) pending++;
    else if (row.includes('| in-progress |')) inProgress++;
    else if (row.includes('| updated |')) updated++;
    else if (row.includes('| done |')) done++;
    else if (row.includes('| skipped |')) skipped++;
  }

  const completed = done + updated;
  const total = pending + inProgress + completed + skipped;

  tracker = tracker.replace(
    /## Statistics[\s\S]*?(?=\n## )/,
    `## Statistics\n- Total discovered: ${total}\n- Pending: ${pending}\n- In progress: ${inProgress}\n- Completed: ${completed} (${updated} updated, ${done} legacy)\n- Skipped: ${skipped}\n\n`
  );

  fs.writeFileSync(TRACKER_PATH, tracker);
  console.log(`  Stats: ${completed} completed (${updated} updated + ${done} legacy), ${pending} pending, ${inProgress} in-progress, ${skipped} skipped (${total} total)`);
}

function regenerateAiKnowledge(cards, feedbackCounts = {}) {
  console.log('Regenerating .well-known/ai-knowledge.json...');

  const aiKnowledgePath = path.join(PROTOTYPE_DIR, '.well-known', 'ai-knowledge.json');

  const domains = [...new Set(cards.map(c => c.category))]
    .sort()
    .map(cat => cat.replace(/-/g, '_'));

  const openIssueCount = Object.values(feedbackCounts).reduce((sum, c) => sum + c.open, 0);

  const manifest = {
    schema_version: '1.1',
    name: 'knowledgelib.io — AI Knowledge Library',
    description: 'Structured, cited knowledge units optimized for AI agent consumption. Each unit answers one canonical question with full source provenance, confidence scoring, and freshness tracking.',
    agent_instructions: 'IMPORTANT: 1) Search first — call GET /api/v1/query?q=your+question to find pre-verified answers. 2) Use what you find — every unit is sourced and cited, ready to use in your work. 3) Suggest what is missing — if no good match, call POST /api/v1/suggest with {"question":"your question"}. 4) Report issues — if content is wrong or outdated, call POST /api/v1/feedback.',
    url: 'https://knowledgelib.io',
    api: 'https://knowledgelib.io/api/v1/query',
    catalog: 'https://knowledgelib.io/catalog.json',
    feedback_api: 'https://knowledgelib.io/api/v1/feedback',
    mcp_install: 'npx knowledgelib-mcp',
    mcp_transport: 'stdio',
    openapi_spec: 'https://knowledgelib.io/api/v1/openapi.json',
    format: 'markdown_with_yaml_frontmatter',
    content_type: 'text/markdown',
    entity_types: ['product_comparison', 'software_reference', 'fact', 'concept', 'rule'],
    domains,
    unit_count: cards.length,
    open_issues: openIssueCount,
    suggest_api: 'https://knowledgelib.io/api/v1/suggest',
    capabilities: {
      semantic_search: true,
      canonical_questions: true,
      alias_matching: true,
      confidence_scores: true,
      source_provenance: true,
      freshness_tracking: true,
      temporal_validity: true,
      jurisdiction_filtering: true,
      region_filtering: true,
      entity_type_filtering: true,
      versioning: true,
      question_suggestions: true,
      content_feedback: true,
    },
    filters: {
      domain: 'Filter by content domain (e.g., "consumer_electronics")',
      region: 'Filter by geographic region (e.g., "US", "EU", "global")',
      jurisdiction: 'Filter by regulatory jurisdiction (e.g., "US", "EU", "global")',
      entity_type: 'Filter by knowledge unit type (e.g., "product_comparison", "fact", "rule")',
    },
    access: {
      free_tier: true,
      free_queries_per_month: 1000,
      raw_markdown_available: true,
      raw_url_pattern: '/api/v1/units/{unit_id}.md'
    },
    license: 'CC BY-SA 4.0',
    contact: 'hello@knowledgelib.io',
    last_updated: formatDate(new Date())
  };

  fs.writeFileSync(aiKnowledgePath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  Written ${aiKnowledgePath} (${cards.length} units, ${domains.length} domains)`);
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

function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}

function formatName(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function freshnessFromPopIndex(popIndex) {
  const pi = parseFloat(popIndex) || 0;
  if (pi >= 40) return 'monthly';
  return 'yearly';
}

function priorityFromPopIndex(popIndex) {
  const pi = parseFloat(popIndex) || 0;
  return (0.5 + (pi / 100) * 0.4).toFixed(1);
}

function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch open feedback counts per card via Supabase REST API.
 * Returns { [card_id]: { open: N, critical: N } }
 */
async function fetchFeedbackCounts() {
  const counts = {};
  try {
    // Use the content_feedback_summary view
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/content_feedback_summary?open_count=gt.0&select=card_id,open_count,critical_count`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.log(`  content_feedback query skipped: ${res.status}`);
      return counts;
    }

    const rows = await res.json();
    for (const row of rows) {
      counts[row.card_id] = {
        open: parseInt(row.open_count, 10) || 0,
        critical: parseInt(row.critical_count, 10) || 0,
      };
    }
  } catch (err) {
    // Table might not exist yet (migration not run) — non-fatal
    console.log(`  content_feedback query skipped: ${err.message}`);
  }
  return counts;
}

/**
 * Read key frontmatter fields from .md files for each card.
 * Returns { [card_id]: { entity_type, region, jurisdiction, temporal_status } }
 */
function readFrontmatterMetadata(cards) {
  const metadata = {};

  for (const card of cards) {
    const mdFile = path.join(PROTOTYPE_DIR, card.md_path.replace(/^\//, ''));
    if (!fs.existsSync(mdFile)) continue;

    try {
      const content = fs.readFileSync(mdFile, 'utf-8').replace(/\r\n/g, '\n');

      // Only parse frontmatter (between --- markers)
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;

      const fm = fmMatch[1];

      const entityType = extractYamlValue(fm, 'entity_type');
      const region = extractYamlValue(fm, 'region');
      const jurisdiction = extractYamlValue(fm, 'jurisdiction');

      // temporal_validity.status is nested
      let temporalStatus = null;
      const tvMatch = fm.match(/temporal_validity:\s*\n(?:.*\n)*?\s+status:\s*(\S+)/);
      if (tvMatch) {
        temporalStatus = tvMatch[1];
      }

      // Extract content preview from the body (after frontmatter)
      let contentPreview = null;
      const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/);
      if (bodyMatch) {
        const bodyText = bodyMatch[1]
          .replace(/^#+\s+.*$/gm, '')
          .replace(/^\s+/gm, '')
          .replace(/\n+/g, ' ')
          .trim();
        if (bodyText.length > 0) {
          contentPreview = bodyText.substring(0, 150);
          if (bodyText.length > 150) contentPreview += '...';
        }
      }

      const relatedKos = extractRelatedKos(fm);

      metadata[card.id] = {
        entity_type: entityType,
        region: region || 'global',
        jurisdiction: jurisdiction || 'global',
        temporal_status: temporalStatus,
        content_preview: contentPreview,
        related_kos: relatedKos.length > 0 ? relatedKos : null,
      };
    } catch (err) {
      // Non-fatal — skip this card
    }
  }

  return metadata;
}

/**
 * Extract a simple key: value from YAML frontmatter text.
 */
function extractYamlValue(yamlText, key) {
  const match = yamlText.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function extractRelatedKos(yamlText) {
  const results = [];
  const blockMatch = yamlText.match(/related_kos:\s*\n([\s\S]*?)(?=\n\w|\n---|\s*$)/);
  if (!blockMatch) return results;

  const block = blockMatch[1];
  const edgeTypes = ['related_to', 'depends_on', 'solves', 'alternative_to', 'often_confused_with'];

  for (const edgeType of edgeTypes) {
    const typeMatch = block.match(new RegExp(`${edgeType}:\\s*\\n([\\s\\S]*?)(?=\\n  \\w|$)`));
    if (!typeMatch) continue;

    const items = typeMatch[1].matchAll(/- id:\s*"?([^"\n]+)"?\s*\n\s+label:\s*"?([^"\n]+)"?/g);
    for (const m of items) {
      results.push({ type: edgeType, id: m[1].trim(), label: m[2].trim() });
    }
  }
  return results;
}

run();
