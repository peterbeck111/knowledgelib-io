---
name: create-card
description: Research and create a knowledge card from the pipeline tracker. Creates .md + .html files, inserts into the database, and updates catalog.json, sitemap.xml, and index.html via reconciliation.
---

# Create Knowledge Card for knowledgelib.io

You are the knowledge card creation agent for knowledgelib.io — an AI Knowledge Library that creates structured, cited knowledge units optimized for AI agent consumption.

## Template Selection

Choose the template based on the topic's entity type:

| Entity Type | Template Files | When to Use |
|-------------|---------------|-------------|
| `product_comparison` | `product_comparison.md` + `.html` | Product buying guides (default for all non-software categories) |
| `software_reference` | `software_reference.md` + `.html` | Software/debugging topics (`software/*` category) |
| `fact` | `fact.md` + `.html` | Single verified facts (~200-400 tokens) |
| `concept` | `concept.md` + `.html` | Definitions/explanations agents get wrong (~400-800 tokens) |
| `rule` | `rule.md` + `.html` | Data-backed decision rules (~300-600 tokens) |

All templates are in `knowledge_pipeline/templates/`. The tracker row's category determines the default template. If the tracker explicitly specifies an entity type, use that instead.

## Mode Selection

Check the flags the user passed:

- **Default (no flags)**: Process ONE card — the highest-priority pending topic. Show it for review when done.
- **`--batch` flag**: Process ALL pending topics automatically without pausing between cards.
- **`--topic N` flag**: Process the specific topic at row number N in the tracker (e.g., `--topic 6`). Skip the "find next pending" logic.
- **`--parallel` flag**: Safe mode for running multiple Claude Code sessions simultaneously. When set:
  - **MUST** be combined with `--topic N` (each session must be assigned a specific topic)
  - Uses `card_data_{topic-slug}.json` instead of `card_data_temp.json` (avoids temp file collisions)
  - **Skips** catalog.json updates (deferred to reconciliation)
  - **Skips** sitemap.xml updates (deferred to reconciliation)
  - **Skips** index.html updates (deferred to reconciliation)
  - **Skips** tracker.md statistics updates (deferred to reconciliation)
  - Still creates .md + .html files (safe — different directories per topic)
  - Still inserts into database (safe — ON CONFLICT handles duplicates)
  - Still marks the tracker row as `updated` (safe — each session edits a different row)
- **`--count N` flag**: Automatically create N cards in parallel using background subagents. Each card gets its own fresh context window. See "Automated Parallel Mode" below.

Example parallel usage across 3 terminals:
```
Terminal 1: /create-card --parallel --topic 6
Terminal 2: /create-card --parallel --topic 7
Terminal 3: /create-card --parallel --topic 8
```

After all parallel sessions complete, run: `node knowledge_pipeline/reconcile.js` (or `node knowledge_pipeline/reconcile_rest.js` if DB connection fails)

## Automated Parallel Mode (`--count N`)

When the user passes `--count N` (e.g., `/create-card --count 5`), orchestrate N parallel subagents automatically:

### Concurrency cap: max 8 parallel sub-agents

**Hard rule: never launch more than 8 sub-agents in flight at the same time.** Bursts above 8 trigger Anthropic backend throttles ("Server is temporarily limiting requests · Rate limited") that fail individual agents mid-research, and bursts above ~10 risk hitting the org's API spend cap.

If `N > 8`, split into waves:
- Wave size = 8 (or N if N < 8)
- Launch wave 1, then wait for **all 8 agents in that wave to complete** (use `TaskOutput` with `block: true` on each, in any order) before launching wave 2.
- Repeat until all N topics are processed.
- Example: `--count 30` → 4 waves (8 + 8 + 8 + 6).

Wave-by-wave is slower than a single big burst, but it is the difference between "all 30 cards build" and "11 of 30 fail and need manual retry."

### Orchestration Step 1: Pick the next N topics

Read `knowledge_pipeline/tracker.md`. Find the first N rows with status `pending`, prioritizing `high` > `medium` > `low`. Mark ALL N as `in-progress` in the tracker immediately (prevents double-picking).

If fewer than N pending topics remain, use however many are available and inform the user.

### Orchestration Step 2: Launch sub-agents in waves of ≤8

Use the **Task** tool to launch each wave's agents **in a single message** (parallel tool calls). For wave size, see the "Concurrency cap" rule above — never exceed 8 in flight. Each agent must be:
- `subagent_type: "general-purpose"`
- `run_in_background: true`
- `description`: short label like "Create card: soundbars-under-300"

Each agent's prompt MUST include ALL of the following (the agent has NO prior context — it starts fresh):

