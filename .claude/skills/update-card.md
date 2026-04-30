---
name: update-card
description: Extend and update existing knowledge cards to match the latest template structure. Adds missing frontmatter fields, Decision Logic sections, ai:* meta tags, verified ASINs, and integrates fresh research data where relevant.
---

# Update Knowledge Card for knowledgelib.io

You are the knowledge card update agent for knowledgelib.io. Your job is to **extend and update** existing cards to match the current template structure — and integrate fresh data when research uncovers relevant changes.

## What This Skill Does

Takes an existing "done" card and brings its structure and content up to date:

1. **Frontmatter**: Adds missing fields (`jurisdiction`, `temporal_validity`, `related_kos`, `inputs_needed`), fixes `buy_links` format (old `product`/`url`/`retailer: Amazon` → new `slug`/`product_name`/`asin`/`retailer: amazon_us`/`destination_url`)
2. **Body**: Adds **Decision Logic** section (if/then rules based on existing card data)
3. **Fresh data**: Researches current sources — if new products, price changes, discontinued models, or updated specs are found, integrates them into the card
4. **HTML**: Adds missing `ai:*` meta tags (`entity_type`, `jurisdiction`, `temporal_status`, `change_sensitivity`, `sections`, `inputs_needed`), adds Decision Logic `<section>`, updates dates
5. **ASINs**: Looks up real Amazon ASINs for all products (including any newly added)
6. **DB**: Re-inserts card with updated metadata
7. **Tracker**: Marks row as `updated`

## Mode Selection

Check the flags the user passed:

- **Default (no flags)**: Update ONE card — the next eligible topic in the tracker (see "Card Selection" below). Show it for review when done.
- **`--topic N` flag**: Update the specific topic at row number N in the tracker (e.g., `--topic 6`).
- **`--batch` flag**: Update ALL eligible topics sequentially.
- **`--count N` flag**: Automatically update N cards in parallel using background subagents. See "Automated Parallel Mode" below.
- **`--entity-type T` flag**: Restrict selection to one entity type (e.g., `--entity-type product_comparison`). Combine with `--count N` to refresh N cards of that type.

## Card Selection

A card is "eligible to update" when it matches ANY of:

1. **Status `done`** — never went through the structural-update pass. Pick these first.
2. **Status `updated` AND stale** — already on the new template, but the underlying data is old. A card is stale when:
   - Its tracker `Date` is older than the card's `temporal_validity.next_review` window, OR
   - For `product_comparison` (volatile, change_sensitivity=high): tracker date >30 days old
   - For `software_reference` (stable/evolving, change_sensitivity=medium): tracker date >90 days old
   - For `concept`/`fact`/`rule` (stable, change_sensitivity=low): tracker date >180 days old

When picking N cards, sort eligible rows by oldest tracker `Date` first (most stale → freshest). When `--entity-type T` is set, filter to that entity type before sorting.

Refreshing an `updated` card runs the SAME workflow as updating a `done` card — the only difference is selection. Existing structure already matches the template, so most of the work is fresh research (Step 2) integrated into the body, with `last_verified` / dates / `next_review` rolled forward.
- **`--parallel` flag**: Safe mode for running multiple Claude Code sessions simultaneously. When set:
  - **MUST** be combined with `--topic N`
  - Uses `card_data_{topic-slug}.json` instead of shared temp file
  - Still edits .md + .html files (safe — different directories per topic)
  - Still inserts into database (safe — ON CONFLICT handles duplicates)
  - Still marks the tracker row as `updated`
  - Still runs reconcile → deploy → indexnow at the end

Example parallel usage across 3 terminals:
```
Terminal 1: /update-card --parallel --topic 6
Terminal 2: /update-card --parallel --topic 7
Terminal 3: /update-card --parallel --topic 8
```

## Automated Parallel Mode (`--count N`)

When the user passes `--count N` (e.g., `/update-card --count 5`), orchestrate N parallel subagents automatically:

### Concurrency cap: max 8 parallel sub-agents

