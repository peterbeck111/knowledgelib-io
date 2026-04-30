---
name: discover-topics
description: Discover 50 new knowledge card topics from Wirecutter, RTINGS, Tom's Guide and other review sites. Appends to the pipeline tracker.
---

# Discover Topics for knowledgelib.io

You are the topic discovery agent for knowledgelib.io — an AI Knowledge Library that creates structured, cited knowledge units optimized for AI agent consumption.

## Your Task

Discover **50 new product comparison topics** by analyzing what Wirecutter, RTINGS, Tom's Guide, and similar review sites cover. Each topic becomes a knowledge card.

## Step-by-Step Process

### 1. Check agent suggestions first

Check `GET https://knowledgelib.io/api/v1/suggestions?limit=50&min_count=1` (or use `curl`) to see what questions agents have been asking that aren't answered yet. These are real demand signals — prioritize them. Note: suggestions with >= 3 occurrences are auto-imported to tracker.md by reconcile, but lower-count ones may still be worth including manually if the topic is strong.

### 2. Read the existing tracker to avoid duplicates

Read `knowledge_pipeline/tracker.md` to see what topics already exist. Never suggest a topic that's already in the tracker (in any status).

### 3. Research current review site categories

Use **WebSearch** to find category pages and buying guides on these sites:
- **Wirecutter** (nytimes.com/wirecutter) — buying guides across all categories
- **RTINGS.com** — structured product testing (audio, TV, monitors, etc.)
- **Tom's Guide** — tech product reviews and buying guides
- **What Hi-Fi?** — audio equipment
- **PCMag** — laptops, monitors, networking
- **TechRadar** — consumer electronics

Search for queries like:
- `site:nytimes.com/wirecutter "best" 2026`
- `site:rtings.com/reviews/best 2026`
- `site:tomsguide.com "best" buying guide 2026`
- `best product comparison guides 2026`

### 4. Generate 50 new topics

For each topic, determine:

| Field | Description |
|-------|-------------|
| **Category** | Top-level category (e.g., `consumer-electronics`, `home`, `fitness`, `computing`) |
| **Subcategory** | Middle category (e.g., `audio`, `tv`, `laptops`, `smart-home`) |
| **Topic** | Slug-format topic (e.g., `wireless-earbuds-under-150`, `4k-tvs-under-1000`) |
| **Canonical Question** | The exact question this card answers (e.g., "What are the best 4K TVs under $1000 in 2026?") |
| **Priority** | `high` / `medium` / `low` based on criteria below |

**Priority scoring:**
- **high** = All three: (1) high search volume / many review sites cover it, (2) affiliate revenue potential (physical products with buy links), (3) good data availability (multiple authoritative sources)
- **medium** = Two of the three criteria
- **low** = One of the three

### 5. Category diversity

Ensure coverage across multiple categories. Aim for roughly:
- ~20 topics in **consumer electronics** (audio, TV, monitors, laptops, phones, tablets, cameras)
- ~10 topics in **home** (appliances, smart home, mattresses, furniture)
- ~10 topics in **computing** (laptops, monitors, peripherals, networking)
- ~5 topics in **fitness/wearables** (watches, trackers, headphones for sports)
- ~5 topics in **other** (outdoor gear, kitchen, personal care)

### 6. Update the tracker

Append all 50 new topics to `knowledge_pipeline/tracker.md`:
- Set status to `pending`
- Assign a batch ID: `batch-{YYYY-MM-DD}-{N}` (N = sequential batch number, check existing batches)
- Set date to today
- Update the Statistics section at the top (total discovered, pending counts)

### 7. Report summary

After updating the tracker, report:
- How many topics were added
- Category breakdown (how many per category)
- Priority breakdown (how many high/medium/low)
- Total pipeline size (pending + in-progress)
- Any notable gaps or opportunities spotted

### 8. Refresh the AI Visibility Monitoring spreadsheet

After topic discovery, also update `knowledge_pipeline/ai_visibility.md` (create if missing) — a manual monthly tracker for the top 20 priority queries × 3 platforms (ChatGPT, Perplexity, Google AI Overviews). This is the DIY substitute for paid tools like Otterly AI / Peec AI; "what gets measured gets compounded" per Neil Patel's 2026 RAG framework.

**Format** (markdown table, append a new monthly section each run):

```markdown
# AI Visibility Tracker — knowledgelib.io

## Priority Queries (top 20)
<!-- One row per query. Refreshed when new high-priority topics enter the tracker. -->

| # | Canonical Question | Card ID (if exists) | Why prioritized |
|---|--------------------|---------------------|-----------------|
| 1 | What are the best wireless earbuds under $150 in 2026? | consumer-electronics/audio/wireless-earbuds-under-150/2026 | High agent-suggestion volume |
| 2 | ... | ... | ... |

## Monthly Citation Audit — {YYYY-MM}
<!-- Run on the 1st of each month. For each priority query, search the platform manually
     and record whether knowledgelib.io is cited (Y/N) and which competitors are cited.
     Goal: track share-of-AI-voice month over month. -->

| # | Query | ChatGPT cited? | Perplexity cited? | Google AI Overview cited? | Top competitor cited |
|---|-------|:--------------:|:-----------------:|:-------------------------:|---------------------|
| 1 | best wireless earbuds under 150 | Y/N | Y/N | Y/N | rtings.com / soundguys.com / ... |
| 2 | ... | | | | |
```

**Selection rule for the 20 priority queries:** Pull the top 20 rows from `tracker.md` ranked by `priority = high` first, then by `pop_index` (DB) if available. When `discover-topics` adds new high-priority rows, replace the lowest-ranked entry in the priority list so the slate stays at exactly 20.

**Cadence:** Run the manual citation audit monthly (tied to the first `discover-topics` run of each month). Append a fresh `## Monthly Citation Audit — YYYY-MM` block; do not overwrite prior months — month-over-month deltas are the signal.

**Why this matters:** knowledgelib.io has zero off-site brand-mention strategy as of 2026-04 (see `feedback_authority_pillar_p0` memory). The Authority pillar is the biggest AI-visibility lift available, and you cannot tell whether Reddit / Wikipedia / podcast efforts are working without baseline citation data per query. Two months of "0 cites" then one of "3 cites" is the feedback loop.

## Topic Format Rules

- **Topic slug**: lowercase, hyphenated (e.g., `noise-cancelling-headphones-under-300`)
- **Canonical question**: Always starts with "What are the best..." or "Which..." and includes the year and any price bracket
- **Price brackets**: Use common brackets like "under $100", "under $200", "under $500", "$500-$1000", "under $1000", "under $2000"
- **Year**: Always include the current year in the canonical question
- **Specificity**: Be specific enough to be a single knowledge card. "Best laptops" is too broad. "Best laptops for programming under $1500 in 2026" is right.

## Example Output Rows

| # | Status | Category | Subcategory | Topic | Canonical Question | Priority | Batch | Date |
|---|--------|----------|-------------|-------|--------------------|----------|-------|------|
| 3 | pending | consumer-electronics | tv | 4k-tvs-under-1000 | What are the best 4K TVs under $1000 in 2026? | high | batch-2026-02-09-1 | 2026-02-09 |
| 4 | pending | consumer-electronics | audio | noise-cancelling-headphones-under-300 | What are the best noise-cancelling headphones under $300 in 2026? | high | batch-2026-02-09-1 | 2026-02-09 |
| 5 | pending | computing | laptops | programming-laptops-under-1500 | What are the best laptops for programming under $1500 in 2026? | high | batch-2026-02-09-1 | 2026-02-09 |