```
You are creating ONE knowledge card for knowledgelib.io — an AI Knowledge Library that creates structured, cited knowledge units optimized for AI agent consumption.

## Your Assigned Topic
- Tracker row: #{row_number}
- Category: {category}
- Subcategory: {subcategory}
- Topic slug: {topic}
- Version tag: {version_tag}
- Priority: {priority}
- Freshness: must match temporal_validity.status — "volatile" for product_comparison, "stable" for software debugging, "evolving" for migrations (NOT legacy "monthly"/"quarterly"/"yearly")
- Canonical question: "{canonical_question}"
- Output .md path: prototype/{category}/{subcategory}/{topic}/{version_tag}.md
- Output .html path: prototype/{category}/{subcategory}/{topic}/{version_tag}.html
- Temp JSON path: knowledge_pipeline/card_data_{topic}.json

## Step 1: Read templates and examples

Read the template files matching the entity type (default: product_comparison):
1. knowledge_pipeline/templates/{entity_type}.md
2. knowledge_pipeline/templates/{entity_type}.html
3. An existing example card of the same type from prototype/

For product_comparison, also read:
- prototype/consumer-electronics/audio/wireless-earbuds-under-150/2026.md
- prototype/consumer-electronics/audio/wireless-earbuds-under-150/2026.html

## Step 2: Research

Use WebSearch to find 5-8 authoritative sources. Run these searches:
- "best {readable_topic}" {year} site:rtings.com
- "best {readable_topic}" {year} site:nytimes.com/wirecutter
- "best {readable_topic}" {year} site:tomsguide.com
- "best {readable_topic}" {year} review comparison
- "best {readable_topic}" {year} reddit

Then use WebFetch on the top 3-5 results to extract product names, prices, key specs, pros/cons, test results, use-case recommendations, and market trends.

**Amazon ASIN lookup (required):** After identifying the 8-12 recommended products, search Amazon for each product's ASIN. Use WebSearch with `"amazon.com {exact product name}"`. The ASIN is a 10-character code (starts with B0) in Amazon URLs: amazon.com/dp/BXXXXXXXXXX. For unreleased products, set asin to null and use search URL format.

IMPORTANT: Only use data you can cite. Every factual claim must trace to a source URL from your search results.

## Step 3: Create the .md file

Create the markdown file at: prototype/{category}/{subcategory}/{topic}/{version_tag}.md

Follow the EXACT format from the template. Requirements:
- YAML frontmatter with ALL fields from the template (including temporal_validity, related_kos, jurisdiction, constraints, skip_this_unit_if)
- id: {category}/{subcategory}/{topic}/{version_tag}
- temporal_validity: status (volatile for products, stable for software/debugging, evolving for migrations), change_sensitivity, next_review, last_breaking_change
- jurisdiction: "global" (default), or specific like "US", "EU" for region-specific content
- constraints: 3-5 structured hard limits/caveats agents should validate before recommending (frontmatter YAML array, parsed before body)
- skip_this_unit_if: 2-4 negative constraints — scenarios where this card is the wrong answer, with use_instead pointers
- related_kos: typed links (depends_on, related_to, solves, alternative_to, often_confused_with) to other units
- confidence: 0.90-0.95 for 6+ high-reliability sources, 0.85-0.89 for 4-5, 0.80-0.84 for 3-4, 0.70-0.79 for limited sources
- aliases: 5-8 alternative phrasings
- buy_links: one per product using /go/{product-slug} URLs
- sources: 5-8 with id, title, author, url, type, published, reliability
- **Canonical-question H2** (verbatim from frontmatter, immediately after H1) — the question form that AI tree-walking algorithms read first
- **TL;DR hero block** (between canonical-question H2 and Summary) — bolded picks (Top / Best Value / Best Budget) with prices and one-clause reasons. 30-50 words. RAG snippet extractors lift this verbatim.
- Summary: 2-3 paragraphs expanding on the TL;DR with citations [src1, src2]
- Comparison table: 8-12 products with key specs
- Best-for sections: 5-7 use cases
- **Head-to-Head Comparisons section** (between Best-for and Decision Logic) — 3-5 pairwise matchups of the top picks (e.g., "JBL Flip 7 vs Soundcore Motion 300"). Each subsection picks a winner + states the tradeoff + lists "Pick A if" / "Pick B if" scenarios. Targets "X vs Y" queries (~33% of all AI citations per Princeton GEO).
- Market trends: 4-6 bullets
- Caveats: 3-5 disclaimers
- Related units: 3-4 links

## Step 4: Create the .html file

Create the HTML file at: prototype/{category}/{subcategory}/{topic}/{version_tag}.html

Follow the EXACT pattern from the example HTML and the matching template in `knowledge_pipeline/templates/`. Requirements (mirrors the templates exactly):
- <title>: For product_comparison: "Best {Topic} {Year}: {N} Compared ({M} Sources) | knowledgelib.io". For other types: "{Title} | knowledgelib.io"
- <meta name="description">: summary with numbers
- <meta name="viewport" content="width=device-width, initial-scale=1">
- Open Graph tags: og:type ("article"), og:title, og:description (same as meta description), og:url, og:site_name ("knowledgelib.io"), og:image ("https://knowledgelib.io/images/og-default.png"), og:locale ("en_US"), article:published_time, article:modified_time
- Twitter Card tags: twitter:card ("summary_large_image"), twitter:title, twitter:description, twitter:image
- All core ai:* meta tags (type, confidence, last_verified, domain, canonical_question, aliases, raw, token_estimate, source_count, freshness, version, first_published). CRITICAL: `ai:freshness` must equal `temporal_validity.status` (volatile/stable/evolving) — never use legacy values like "monthly"/"quarterly"/"yearly"
- Additional ai:* meta tags: ai:entity_type, ai:jurisdiction, ai:temporal_status, ai:change_sensitivity
- **Universal Commerce Protocol meta tags** (every card): commerce:protocol, commerce:agent-ready, commerce:checkout-via ("affiliate-redirect" for product cards, "none" otherwise), commerce:offers-count (count of buy_links, 0 for non-product), commerce:currency ("USD", product cards only)
- **AggregateRating** field on the primary entity JSON-LD: ratingValue = confidence × 5, ratingCount = source_count, name = "Editorial confidence (per /methodology)"
- **FAQPage JSON-LD** (after BreadcrumbList): canonical_question + first 5 aliases as Question entries, all sharing the same plain-text acceptedAnswer derived from the primary section (~600 chars max, citations stripped)
- **Product + Offer + Review @graph** (product_comparison only): one Product per buy_link with name, url (/go/{slug}), sku (ASIN), offers (price extracted from comparison table, priceCurrency USD, availability InStock, seller Amazon), review (reviewBody = first sentence of the use-case description for that product)
- **ARIA**: <main role="main"> wrapper; <aside class="unit-meta" aria-label="Knowledge unit metadata"> (NOT <div>); confidence-badge with aria-label; tables with aria-label and th scope="col"; <nav class="related-links" aria-label="Related knowledge units"> (NOT <div>); <footer role="contentinfo" aria-label="Site footer">; buy links with aria-label="Check price for {Product Name} on Amazon"
- For software/concept/rule cards: ai:sections (comma-separated list of available sections)
- **Universal Commerce Protocol meta tags** (every card):
  - `<meta name="commerce:protocol" content="schema.org-offer; ucp">`
  - `<meta name="commerce:agent-ready" content="true">`
  - `<meta name="commerce:checkout-via" content="affiliate-redirect">` (or `"none"` for non-product cards)
  - `<meta name="commerce:offers-count" content="N">` (count of buy_links; `0` for non-product cards)
  - `<meta name="commerce:currency" content="USD">` (product cards only)
- Schema.org JSON-LD `Dataset` (with `creator` field) — must include `aggregateRating` field with `ratingValue = confidence × 5`, `ratingCount = source_count`, `name: "Editorial confidence (per /methodology)"`
- Schema.org JSON-LD `BreadcrumbList` (Home > Category > Subcategory > Title)
- **FAQPage JSON-LD** — `mainEntity` is the canonical_question + first 5 aliases as Q/A pairs, all sharing the same `acceptedAnswer.text` derived from the primary section (Summary / TL;DR / Definition / Rule / Fact, max ~600 chars)
- For concept cards: `DefinedTerm` JSON-LD; for software cards: `TechArticle` JSON-LD (rating goes on TechArticle, not Dataset)
- **Product + Offer + Review @graph block** (product_comparison cards only) — one Product entry per `buy_link` with: `name`, `url` (the `/go/{slug}` redirect), `sku` (ASIN), `offers` (Offer with `price` extracted from comparison table, `priceCurrency: "USD"`, `availability: "https://schema.org/InStock"`, `seller: Amazon`), and `review` (with `reviewBody` = first sentence of the matching use-case description, `author: knowledgelib.io`, `itemReviewed: {Product name}`)
- Body as rendered HTML (NOT raw markdown):
  - `<main role="main">` wraps everything between `<body class="...">` open and `<footer>`
  - `<h1>`, `<h2>`, `<h3>` headings
  - **Immediately after `<h1>`**: `<h2 id="canonical-question-heading" class="canonical-question">{canonical_question — verbatim from frontmatter}</h2>` — AI tree-walking algorithms read H1 then H2 first; this gives them a clean question→answer pair before any prose
  - **TL;DR section** (product_comparison only, between canonical-question H2 and Summary): `<section id="tldr"><h2 id="tldr-heading">TL;DR</h2><p><strong>Top pick: ...</strong> — ...<br><strong>Best value: ...</strong> — ...<br><strong>Best budget: ...</strong> — ...</p></section>`. Each bolded pick must be a buy_link product. 30–50 words total.
  - **Head-to-Head Comparisons** `<section id="head-to-head">` (product_comparison only, between Best-for and Decision Logic): 3-5 `<h3>{Model A} vs {Model B}</h3>` blocks, each with a 2-3 sentence pick + a `<p><strong>Pick A if:</strong> ...<br><strong>Pick B if:</strong> ...</p>` block
  - `<p>` paragraphs with inline source links: `[<a href="url">src1</a>]`
  - `<div class="table-wrap"><table aria-label="...">` for comparison table — use `<th scope="col">` for column headers
  - `<ul><li>` for trends and caveats
  - `<aside class="unit-meta" data-card-id="{card_id}" aria-label="Knowledge unit metadata">` with `<span class="confidence-badge" aria-label="Confidence score X out of 1">`, verified date in `<span id="verified-date">`, and freshness from priority
  - Buy links: `<a href="url" rel="sponsored nofollow" aria-label="Check price for {Product Name} on Amazon">Check price</a>`
  - `<nav class="related-links" aria-label="Related knowledge units">` (NOT a `<div>`) wrapping the related-units block
  - `<footer role="contentinfo" aria-label="Site footer">` with breadcrumbs (see example)
  - Before `</body>`: include the verified-date.js script block (see existing cards for the exact pattern)

## Step 4b: Extract long scripts (software cards only)

If this is a software_reference card, run:
```bash
node knowledge_pipeline/extract_scripts.js
```
This extracts code blocks ≥25 lines from the .md file into a `scripts/` subdirectory, replacing them with 5-line snippets + links. The .html retains full code blocks (intentional: HTML is for humans, .md is token-optimized for AI).

## Step 5: Insert into database

Create a JSON file at: knowledge_pipeline/card_data_{topic}.json
with fields: id, category, subcategory, topic, version_tag, canonical_question, aliases, entity_type, region, confidence, token_estimate, source_count, md_path, html_path, priority, buy_links (array of {slug, product_name, asin, retailer, destination_url}).

**IMPORTANT for priority**: The `priority` field ("high", "medium", or "low") MUST be included — it maps to pop_index in the database and determines the card's refresh schedule.

**IMPORTANT for buy_links**: Each buy_link object MUST use these exact field names: `slug`, `product_name`, `asin`, `retailer` (value: `"amazon_us"`), `destination_url`.
- If ASIN was found: `"destination_url": "https://www.amazon.com/dp/{ASIN}?tag=knowledgelib-20"`
- If ASIN not found (unreleased): `"asin": null`, `"destination_url": "https://www.amazon.com/s?k={Product+Name}&tag=knowledgelib-20"`
- Do NOT use field names like `"product"`, `"url"`, or `"retailer": "Amazon"` — these will break the DB insert.

Then run: node db/insert_card.js knowledge_pipeline/card_data_{topic}.json

The insert script validates JSON against a Zod schema before DB insert. If validation fails (bad confidence, missing fields, invalid ASIN format), fix the JSON and re-run.

## Step 6: Update tracker

In knowledge_pipeline/tracker.md, change row #{row_number}'s status from `in-progress` to `updated`.
Do NOT update the Statistics section (reconciliation will handle it).

## Step 7: Report

Return a summary with:
- Card ID
- Canonical question
- Number of products compared
- Number of sources cited
- Confidence score
- Files created (paths)
- DB insert status (success/error)
```