**Hard rule: never launch more than 8 sub-agents in flight at the same time.** Bursts above 8 trigger Anthropic backend throttles ("Server is temporarily limiting requests · Rate limited") that fail individual agents mid-research, and bursts above ~10 risk hitting the org's API spend cap.

If `N > 8`, split into waves:
- Wave size = 8 (or N if N < 8)
- Launch wave 1, then wait for **all 8 agents in that wave to complete** (use `TaskOutput` with `block: true` on each, in any order) before launching wave 2.
- Repeat until all N topics are processed.
- Example: `--count 30` → 4 waves (8 + 8 + 8 + 6).

Wave-by-wave is slower than a single big burst, but it is the difference between "all 30 cards update" and "11 of 30 fail and need manual retry."

### Orchestration Step 1: Pick the next N topics

Read `knowledge_pipeline/tracker.md`. Apply the eligibility rules from "Card Selection" above:
- Filter by `--entity-type` if set (matches the template mapping at the top of the tracker — e.g., `product_comparison` = all categories except `software`/`business`/`finance`/`compliance`/`consulting`/`signal-library`).
- Prefer `done` status first; if fewer than N `done` rows remain, fill the rest from stale `updated` rows sorted by oldest `Date`.

Mark ALL N selected rows as `in-progress` in the tracker immediately (prevents double-picking).

If fewer than N eligible topics remain, use however many are available and inform the user.

### Orchestration Step 2: Launch sub-agents in waves of ≤8

Use the **Task** tool to launch each wave's agents **in a single message** (parallel tool calls). For wave size, see the "Concurrency cap" rule above — never exceed 8 in flight. Each agent must be:
- `subagent_type: "general-purpose"`
- `run_in_background: true`
- `description`: short label like "Update card: soundbars-under-300"

Each agent's prompt MUST include ALL of the following (the agent has NO prior context — it starts fresh):

```
You are updating ONE existing knowledge card for knowledgelib.io — an AI Knowledge Library. You are NOT recreating the card. You are extending its structure to match the current template.

## Your Assigned Topic
- Tracker row: #{row_number}
- Category: {category}
- Subcategory: {subcategory}
- Topic slug: {topic}
- Version tag: {version_tag} (typically "2026")
- Entity type: {entity_type} (typically "product_comparison" for non-software, "software_reference" for software/*)
- Priority: {priority}
- Canonical question: "{canonical_question}"
- Card .md path: prototype/{category}/{subcategory}/{topic}/{version_tag}.md
- Card .html path: prototype/{category}/{subcategory}/{topic}/{version_tag}.html
- Temp JSON path: card_data_{topic}.json

## Step 1: Read existing card + current template

Read these files:
1. prototype/{category}/{subcategory}/{topic}/{version_tag}.md (the existing card)
2. prototype/{category}/{subcategory}/{topic}/{version_tag}.html (the existing card)
3. knowledge_pipeline/templates/{entity_type}.md (the current template)
4. knowledge_pipeline/templates/{entity_type}.html (the current template)
5. The reference card: prototype/consumer-electronics/audio/bluetooth-speakers-under-100/2026.md + .html (canonical example of the new format)

## Step 2: Research fresh data

Use WebSearch to check for updated information on this topic. Run these searches:
- "best {readable_topic}" {year} site:rtings.com
- "best {readable_topic}" {year} site:tomsguide.com
- "best {readable_topic}" {year} review comparison

Then use WebFetch on the top 2-3 results to extract:
- Any NEW products not in the existing card (launched since the card was last verified)
- Price changes for existing products
- Discontinued or replaced models
- Updated specs, test results, or rankings
- New market trends

**Integration rules:**
- If a new product has appeared in 2+ authoritative sources and belongs in this category, ADD it to the comparison table and create a use-case section if warranted
- If a product has been discontinued or replaced by a successor, note this in the card (update the table row, add a caveat)
- If prices have changed significantly (>15%), update the approximate prices
- If rankings have shifted (e.g., a new "best overall" winner), update the Summary and Best-for sections accordingly
- Add any new sources used to the frontmatter `sources:` block with proper id, title, author, url, type, published, reliability
- Update `confidence` score if source quality changed
- Keep the existing writing style and citation format — edits should be seamless
- Do NOT rewrite sections that are still accurate. Only modify what the fresh data requires.

## Step 3: Identify structural gaps

Compare the existing card against the current template. Typical gaps for older cards:

### Frontmatter (.md) gaps:
- Missing `jurisdiction: global`
- Missing `temporal_validity` block (status, last_breaking_change, next_review, change_sensitivity)
- Missing `constraints` block (3-5 structured hard limits in YAML array — agents parse before reading body)
- Missing `skip_this_unit_if` block (2-4 negative constraints with condition + use_instead — prevents wrong-card retrieval)
- Missing `related_kos` block (typed relationships to other units, including `often_confused_with`)
- Missing `inputs_needed` (agent hint questions — optional but recommended for product_comparison and software_reference)
- `buy_links` using old format (`product`, `url`, `retailer: Amazon`) instead of new format (`slug`, `product_name`, `asin`, `retailer: amazon_us`, `destination_url`)
- Missing or incorrect section comment headers. The EXACT headers must be:
  - `# === IDENTITY ===`
  - `# === VERIFICATION ===`
  - `# === TEMPORAL VALIDITY ===`
  - `# === CONSTRAINTS ===` (NOT "CONSTRAINTS (structured...)" — just "CONSTRAINTS")
  - `# === SKIP CONDITIONS ===` (NOT "NEGATIVE CONSTRAINTS" — must be "SKIP CONDITIONS")
  - `# === AGENT HINTS ===` (NOT "AGENT HINTS (optional...)" — just "AGENT HINTS")
  - `# === DISTRIBUTION ===`
  - `# === BUY LINKS ===`
  - `# === RELATED UNITS ===`
  - `# === SOURCES ===`

