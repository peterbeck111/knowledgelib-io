# Daily Workflow

Follow this three-step pipeline every session:

## Step 1: Check the Pipeline

Read `knowledge_pipeline/tracker.md` and count pending cards.

- **If pending cards exist** → go to Step 2.
- **If no pending cards** → run `/discover-topics` to find 50 new topics, then go to Step 2.

## Step 2: Create Cards

| Goal | Command | What happens |
|------|---------|--------------|
| One card | `/create-card` | Picks next pending topic, researches, creates .md + .html, inserts into DB, updates tracker |
| Specific topic | `/create-card --topic N` | Processes row N from tracker |
| N cards in parallel | `/create-card --count N` | Spawns N subagents, each processes one topic in parallel mode |
| All pending | `/create-card --batch` | Processes every pending topic sequentially |

Each card creation:
1. WebSearch + WebFetch 5–8 authoritative sources (RTINGS, Wirecutter, Tom's Guide, What Hi-Fi, PCMag, Reddit)
2. Creates `prototype/{category}/{subcategory}/{topic}/{version}.md` from template (5 entity types: product_comparison, software_reference, fact, concept, rule)
3. Creates matching `.html` with viewport, OG, Twitter Card, all `ai:*` meta tags (incl. entity_type, jurisdiction, temporal_status, change_sensitivity), Schema.org Dataset + BreadcrumbList + TechArticle/DefinedTerm JSON-LD
4. **Software cards only**: Runs `node knowledge_pipeline/extract_scripts.js` to extract code blocks ≥25 lines into `scripts/` subdirectory
5. Runs `node db/insert_card.js` to insert into Supabase (knowledge_cards + affiliate_links)
6. Marks tracker row as `updated`

## Step 3: Reconcile, Deploy, Publish

After card creation **or update** is complete, **always** run:

```bash
npm run publish
```

This executes four steps in sequence:
1. **`npm run reconcile`** — regenerates `catalog.json` + `sitemap.xml` (with dynamic priority from pop_index) + `index.html` knowledge units section + `.well-known/ai-knowledge.json` + imports popular agent suggestions (>= 3 occurrences) to tracker.md + tracker stats from DB
2. **Regenerate LLM discovery files** — run `node knowledge_pipeline/gen_llms_full.js` (reads from fresh `catalog.json`, writes `prototype/llms-full.txt`), then update the unit count in `prototype/llms.txt` to match the new total
3. **`npm run deploy`** — pushes `prototype/` to Cloudflare Pages (includes Functions: API + MCP). Always deploy to `--project-name=knowledgelib-io`.
4. **`npm run indexnow:new`** — submits only new URLs to IndexNow (Bing, Google, Yandex)

**If `reconcile.js` fails** (DB connection error): use the REST fallback — `node knowledge_pipeline/reconcile_rest.js`. Then run `node knowledge_pipeline/gen_llms_full.js` + update `llms.txt` count, then deploy and indexnow: `npx wrangler pages deploy prototype --project-name=knowledgelib-io --commit-dirty=true && node knowledge_pipeline/indexnow.js --new`

This applies to **every mode** — single card, `--batch`, `--count N`, and `--parallel`. No mode skips publishing.

**New category/subcategory?** Add it to `INDEX_SECTIONS` in `knowledge_pipeline/reconcile.js` (and `reconcile_rest.js`) so the index page groups it correctly. Unknown categories/subcategories still appear under "Other" as a fallback.

## Skills Reference

| Skill | Purpose |
|-------|---------|
| `/discover-topics` | Find 50 new topics from review sites, append to tracker.md |
| `/analysis-and-new-topics` | Analyze last 14 days of `card_access_log`, append 50 traffic-driven topics to tracker.md |
| `/create-card` | Research and create one knowledge card (or batch/parallel) |
| `/create-card --count N` | Orchestrate N parallel card creations |
| `/create-card --batch` | Process all pending topics sequentially |
| `/create-card --parallel --topic N` | Safe mode for simultaneous sessions |
| `/update-card` | Extend and update one `done` card to latest template (or batch/parallel) |
| `/update-card --count N` | Orchestrate N parallel card updates |
| `/update-card --batch` | Update all `done` topics sequentially |
| `/update-card --parallel --topic N` | Safe mode for simultaneous update sessions |