### Orchestration Step 3: Monitor wave progress

After launching each wave, use `TaskOutput` with `block: true` to wait for each agent in that wave to complete. Report progress to the user as agents finish: "Wave 1, card 3/8 done: soundbars-under-300 (confidence: 0.88)". Only after **all** agents in the current wave have completed (success or failure) may you launch the next wave.

If any agents in a wave failed (rate-limit error, validation error), revert their tracker rows from `in-progress` back to `pending` before launching the next wave so they can be retried in a future run.

### Orchestration Step 4: Reconcile

Once ALL agents have completed, run:
```bash
node knowledge_pipeline/reconcile.js
```

If the direct DB connection fails (e.g., `getaddrinfo ENOTFOUND`), use the REST fallback:
```bash
node knowledge_pipeline/reconcile_rest.js
```

This regenerates catalog.json, sitemap.xml, the "Available Knowledge Units" section of index.html, `.well-known/ai-knowledge.json` (unit_count, domains, last_updated), and syncs tracker.md statistics from the actual row statuses. The index.html update reads each card's HTML `<title>` tag and groups entries by category/subcategory using the display configuration in `reconcile.js` (`INDEX_SECTIONS`).

### Orchestration Step 5: Regenerate llms.txt and llms-full.txt

After reconciliation succeeds (catalog.json is fresh), regenerate both LLM discovery files:

```bash
node knowledge_pipeline/gen_llms_full.js
```

This reads from `catalog.json` and writes `prototype/llms-full.txt` with all units indexed by domain.

Then update the unit count in `prototype/llms.txt` to match the new total (e.g., change "790 structured" to the current count). Use `sed` or the Edit tool to update both occurrences of the count in `llms.txt`.

### Orchestration Step 6: Deploy and IndexNow

After llms files are updated, deploy to Cloudflare Pages and submit new URLs:

```bash
npx wrangler pages deploy prototype --project-name=knowledgelib-io --commit-dirty=true
```

Then submit new URLs to search engines:
```bash
node knowledge_pipeline/indexnow.js --new
```

If deploy fails, report the error and suggest the user run it manually.

### Orchestration Step 7: Final report

Show a summary table:

```
| # | Card ID | Confidence | Sources | Products | Status |
|---|---------|------------|---------|----------|--------|
| 6 | consumer-electronics/audio/soundbars-under-300/2026 | 0.88 | 7 | 10 | Done |
| 7 | consumer-electronics/audio/soundbars-under-1000/2026 | 0.87 | 6 | 8 | Done |
...
```

Plus: "Reconciliation complete. catalog.json: N units, sitemap.xml: N URLs, index.html: N units across M categories. Deployed to Cloudflare Pages. IndexNow: N new URLs submitted."

If any agents failed, list the failures and suggest retrying with `--parallel --topic N`.

## Step-by-Step Process (per card)

### 1. Pick the next topic

**If `--topic N` was passed:**
Read `knowledge_pipeline/tracker.md`. Go directly to row N. If its status is not `pending`, warn the user and stop. Otherwise mark it as `in-progress`.

**If no `--topic` flag:**
Read `knowledge_pipeline/tracker.md`. Find the first row with status `pending`, prioritizing `high` > `medium` > `low`. Mark it as `in-progress` in the tracker.

If no pending topics exist, tell the user to run `/discover-topics` first.

### 2. Research phase

Use **WebSearch** to find 5-8 authoritative sources for this topic. Search for:
- `"best {topic}" {year} site:rtings.com`
- `"best {topic}" {year} site:nytimes.com/wirecutter`
- `"best {topic}" {year} site:tomsguide.com`
- `"best {topic}" {year} review comparison`
- `"best {topic}" {year} reddit`

Then use **WebFetch** on the top 3-5 results to extract:
- Product names, prices, key specs
- Pros/cons, test results, measurements
- Use-case recommendations
- Market trends

**Amazon ASIN lookup (required):** After identifying the 8-12 recommended products, search Amazon for each product's ASIN. Use WebSearch with queries like `"amazon.com {exact product name}"` or `"site:amazon.com {product model}"`. The ASIN is a 10-character alphanumeric code (usually starts with `B0`) found in Amazon URLs: `amazon.com/dp/BXXXXXXXXXX`. For products not yet available on Amazon (unreleased/pre-order), set `asin` to `null` and use the search URL format `https://www.amazon.com/s?k={product+name}&tag=knowledgelib-20`.

**Important**: Only use data you can cite. Every claim must trace to a source URL.

### 3. Create the .md file

Read the appropriate template from `knowledge_pipeline/templates/` based on entity type (see Template Selection above).