### Body (.md) gaps:
- Missing **Decision Logic** section (if/then rules for agent decision-making, between Use Cases and Market Trends)
- Missing **TL;DR hero block** between H1 / canonical-question H2 and Summary (product_comparison only) — 30–50 words, bolded Top Pick / Best Value / Best Budget with prices and one-clause reasons. RAG snippet extractors lift this verbatim, so do NOT bury the answer in prose.
- Missing **Head-to-Head Comparisons** section (product_comparison only) between Best for Each Use Case and Decision Logic — 3–5 pairwise matchups (e.g., "JBL Flip 7 vs Soundcore Motion 300") with verdict + "Pick A if / Pick B if" blocks. Targets "X vs Y" queries (~33% of all AI citations per Princeton GEO).

### HTML (.html) gaps:
- Missing **canonical-question H2** — required immediately after `<h1>` on every entity type. Format: `<h2 id="canonical-question-heading" class="canonical-question">{canonical_question — verbatim from frontmatter}</h2>`. Gives AI tree-walking algorithms a clean question→answer pair before any prose.
- Missing **TL;DR `<section id="tldr">`** between canonical-question H2 and Summary (product_comparison only) with bolded Top Pick / Best Value / Best Budget + prices + one-clause reasons (30–50 words)
- Missing **Head-to-Head `<section id="head-to-head">`** between Best-for and Decision Logic (product_comparison only) — 3-5 `<h3>{Model A} vs {Model B}</h3>` blocks with verdict + "Pick A if / Pick B if" paragraphs
- Missing sibling **`pricing.md`** in the card directory (product_comparison only) — generate with `node knowledge_pipeline/generate_pricing_md.js --card {card_id}`
- `ai:sections` meta tag missing `tldr` and `head_to_head` entries (product_comparison only — full list: `tldr,summary,comparison_table,use_cases,head_to_head,decision_logic,market_trends,caveats`)
- Missing `ai:entity_type` meta tag
- Missing `ai:jurisdiction` meta tag
- Missing `ai:temporal_status` meta tag
- Missing `ai:change_sensitivity` meta tag
- Missing `ai:constraints` meta tag (semicolon-separated constraints from frontmatter)
- Missing `ai:skip_this_unit_if` meta tag (condition → use_instead pairs, semicolon-separated)
- Missing `ai:sections` meta tag
- Missing `ai:inputs_needed` meta tag
- Missing Decision Logic `<section id="decision-logic">`
- Missing `data-relationship` attributes on related unit links (include `often_confused_with` where applicable)
- `ai:freshness` still saying "monthly" instead of matching temporal_validity.status (MUST be "volatile" for product_comparison, "stable" for software_reference debugging, "evolving" for migrations)
- **Missing Universal Commerce Protocol meta tags**: `commerce:protocol`, `commerce:agent-ready`, `commerce:checkout-via`, `commerce:offers-count`, `commerce:currency` (USD, product cards only)
- **Missing `aggregateRating` field on the primary entity JSON-LD** (Dataset / TechArticle / DefinedTerm): `ratingValue = confidence × 5`, `ratingCount = source_count`, `name: "Editorial confidence (per /methodology)"`
- **Missing FAQPage JSON-LD block** with canonical_question + first 5 aliases as Question entries, all sharing the same `acceptedAnswer.text` (plain-text, ~600 chars max, derived from primary section)
- **product_comparison only**: Missing Product + Offer + Review `@graph` JSON-LD block (one Product per `buy_link` with `name`, `url`, `sku` (ASIN), `offers` (price extracted from comparison table, priceCurrency USD, availability InStock, seller Amazon), `review.reviewBody` = first sentence of the matching use-case description)
- **Missing ARIA / accessibility landmarks**:
  - No `<main role="main">` wrapping the body content
  - `<div class="unit-meta">` instead of `<aside class="unit-meta" aria-label="Knowledge unit metadata">`
  - `<span class="confidence-badge">` lacks `aria-label="Confidence score X out of 1"`
  - `<table>` lacks `aria-label="..."` and headers lack `<th scope="col">`
  - `<div class="related-links">` instead of `<nav class="related-links" aria-label="Related knowledge units">`
  - `<footer>` lacks `role="contentinfo" aria-label="Site footer"`
  - Buy links lack `aria-label="Check price for {Product Name} on Amazon"`

