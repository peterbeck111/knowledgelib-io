---
name: analysis-and-new-topics
description: Analyze the last 2 weeks of card_access_log traffic, report insights on what is checked and which channels/agents are used, and append 50 new pending topics to the pipeline tracker based on the most frequent cards and categories.
---

# Analysis & New Topics for knowledgelib.io

You are the traffic-driven discovery agent for knowledgelib.io. Your job is to turn real access-log signal into the next 50 knowledge-card topics.

## Your Task

1. Analyze the **last 14 days** of `card_access_log` in Supabase.
2. Report insights: total volume, channel mix, agent type mix, referrer/search engine mix, top 25 cards, top categories, top agent queries, daily trend.
3. Based on the top-performing cards and categories, propose **50 new topics** (adjacent variants, price tiers, feature filters, deeper playbooks) and append them as pending rows to `knowledge_pipeline/tracker.md`.

## Step-by-Step Process

### 1. Run the analysis script

Use the existing analyzer:

```bash
node knowledge_pipeline/analyze_access_log.js
```

It prints:
- Total accesses (last 14d)
- Breakdown by `access_channel` (web / api / mcp / raw_md)
- Breakdown by `agent_type` (browser / chatgpt / claude / perplexity / copilot / gemini / bot / …)
- Breakdown by `search_engine` referrer
- **Top 25 cards** by hits, with per-channel split
- Top 20 non-null `agent_query` values
- Top 20 categories by hits + unique cards
- Daily volume for the last 14 days
- Response status breakdown

If the script does not exist, create it using `pg` + `DATABASE_URL` from `.env` (see [knowledge_pipeline/analyze_access_log.js](knowledge_pipeline/analyze_access_log.js) for the reference implementation).

### 2. Write the insights report

Summarise for the user, in this order:
- **Headline** — total hits, trend direction, date range.
- **Channel & agent mix** — web vs api vs mcp vs raw_md; which AI agents (ChatGPT, Claude, Perplexity, Copilot, Gemini) are pulling cards; referrer breakdown.
- **Top 10 cards** — full card_id + hits, flag any outliers (e.g. one card >3× the runner-up).
- **Top categories** — which subcategories dominate.
- **Noteworthy queries** — surface genuine demand signals from `agent_query`; ignore obvious test rows (`batch:N`, `src=chatgpt.com`, `how to cook pasta`, etc.). Ask the user whether to include borderline ones.
- **Channel gaps** — e.g. MCP under-used, raw_md under-used — flag as product opportunities, not topic ideas.

### 3. Derive 50 topic candidates

For each of the **top ~15 cards** and **top ~10 subcategories**, generate adjacent topic variants:

| Pattern | Example |
|---------|---------|
| Price tier variants | `robot-vacuums-under-300`, `robot-vacuums-under-800` |
| Feature/filter variants | `robot-vacuums-for-pet-hair`, `robot-vacuums-with-mop` |
| Audience variants | `business-laptops-best-battery-life`, `lightweight-business-laptops-under-3lb` |
| Deeper playbooks (for business/startup/consulting cards) | `pmf-signals-vs-noise-scorecard`, `pmf-to-gtm-transition-playbook` |
| Benchmark companions | `retention-curves-by-vertical-2026` |
| Anti-patterns / decision frameworks | `leading-indicators-of-churn`, `pivot-vs-persevere-decision` |

Aim for roughly:
- **~25 topics** in the top 5 subcategories (ride the winners).
- **~15 topics** in the next 5 subcategories (strengthen mid-pack).
- **~10 topics** from noteworthy agent queries or channel-specific demand (API/MCP-heavy cards).

### 4. Deduplicate against the existing tracker

Before appending, grep `knowledge_pipeline/tracker.md` for each proposed slug. Skip anything that already exists in **any** status (pending, updated, done, skipped). Also check near-variants — e.g. `robot-vacuums-with-mop` vs existing `robot-vacuum-mop-combos`.

Tip: batch the grep patterns with `|` alternation and check all 50 slugs in 1–2 calls.

### 5. Append the 50 rows to the tracker

- Find the current highest row number (tail of the table).
- Assign sequential IDs.
- Batch ID: `batch-access-log-{YYYY-MM-DD}`.
- Date column left blank (pending).
- Priority: `high` if the source card is in top 10 and affiliate/revenue-eligible, else `medium`.

Pipe-table row format (matches existing rows):

```
| {N} | pending | {category} | {subcategory} | {topic-slug} | {Canonical question ending in "in 2026?"} | {priority} | batch-access-log-{YYYY-MM-DD} | |
```

Update the Statistics header:
- `Total discovered`: +50
- `Pending`: +50 (add to whatever the current pending count is)

### 6. Report the summary

After appending, report:
- Number added (target 50; report any skipped duplicates separately so the user sees why it's fewer if so).
- Category breakdown of the 50.
- Priority breakdown (high vs medium).
- Row range appended (e.g. `#1596–#1645`).
- Suggested next step: `/create-card --batch` or `/create-card --count N`.

## Topic Format Rules

- **Topic slug**: lowercase, hyphenated, no trailing year.
- **Canonical question**: starts with "What are the best…", "How do I…", "Which…", or "When should I…". Always ends with "in 2026?" for product cards; business/consulting cards can omit the year.
- **Price brackets**: use common tiers — `under-100`, `under-300`, `under-500`, `under-1000`, `under-2000`.
- **Specificity**: each topic must be a single card. "Best laptops" is too broad; "best lightweight business laptops under 3 lbs in 2026" is right.
- **Playbook/assessment/framework topics**: pick the template type that matches (`assessment`, `playbook`, `decision_framework`, `benchmark`, `concept`) — see `knowledge_pipeline/templates/` for the full list. Template assignment happens later via `/create-card`.

## What NOT to add

- Test traffic patterns (`batch:N`, `src=chatgpt.com`, obvious curl tests).
- Topics the user has flagged out of scope (e.g. recipes, cooking, off-brand queries).
- Near-duplicates of existing `updated` cards — prefer proposing a price-tier or feature-filter variant instead.
- Anything the user explicitly excludes when confirming.

## When to ask the user

If any of these are true, ask before appending:
- More than 10 proposed topics conflict with existing tracker rows (may mean the traffic is plateauing in already-covered areas — consider broader discovery instead).
- A noteworthy agent query is ambiguous about scope (e.g. `how to cook pasta` — user already told us this is test noise).
- Top-card traffic is dominated by a single outlier and you're not sure whether to go deep on it or diversify.

Otherwise proceed and append directly.