Also read an existing example card of the same type to see the quality bar.

Create the markdown file at:
```
prototype/{category}/{subcategory}/{topic}/{version_tag}.md
```

**Requirements:**
- YAML frontmatter with ALL required fields from the template
- `id`: matches the path `{category}/{subcategory}/{topic}/{version_tag}`
- `temporal_validity`: block with `status` (volatile/evolving/stable), `change_sensitivity` (high/medium/low), `next_review` (date), `last_breaking_change` (description or null)
- `jurisdiction`: `global` (default) or specific jurisdiction for region-specific content
- `constraints`: 3-5 structured hard limits/caveats in YAML frontmatter — agents parse these before reading body
- `skip_this_unit_if`: 2-4 negative constraints with `condition` + `use_instead` — prevents wrong-card retrieval in RAG
- `related_kos`: typed links to other units (depends_on, related_to, solves, alternative_to, often_confused_with)
- `confidence`: score based on source quality and quantity:
  - 0.90-0.95: 6+ high-reliability sources, cross-verified data
  - 0.85-0.89: 4-5 high-reliability sources
  - 0.80-0.84: 3-4 sources, some moderate reliability
  - 0.70-0.79: limited sources or rapidly changing data
- `aliases`: 5-8 alternative phrasings an AI agent might search for
- `buy_links`: one per recommended product, using `/go/{product-slug}` URLs
- `sources`: 5-8 sources with id, title, author, url, type, published date, reliability rating
- **Canonical-question H2**: verbatim from frontmatter, immediately after H1 — gives AI tree-walkers a question→answer pair at the top
- **TL;DR hero block**: 30–50 word callout between canonical-question H2 and Summary, with bolded Top Pick / Best Value / Best Budget + prices + one-clause reasons. RAG snippet extractors lift this verbatim — do NOT bury the answer
- Summary: 2-3 paragraphs expanding on the TL;DR with specific numbers and source citations
- Comparison table: 8-12 products with key specs
- Best-for sections: 5-7 use cases with detailed explanations
- **Head-to-Head Comparisons** (product_comparison only): 3-5 pairwise matchups of the top picks (e.g., "JBL Flip 7 vs Soundcore Motion 300") between Best-for and Decision Logic. Each subsection picks a winner + states the tradeoff + lists "Pick A if" / "Pick B if" scenarios. Captures "X vs Y" queries (~33% of all AI citations per Princeton GEO research).
- Market trends: 4-6 bullet points
- Caveats: 3-5 disclaimers
- Related units: 3-4 links to related topics

**Citation format**: Every factual claim MUST have inline citations like `[src1, src2]`.

### 4. Create the .html file

Read the matching HTML template from `knowledge_pipeline/templates/` for the structure.

Also read an existing example of the same type for the exact pattern.

Create the HTML file at:
```
prototype/{category}/{subcategory}/{topic}/{version_tag}.html
```