## Step 4: Look up Amazon ASINs

For each product in the existing card's buy_links, search Amazon for the real ASIN:
- Use WebSearch with `"amazon.com {exact product name}"`
- The ASIN is a 10-character code starting with B0 in Amazon URLs: amazon.com/dp/BXXXXXXXXXX
- If not found: set `asin: null` and use search URL: `https://www.amazon.com/s?k={Product+Name}&tag=knowledgelib-20`
- If found: use `https://www.amazon.com/dp/{ASIN}?tag=knowledgelib-20`

## Step 5: Find related units

Search `prototype/` for cards in the same or adjacent categories to populate `related_kos`:
- `related_to`: Cards in the same subcategory or closely related topics
- `alternative_to`: Cards covering the same need at different price points or form factors
- `depends_on` and `solves`: Usually empty for product_comparison cards

Use existing card paths from the tracker or by globbing `prototype/{category}/{subcategory}/*/2026.md`.

## Step 6: Update the .md file

Apply all missing fields using Edit tool. Do NOT rewrite existing content — only ADD missing structure:

1. Add section comment headers using EXACT names (no extra text in parentheses):
   `# === IDENTITY ===`, `# === VERIFICATION ===`, `# === TEMPORAL VALIDITY ===`,
   `# === CONSTRAINTS ===`, `# === SKIP CONDITIONS ===`, `# === AGENT HINTS ===`,
   `# === DISTRIBUTION ===`, `# === BUY LINKS ===`, `# === RELATED UNITS ===`, `# === SOURCES ===`
2. Add `jurisdiction: global` (or appropriate value)
3. Add `temporal_validity` block:
   - product_comparison: status=volatile, change_sensitivity=high, next_review=+30 days
   - software_reference: status=stable (debugging) or evolving (migrations), change_sensitivity=medium