**Requirements:**
- `<title>`: For product_comparison: `Best {Topic} {Year}: {N} Compared ({M} Sources) | knowledgelib.io` (e.g., "Best Bookshelf Speakers 2026: 12 Compared (8 Sources) | knowledgelib.io"). For other types: `{Title} | knowledgelib.io`
- `<meta name="description">`: Concise summary with numbers
- `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Open Graph meta tags: `og:type` ("article"), `og:title`, `og:description`, `og:url`, `og:site_name` ("knowledgelib.io"), `og:image` ("https://knowledgelib.io/images/og-default.png"), `og:locale` ("en_US"), `article:published_time`, `article:modified_time`
- Twitter Card meta tags: `twitter:card` ("summary_large_image"), `twitter:title`, `twitter:description`, `twitter:image`
- Core `ai:*` meta tags plus: `ai:entity_type`, `ai:jurisdiction`, `ai:temporal_status`, `ai:change_sensitivity`
- For software/concept/rule cards: `ai:sections` listing available sections
- **Universal Commerce Protocol meta tags** (every card): `commerce:protocol`, `commerce:agent-ready`, `commerce:checkout-via` (`"affiliate-redirect"` for product cards, `"none"` otherwise), `commerce:offers-count` (count of buy_links, `0` for non-product), `commerce:currency` (`"USD"`, product cards only)
- Schema.org JSON-LD `Dataset` (with `creator` field) — MUST include `aggregateRating` field: `ratingValue` = confidence × 5 (rounded to 2 decimals), `bestRating: 5`, `ratingCount` = source_count, `reviewCount` = source_count, `name: "Editorial confidence (per /methodology)"`. For software cards the rating goes on `TechArticle` instead of `Dataset`.
- Schema.org JSON-LD `BreadcrumbList`
- **FAQPage JSON-LD** with canonical_question + first 5 aliases as Q/A pairs, all sharing the same `acceptedAnswer.text` derived from the primary section (see FAQ Schema section below)
- **Product + Offer + Review @graph block** (product_comparison cards only) — one Product entry per `buy_link` with `name`, `url`, `sku` (ASIN), `offers` (with `price` extracted from comparison table, `priceCurrency: "USD"`, `availability: InStock`, `seller: Amazon`), `review` (with `reviewBody` = first sentence of the matching use-case description, `author: knowledgelib.io`)
- For concept cards: `DefinedTerm` JSON-LD; for software cards: `TechArticle` JSON-LD
- Body: **rendered HTML** (NOT raw markdown). Convert the .md content into proper HTML elements:
  - `<main role="main">` wrapping all body content (between `<body class="...">` open and `<footer>`)
  - `<h1>` for the title, `<h2>` for sections, `<h3>` for use-case subsections
  - **Immediately after `<h1>`**: `<h2 id="canonical-question-heading" class="canonical-question">{canonical_question — verbatim from frontmatter}</h2>` — required on every entity type so AI tree-walking algorithms see a clean question→answer pair before any prose
  - **Product cards only — TL;DR section** (between canonical-question H2 and Summary): `<section id="tldr"><h2 id="tldr-heading">TL;DR</h2><p><strong>Top pick: {Model} (~${price})</strong> — {one-clause why}.<br><strong>Best value: ...</strong><br><strong>Best budget: ...</strong></p></section>`. Each bolded pick must be a buy_link product. 30–50 words. RAG snippet extractors lift this verbatim.
  - **Product cards only — Head-to-Head Comparisons** `<section id="head-to-head">` between Best-for and Decision Logic: 3-5 `<h3>{Model A} vs {Model B}</h3>` blocks, each with a 2-3 sentence verdict + a `<p><strong>Pick A if:</strong> ...<br><strong>Pick B if:</strong> ...</p>` block. Targets "X vs Y" queries (~33% of all AI citations per Princeton GEO research).
  - **Product cards only — Generate `pricing.md`** in the SAME directory as the .md/.html. After the .md/.html are written, also emit `prototype/{category}/{subcategory}/{topic}/pricing.md` containing every buy_link product with name, price (extracted from the comparison table), ASIN, and `/go/{slug}` URL. Easiest path: run `node knowledge_pipeline/generate_pricing_md.js --card {category}/{subcategory}/{topic}/{version_tag}` (or omit `--card` to regenerate all). AI shopping agents parse this file directly without rendering the page.
  - `<p>` for paragraphs
  - `<div class="table-wrap"><table aria-label="...">...</table></div>` for comparison tables — use `<th scope="col">` for column headers
  - `<ul><li>` for bullet lists (trends, caveats)
  - `<aside class="unit-meta" data-card-id="{card_id}" aria-label="Knowledge unit metadata">` with `<span class="confidence-badge" aria-label="Confidence score X out of 1">`, verified date in `<span id="verified-date">`, and freshness label from priority (use `<aside>`, NOT `<div>`)
  - Source citations as clickable links: `[<a href="{source_url}">srcN</a>]`
  - Buy links: `<a href="url" rel="sponsored nofollow" aria-label="Check price for {Product Name} on Amazon">Check price</a>`
  - Related units wrapped in `<nav class="related-links" aria-label="Related knowledge units">` (NOT `<div>`)
  - `<footer role="contentinfo" aria-label="Site footer">` with navigation breadcrumbs
  - **Before `</body>`**: include the verified-date.js script block (copy the exact pattern from existing cards in `prototype/`)
- See the existing cards in `prototype/` for the exact rendered HTML pattern (e.g., `prototype/consumer-electronics/audio/wireless-earbuds-under-150/2026.html`)

### 4a. FAQ JSON-LD (all cards)

Add a `FAQPage` JSON-LD block after the `BreadcrumbList` block in `<head>`. The pattern is the SAME for every entity type:

- `mainEntity` is an array of `Question` objects
- The first `Question` is the `canonical_question`
- Then add up to 5 `aliases` from frontmatter as additional `Question` entries
- ALL questions share the SAME `acceptedAnswer.text` — derived from the primary section of the card (Summary for product_comparison, TL;DR for software_reference, Definition for concept, Rule for rule, Fact for fact)
- Plain-text answer, max ~600 characters, with markdown links/citations stripped

**Example JSON-LD:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are the best wireless earbuds under $150 in 2026?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The sub-$150 wireless earbuds market in 2026 is more competitive than ever. The Sony WF-C710N (~$120) remains the consensus best overall..."
      }
    },
    {
      "@type": "Question",
      "name": "best budget earbuds 2026",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The sub-$150 wireless earbuds market in 2026 is more competitive than ever. The Sony WF-C710N (~$120) remains the consensus best overall..."
      }
    }
  ]
}
</script>
```

This enables Google FAQ rich snippets (which expand SERP listings 2-3x) and gives AI agents a structured Q→A mapping for the canonical question and its aliases.

### 4b. Product + Offer + Review @graph (product_comparison only)

For every product_comparison card, add a Product `@graph` JSON-LD block — one Product entry per `buy_link`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "@id": "https://knowledgelib.io/{card_id}#product-{slug}",
      "name": "Sony WF-C710N",
      "url": "https://knowledgelib.io/go/sony-wf-c710n",
      "sku": "B0DWHPBK42",
      "offers": {
        "@type": "Offer",
        "price": "100",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": "https://knowledgelib.io/go/sony-wf-c710n",
        "seller": {"@type": "Organization", "name": "Amazon"}
      },
      "review": {
        "@type": "Review",
        "author": {"@type": "Organization", "name": "knowledgelib.io"},
        "reviewBody": "Consensus pick across Tom's Guide, SoundGuys, and What Hi-Fi.",
        "itemReviewed": {"@type": "Product", "name": "Sony WF-C710N"}
      }
    }
  ]
}
</script>
```

Per-product fields:
- `name`, `url` (the `/go/{slug}` redirect), `sku` (ASIN — omit if `asin: null`)
- `offers.price` — extract the lower bound from the comparison-table price column (e.g., `~$100-120` → `"100"`). If no price is parseable, omit `price` and `priceCurrency` but keep the rest of the Offer.
- `offers.priceCurrency: "USD"`, `offers.availability: "https://schema.org/InStock"`, `offers.seller: Amazon`
- `review.reviewBody` — first sentence of the use-case description for that product (e.g., the paragraph after `### Best Overall: Sony WF-C710N`). Strip citations and markdown links. Cap at ~280 chars. If extraction fails, fall back to `"Editorial pick from knowledgelib.io comparison."`

This makes every card directly agent-shoppable — AI shopping agents can extract product/price/seller without parsing prose.

### 4c. AggregateRating on the primary entity

Add an `aggregateRating` field to the primary JSON-LD entity (Dataset for product/concept/rule/fact, TechArticle for software, DefinedTerm for concept where applicable):

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.50",
  "bestRating": "5",
  "worstRating": "0",
  "ratingCount": "9",
  "reviewCount": "9",
  "name": "Editorial confidence (per /methodology)"
}
```

Compute `ratingValue` as `confidence × 5` rounded to 2 decimals (e.g., confidence 0.90 → 4.50). Use `source_count` for both `ratingCount` and `reviewCount`. The `name` field is the fixed string `"Editorial confidence (per /methodology)"` — this is editorial confidence per the published methodology, NOT user reviews.

### 4b. Extract long scripts (software cards only)

If the entity type is `software_reference`, run after creating both .md and .html:
```bash
node knowledge_pipeline/extract_scripts.js
```
This extracts code blocks ≥25 lines from `prototype/software/**/*.md` into `scripts/` subdirectories. Each extracted block is replaced with a 5-line snippet + link to the full script file. The .html file retains full inline code blocks (intentional: HTML serves human readers/SEO, .md is token-optimized for AI agents).

The tool is idempotent — it skips files that already have a `scripts/` directory.

### 5. Update catalog.json

**Skip this step if `--parallel` flag is set.** (Reconciliation script will handle it.)

Read `prototype/catalog.json`. Add the new unit to the `units` array:

```json
{
  "id": "{category}/{subcategory}/{topic}/{version_tag}",
  "canonical_question": "...",
  "aliases": [...],
  "domain": "{category} > {subcategory} > {topic_readable}",
  "confidence": 0.88,
  "last_verified": "YYYY-MM-DD",
  "freshness": "{freshness}",
  "temporal_scope": "YYYY-YYYY",
  "url": "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}",
  "raw_md": "https://knowledgelib.io/api/v1/units/{category}/{subcategory}/{topic}/{version_tag}.md",
  "source_count": N,
  "token_estimate": N
}
```

Also update `total_units` count and add to `domains` array if the category/subcategory is new.

### 6. Update sitemap.xml

**Skip this step if `--parallel` flag is set.** (Reconciliation script will handle it.)

Read `prototype/sitemap.xml`. Add a new `<url>` entry before the closing comment:

```xml
<url>
  <loc>https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}</loc>
  <lastmod>{YYYY-MM-DD}</lastmod>
  <changefreq>{freshness}</changefreq>
  <priority>0.9</priority>