4. Add `inputs_needed` (2-4 structured questions based on the card's decision factors)
5. Fix `buy_links` format to use `slug`, `product_name`, `asin`, `retailer: amazon_us`, `destination_url`
6. Add `related_kos` block with typed relationships
7. Add **Decision Logic** section (5-7 if/then rules based on existing card content — cite existing sources). Each rule uses `-->` arrow format: `### If {condition}\n--> {recommendation}. [src1, src2]`
8. **Add canonical-question H2** immediately under H1 — verbatim copy of the `canonical_question` from frontmatter. Format: `## {canonical_question}` (no quotes). Required on every entity type.
9. **Product cards only — Add TL;DR section** between canonical-question H2 and Summary. 30–50 words. Bolded **Top pick / Best value / Best budget** with prices and one-clause reasons. Each pick must be a buy_link product. Cite primary sources.
10. **Product cards only — Add Head-to-Head Comparisons section** between Best for Each Use Case and Decision Logic. 3–5 `### {Model A} vs {Model B}` matchups with verdict + `**Pick A if:** ... **Pick B if:** ...` blocks. Use natural buyer matchups, not every permutation.
11. Fix Related Units paths if they point to non-existent cards
12. Update `last_verified` to today's date
13. Update `suggested_citation` date

## Step 7: Update the .html file

Apply all missing meta tags and sections using Edit tool. **Easiest path: run `node knowledge_pipeline/migrate_agent_ready.js --only={card_path_substring}` to inject the agent-ready blocks (UCP meta, FAQPage, AggregateRating, Product+Offer+Review for product cards, ARIA landmarks, `<main>`)** — it's idempotent and reads everything it needs from the .md frontmatter and body. Then apply the remaining card-specific edits below.

1. Add missing `ai:*` meta tags after existing ones: `ai:entity_type`, `ai:jurisdiction`, `ai:temporal_status`, `ai:change_sensitivity`, `ai:sections`, `ai:inputs_needed`
2. Add **Universal Commerce Protocol meta tags** (every card): `commerce:protocol`, `commerce:agent-ready`, `commerce:checkout-via` (`"affiliate-redirect"` for product cards, `"none"` otherwise), `commerce:offers-count` (count of buy_links, `0` for non-product), `commerce:currency` (`"USD"`, product cards only)
3. Add **`aggregateRating`** field to the primary JSON-LD entity (Dataset / TechArticle / DefinedTerm): `ratingValue = confidence × 5` (e.g., 0.90 → "4.50"), `bestRating: 5`, `ratingCount = source_count`, `reviewCount = source_count`, `name: "Editorial confidence (per /methodology)"`
4. Add **FAQPage JSON-LD block** after BreadcrumbList: canonical_question + first 5 aliases as Question entries, all sharing the same `acceptedAnswer.text` derived from the primary section (Summary / TL;DR / Definition / Rule / Fact, plain-text, ~600 chars max, citations stripped)
5. **product_comparison only**: Add **Product + Offer + Review `@graph` JSON-LD block** — one Product per buy_link with: `name`, `url` (`/go/{slug}`), `sku` (ASIN), `offers` (with `price` extracted from comparison table, `priceCurrency: "USD"`, `availability: "https://schema.org/InStock"`, `seller: Amazon`), `review.reviewBody` = first sentence of the matching use-case description (citations stripped, ~280 chars max)
6. Add **ARIA landmarks**:
   - Wrap body content in `<main role="main">` (between `<body class="...">` open and `<footer>`)
   - Convert `<div class="unit-meta" data-card-id="...">` to `<aside class="unit-meta" data-card-id="..." aria-label="Knowledge unit metadata">`
   - Add `aria-label="Confidence score X out of 1"` to `<span class="confidence-badge">`
   - Add `aria-label="..."` to every `<table>` and `<th scope="col">` to header cells
   - Convert `<div class="related-links">` to `<nav class="related-links" aria-label="Related knowledge units">`
   - Convert `<footer>` to `<footer role="contentinfo" aria-label="Site footer">`
   - Add `aria-label="Check price for {Product Name} on Amazon"` to every `/go/{slug}` link
7. Update `ai:last_verified` to today's date
8. Update `ai:token_estimate` (+300-400 for Decision Logic addition)
9. Update `article:modified_time` and `dateModified` in JSON-LD to today
10. Update visible `<span id="verified-date">` to today
11. Update `ai:freshness` meta tag AND visible Freshness display to match temporal_validity.status (e.g., "volatile" not "monthly"). CRITICAL: `ai:freshness` must equal `temporal_validity.status` — never use legacy values like "monthly"/"quarterly"/"yearly"
12. Add `<section id="decision-logic">` with `<h2>Decision Logic</h2>` and all if/then rules as `<h3>` + `<p>` pairs (with inline source `<a>` links)
13. Add `data-relationship` attributes to related unit links
14. Update `ai:aliases` to include all aliases from frontmatter

## Step 7b: Extract long scripts (software cards only)

If this is a software_reference card, run after updating the .md file:
```bash
node knowledge_pipeline/extract_scripts.js
```
This extracts code blocks ≥25 lines from `prototype/software/**/*.md` into `scripts/` subdirectories. Each extracted block is replaced with a 5-line snippet + link to the full script file. The .html retains full inline code blocks (intentional: HTML serves human readers/SEO, .md is token-optimized for AI agents). The tool is idempotent — it skips files that already have a `scripts/` directory.

## Step 8: Insert into database

Create a JSON file at: card_data_{topic}.json

Include all fields: id, category, subcategory, topic, version_tag, canonical_question, aliases, entity_type, region, jurisdiction, confidence, token_estimate, source_count, md_path, html_path, priority, temporal_validity, related_kos, inputs_needed, buy_links.

Then run: `node db/insert_card.js card_data_{topic}.json`

Clean up the temp JSON file after successful insert.

## Step 9: Update tracker

In `knowledge_pipeline/tracker.md`, change this topic's status from `done` (or `in-progress`) to `updated` and set the date to today.

## Step 10: Reconcile, regenerate LLMs files, deploy, IndexNow

Run the full publish pipeline:
```bash
npm run publish
```

This runs reconcile → deploy → indexnow in sequence. After reconcile succeeds, also regenerate LLM discovery files:
```bash
node knowledge_pipeline/gen_llms_full.js
```
Then update the unit count in `prototype/llms.txt` to match the new total.

If reconcile fails (DB connection error), use the REST fallback:
```bash
node knowledge_pipeline/reconcile_rest.js
node knowledge_pipeline/gen_llms_full.js
# Update llms.txt unit count
npx wrangler pages deploy prototype --project-name=knowledgelib-io --commit-dirty=true
node knowledge_pipeline/indexnow.js --new
```

## Step 11: Report

Return a summary:
- Card ID
- Changes made (list of additions/fixes)
- Number of ASINs found vs search-URL fallbacks
- DB insert status
- Deploy status
```

### Orchestration Step 3: Monitor wave progress

After launching each wave, use `TaskOutput` with `block: true` to wait for each agent in that wave to complete. Report progress to the user as agents finish: "Wave 1, card 3/8 updated: soundbars-under-300". Only after **all** agents in the current wave have completed (success or failure) may you launch the next wave.

If any agents in a wave failed (rate-limit error, validation error), revert their tracker rows from `in-progress` back to their prior status (`done` or `updated`) before launching the next wave so they can be retried in a future run.

### Orchestration Step 4: Reconcile, regenerate LLMs files, and deploy

Once ALL agents have completed, run:
```bash
npm run publish
```

This runs reconcile → deploy → indexnow in sequence. After reconcile succeeds, also regenerate LLM discovery files:
```bash
node knowledge_pipeline/gen_llms_full.js
```
Then update the unit count in `prototype/llms.txt` to match the new total.

If reconcile fails (DB connection error), use the REST fallback:
```bash
node knowledge_pipeline/reconcile_rest.js
node knowledge_pipeline/gen_llms_full.js
# Update llms.txt unit count
npx wrangler pages deploy prototype --project-name=knowledgelib-io --commit-dirty=true
node knowledge_pipeline/indexnow.js --new
```

### Orchestration Step 5: Final report

Show a summary table:

```
| # | Card ID | ASINs Found | Changes | Status |
|---|---------|-------------|---------|--------|
| 6 | consumer-electronics/audio/soundbars-under-300/2026 | 8/10 | +jurisdiction, +temporal_validity, +decision_logic, +6 ai:* tags | Updated |
| 7 | consumer-electronics/audio/soundbars-under-1000/2026 | 7/8 | +jurisdiction, +temporal_validity, +decision_logic, +6 ai:* tags | Updated |
...
```

Plus: "Reconciliation complete. Deployed. N cards updated."

If any agents failed, list the failures and suggest retrying with `--parallel --topic N`.

## Step-by-Step Process (single card mode)

### 1. Pick the topic

**If `--topic N` was passed:**
Read `knowledge_pipeline/tracker.md`. Go directly to row N. Verify it has status `done`. Mark it as `in-progress`.

**If no `--topic` flag:**
Read `knowledge_pipeline/tracker.md`. Find the first row with status `done`. Mark it as `in-progress`.

If no `done` topics exist (all are `pending` or `updated`), tell the user.

### 2. Read existing card + template

Read the existing .md and .html files, plus the current template files for that entity type. Also read the reference card (wireless-earbuds-under-150/2026) to see the target format.

### 3. Launch background agents

Launch TWO background subagents in parallel (single message, both `run_in_background: true`):

1. **Research agent** — searches for fresh data on the topic (see Step 2 in the subagent prompt above for search queries and integration rules)
2. **ASIN agent** — looks up Amazon ASINs for all products in the card's buy_links

Continue with structural work while both run.

### 4. Find related units

Glob for cards in the same and adjacent categories:
```
prototype/{category}/{subcategory}/*/2026.md
prototype/{category}/*/{similar-topics}/2026.md
```

Build the `related_kos` structure from what exists.

### 5. Wait for research agent and integrate findings

Check the research agent results. If fresh data was found (new products, price changes, discontinued models, updated specs), note the changes to apply in the next steps. Follow the integration rules from Step 2 of the subagent prompt.

### 6. Update .md file

Use Edit tool to add all missing frontmatter fields, the Decision Logic section, and any fresh data changes. See Step 6 in the subagent prompt above for the structural additions list.

### 7. Update .html file

Use Edit tool to add all missing meta tags, the Decision Logic section, and reflect any fresh data changes. See Step 7 in the subagent prompt above for the full list.

### 7b. Extract long scripts (software cards only)

If this is a software_reference card, run `node knowledge_pipeline/extract_scripts.js` to extract code blocks ≥25 lines into `scripts/` subdirectory. Idempotent — skips files already processed.

### 8. Wait for ASINs and update buy_links

Check the ASIN agent results. Update buy_links in the .md file with verified ASINs.

### 9. Insert into database

Create card_data JSON, run `node db/insert_card.js`, clean up temp file.

### 10. Reconcile, regenerate LLMs files, deploy, IndexNow

```bash
npm run publish
```

This runs reconcile → deploy → indexnow in sequence. After reconcile succeeds, also regenerate LLM discovery files:
```bash
node knowledge_pipeline/gen_llms_full.js
```
Then update the unit count in `prototype/llms.txt` to match the new total.

If reconcile fails (DB connection error), use the REST fallback:
```bash
node knowledge_pipeline/reconcile_rest.js
node knowledge_pipeline/gen_llms_full.js
# Update llms.txt unit count
npx wrangler pages deploy prototype --project-name=knowledgelib-io --commit-dirty=true
node knowledge_pipeline/indexnow.js --new
```

### 11. Update tracker

Change status to `updated`, set date to today.

### 12. Report

Show summary of all changes made, including any fresh data integrated.

## Quality Checklist

Before marking a card as updated, verify:
- [ ] All YAML section headers use EXACT names: `# === CONSTRAINTS ===`, `# === SKIP CONDITIONS ===`, `# === AGENT HINTS ===`, `# === RELATED UNITS ===` (no extra text in parentheses)
- [ ] Frontmatter has `jurisdiction` field
- [ ] Frontmatter has `temporal_validity` block (status, change_sensitivity, next_review, last_breaking_change)
- [ ] Frontmatter has `constraints` (3-5 structured hard limits in YAML array)
- [ ] Frontmatter has `skip_this_unit_if` (2-4 negative constraints with condition + use_instead)
- [ ] Frontmatter has `related_kos` with typed relationships pointing to existing cards (including `often_confused_with`)
- [ ] Frontmatter has `inputs_needed` (recommended for product_comparison and software_reference)
- [ ] `buy_links` use correct format: `slug`, `product_name`, `asin`, `retailer: amazon_us`, `destination_url`
- [ ] ASINs are real (verified via search) or null with search-URL fallback
- [ ] Decision Logic section exists with 5-7 if/then rules using `-->` arrow format (NOT `->`)
- [ ] All related unit links point to cards that actually exist in prototype/ (glob to verify)
- [ ] HTML has all `ai:*` meta tags: entity_type, jurisdiction, temporal_status, change_sensitivity, constraints, skip_this_unit_if, sections, inputs_needed
- [ ] HTML has Universal Commerce Protocol meta tags: `commerce:protocol`, `commerce:agent-ready`, `commerce:checkout-via`, `commerce:offers-count`, `commerce:currency` (USD, product cards only)
- [ ] Primary entity JSON-LD (Dataset / TechArticle / DefinedTerm) includes `aggregateRating` field with `ratingValue = confidence × 5`, `ratingCount = source_count`, `name: "Editorial confidence (per /methodology)"`
- [ ] HTML has FAQPage JSON-LD: canonical_question + first 5 aliases as Question entries, all sharing the same `acceptedAnswer.text` derived from the primary section
- [ ] **Product cards only**: HTML has Product + Offer + Review `@graph` JSON-LD block — one Product per buy_link with `name`, `url`, `sku` (ASIN), `offers` (price extracted, currency USD, availability InStock, seller Amazon), `review.reviewBody` (first sentence of matching use-case description)
- [ ] HTML body wrapped in `<main role="main">` (between `<body class="...">` and `<footer>`)
- [ ] `<aside class="unit-meta" aria-label="Knowledge unit metadata">` (NOT `<div>`); `<span class="confidence-badge" aria-label="Confidence score X out of 1">`
- [ ] All `<table>` elements have `aria-label="..."` and `<th scope="col">` headers
- [ ] `<nav class="related-links" aria-label="Related knowledge units">` (NOT `<div>`) for the related-units block
- [ ] `<footer role="contentinfo" aria-label="Site footer">` on the page footer
- [ ] Buy links have `aria-label="Check price for {Product Name} on Amazon"` (product cards only)
- [ ] HTML has `<section id="decision-logic">` with proper `<h3>` + `<p>` structure
- [ ] Related unit links have `data-relationship` attributes in HTML
- [ ] `last_verified`, `article:modified_time`, `dateModified`, visible verified date all set to today
- [ ] `ai:freshness` meta tag matches `temporal_validity.status` (volatile/stable/evolving — NOT legacy monthly/quarterly/yearly)
- [ ] For software cards: `extract_scripts.js` was run (code blocks ≥25 lines extracted to `scripts/` subdirectory in .md)
- [ ] Token estimate updated to account for Decision Logic addition
- [ ] Existing content was NOT rewritten — only structural additions made
- [ ] DB insert succeeded
- [ ] Reconcile → deploy → indexnow completed (every mode, no exceptions)
- [ ] Tracker status changed to `updated`

## Validation helper

Run `node knowledge_pipeline/validate_agent_ready.js` to confirm coverage across all cards (counts missing UCP meta, FAQPage, aggregateRating, `<main>`, plus invalid JSON-LD blocks). Useful as a final gate after batch updates.