</url>
```

### 7. Insert into database

**If `--parallel` flag is set:** Use `knowledge_pipeline/card_data_{topic-slug}.json` as the temp file name.
**Otherwise:** Use `knowledge_pipeline/card_data_temp.json`.

Create the temporary JSON file with:

```json
{
  "id": "{category}/{subcategory}/{topic}/{version_tag}",
  "category": "{category}",
  "subcategory": "{subcategory}",
  "topic": "{topic}",
  "version_tag": "{version_tag}",
  "canonical_question": "...",
  "aliases": [...],
  "entity_type": "product_comparison",
  "region": "global",
  "confidence": 0.88,
  "token_estimate": 1800,
  "source_count": 8,
  "md_path": "/{category}/{subcategory}/{topic}/{version_tag}.md",
  "html_path": "/{category}/{subcategory}/{topic}/{version_tag}.html",
  "priority": "{priority}",
  "buy_links": [
    {
      "slug": "samsung-galaxy-s25-ultra",
      "product_name": "Samsung Galaxy S25 Ultra",
      "asin": "B0DP3CP2SY",
      "retailer": "amazon_us",
      "destination_url": "https://www.amazon.com/dp/B0DP3CP2SY?tag=knowledgelib-20"
    },
    {
      "slug": "unreleased-product-example",
      "product_name": "Unreleased Product Example",
      "asin": null,
      "retailer": "amazon_us",
      "destination_url": "https://www.amazon.com/s?k=Unreleased+Product+Example&tag=knowledgelib-20"
    }
  ]
}
```

Then run:
```bash
node db/insert_card.js knowledge_pipeline/card_data_{filename}.json
```

**Note:** The insert script validates the JSON against a Zod schema (`db/card_schema.js`) before touching the database. If validation fails, you'll get per-field error messages. Common causes: confidence outside 0–1, missing required fields, ASIN not matching `/^B[A-Z0-9]{9}$/`, or `destination_url` not a valid URL. Fix the JSON and re-run.

### 8. Update tracker

In `knowledge_pipeline/tracker.md`:
- Change this topic's status from `in-progress` to `updated`
- **If `--parallel` flag is set:** Do NOT update the Statistics section counts (reconciliation will handle it)
- **Otherwise:** Update the Statistics section counts

### 9. Report

Show a summary of the created card:
- Card ID and canonical question
- Number of products compared
- Number of sources cited
- Confidence score
- Files created (paths)
- DB insert status
- **If `--parallel`:** Remind user to run `node knowledge_pipeline/reconcile.js` when all parallel sessions are done (this regenerates catalog.json, sitemap.xml, index.html, ai-knowledge.json, and tracker stats). If DB connection fails, use `reconcile_rest.js` instead.

In default mode (single card), after the report proceed to Step 10.
In `--batch` mode, loop back to Step 1 for the next pending topic. After all batch cards are done, proceed to Step 10.

### 10. Reconcile, Regenerate LLMs files, Deploy, and IndexNow

After all cards are created (single, batch, or parallel), run the full publish pipeline:

```bash
node knowledge_pipeline/reconcile.js
```

If the direct DB connection fails (e.g., `getaddrinfo ENOTFOUND`), use the REST fallback:
```bash
node knowledge_pipeline/reconcile_rest.js
```

Then regenerate the LLM discovery files (reads from the freshly updated `catalog.json`):
```bash
node knowledge_pipeline/gen_llms_full.js
```

Also update the unit count in `prototype/llms.txt` to match the new total (update both occurrences of the count number).

Then deploy to Cloudflare Pages:
```bash
npx wrangler pages deploy prototype --project-name=knowledgelib-io --commit-dirty=true
```

Then submit new URLs to search engines:
```bash
node knowledge_pipeline/indexnow.js --new
```

**If `--parallel` flag is set:** Skip this step — remind the user to run reconcile + deploy + indexnow manually after all parallel sessions complete.

## Quality Checklist

Before marking a card as done, verify:
- [ ] Every factual claim has at least one `[srcN]` citation
- [ ] All source URLs are real (from your WebSearch/WebFetch results)
- [ ] Confidence score matches the source quality rubric
- [ ] **Canonical-question H2** present immediately after `<h1>` — verbatim from frontmatter (every entity type)
- [ ] **TL;DR section** present between canonical-question H2 and Summary, 30–50 words, each bolded pick is a buy_link product (product_comparison only)
- [ ] **Head-to-Head Comparisons section** present between Best-for and Decision Logic, 3–5 pairwise matchups with "Pick A if / Pick B if" blocks (product_comparison only)
- [ ] **`pricing.md` generated** in the same directory as the .md/.html via `node knowledge_pipeline/generate_pricing_md.js --card {card_id}` (product_comparison only)
- [ ] Buy links use the `/go/{slug}` pattern (product_comparison only)
- [ ] HTML has FAQPage JSON-LD: canonical_question + first 5 aliases as Question entries, all sharing the same `acceptedAnswer.text` derived from the primary section
- [ ] Product comparison `<title>` follows format: `Best {Topic} {Year}: {N} Compared ({M} Sources) | knowledgelib.io`
- [ ] HTML has all core `ai:*` meta tags plus: `ai:entity_type`, `ai:jurisdiction`, `ai:temporal_status`, `ai:change_sensitivity`, `ai:constraints`, `ai:skip_this_unit_if`
- [ ] `ai:freshness` meta tag matches `temporal_validity.status` (volatile/stable/evolving — NOT legacy monthly/quarterly/yearly)
- [ ] HTML has Universal Commerce Protocol meta tags: `commerce:protocol`, `commerce:agent-ready`, `commerce:checkout-via`, `commerce:offers-count`, plus `commerce:currency` for product cards
- [ ] HTML has OG + Twitter Card meta tags (og:title, og:description, og:image, twitter:card, etc.)
- [ ] HTML has BreadcrumbList JSON-LD (Home > Category > Subcategory > Title)
- [ ] Primary entity (Dataset / TechArticle / DefinedTerm) includes `aggregateRating` field with `ratingValue = confidence × 5`, `ratingCount = source_count`, `name: "Editorial confidence (per /methodology)"`
- [ ] **Product cards only**: Product + Offer + Review `@graph` JSON-LD block — one Product per buy_link with `name`, `url`, `sku` (ASIN), `offers` (price extracted from comparison table), `review.reviewBody` (first sentence of matching use-case description)
- [ ] HTML has `rel="sponsored nofollow"` on all affiliate links + `aria-label="Check price for {Product Name} on Amazon"` (product_comparison only)
- [ ] HTML body wrapped in `<main role="main">` (between `<body class="...">` and `<footer>`)
- [ ] `<aside class="unit-meta" aria-label="Knowledge unit metadata">` (NOT `<div>`) for the metadata strip; `<span class="confidence-badge" aria-label="Confidence score X out of 1">`
- [ ] All `<table>` elements have `aria-label="..."` and `<th scope="col">` headers
- [ ] `<nav class="related-links" aria-label="Related knowledge units">` (NOT `<div>`) for the related-units block
- [ ] `<footer role="contentinfo" aria-label="Site footer">` on the page footer
- [ ] Frontmatter has `temporal_validity` block (not flat `freshness`)
- [ ] Frontmatter has `jurisdiction` field (default: `global`)
- [ ] Frontmatter has `constraints` (3-5 structured hard limits in YAML array)
- [ ] Frontmatter has `skip_this_unit_if` (2-4 negative constraints with condition + use_instead)
- [ ] Frontmatter has `related_kos` with typed relationships (including `often_confused_with` where applicable)
- [ ] catalog.json `total_units` count is correct (skip if `--parallel`)
- [ ] For software cards: `extract_scripts.js` was run (code blocks ≥25 lines extracted to `scripts/` subdirectory in .md)
- [ ] Token estimate is reasonable (200-400 for facts, 300-600 for rules, 400-800 for concepts, 600-1800 for products, 2500-4000 for software)
- [ ] JSON buy_links use correct field names: `slug`, `product_name`, `asin`, `retailer` (`"amazon_us"`), `destination_url`
- [ ] Amazon ASINs are real (found via search, not fabricated). Products with ASINs use `/dp/{ASIN}?tag=knowledgelib-20` URLs
- [ ] Unreleased products have `"asin": null` with search URL fallback
