---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{How do I actually build/create/execute {X}?}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{tool-specific variant — e.g., 'build landing page with Next.js'}"
entity_type: execution_recipe
domain: {category} > {subcategory} > {topic_readable}
region: global
jurisdiction: global
temporal_scope: {start_year}-{end_year}

# === VERIFICATION ===
last_verified: {YYYY-MM-DD}
confidence: {0.00-1.00}
version: 1.0
first_published: {YYYY-MM-DD}

# === TEMPORAL VALIDITY ===
temporal_validity:
  status: {evolving|volatile}
  last_breaking_change: "{description — e.g., 'Stripe API v2024-12 changed subscription creation flow'}"
  next_review: {YYYY-MM-DD}
  change_sensitivity: high

# === CONSTRAINTS ===
constraints:
  - "{Hard technical requirement — e.g., 'Node.js 18+ required'}"
  - "{API/platform constraint — e.g., 'Stripe test mode must be used until go-live checklist complete'}"
  - "{Legal/compliance constraint — e.g., 'Lead scraping must comply with GDPR in EU markets'}"
  - "{Cost constraint — e.g., 'This workflow costs approximately $X per Y at Z scale'}"
  - "{Quality gate — e.g., 'Do not deploy to production until all acceptance criteria pass'}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{User needs a plan/strategy, not execution}"
    use_instead: "{path/to/playbook-card}"
  - condition: "{User's tool/platform choice is different}"
    use_instead: "{path/to/alternative-tool-recipe}"
  - condition: "{Scale exceeds this recipe's design — e.g., 'more than 10K leads needs enterprise tooling'}"
    use_instead: "{path/to/enterprise-scale-recipe}"

# === AGENT HINTS ===
inputs_needed:
  - key: tool_preference
    question: "Which tool/platform should be used?"
    type: choice
    options: ["{tool 1}", "{tool 2}", "{tool 3}", "{no preference — auto-select}"]
  - key: technical_skill
    question: "What is the user's technical skill level?"
    type: choice
    options: ["non-technical (no-code only)", "semi-technical (can edit code)", "developer (can write code)"]
  - key: budget_for_tools
    question: "What's the tool/API budget?"
    type: choice
    options: ["free tier only", "up to $50/month", "up to $200/month", "no limit"]
  - key: scale
    question: "What scale is needed?"
    type: choice
    options: ["{small — e.g., '50-200 leads'}", "{medium — e.g., '200-1000 leads'}", "{large — e.g., '1000+ leads'}"]

# === EXECUTION METADATA ===
# These fields are unique to execution_recipe cards.
# They tell the orchestrating agent what this recipe produces and requires.
execution:
  # What the agent must have before starting
  required_inputs:
    - name: "{input 1 — e.g., 'ICP definition'}"
      source: "{which agent/phase produced this — e.g., 'agents/startup/persona-builder'}"
      format: "{structured data|document|spreadsheet|config file}"
    - name: "{input 2 — e.g., 'brand strategy'}"
      source: "{source agent}"
      format: "{format}"

  # What this recipe produces
  outputs:
    - name: "{output 1 — e.g., 'scored lead database'}"
      format: "{CSV|spreadsheet|deployed URL|code repository|configured platform}"
      description: "{What it contains and how it's used downstream}"
    - name: "{output 2 — e.g., 'CRM import file'}"
      format: "{format}"
      description: "{Description}"

  # Tools/APIs/platforms this recipe uses
  tools_required:
    - name: "{tool 1 — e.g., 'Apollo.io'}"
      purpose: "{what it's used for}"
      tier: "{free|paid|enterprise}"
      cost: "{approximate cost at expected scale}"
      alternatives: ["{alt tool 1}", "{alt tool 2}"]
    - name: "{tool 2}"
      purpose: "{purpose}"
      tier: "{tier}"
      cost: "{cost}"
      alternatives: ["{alts}"]

  # API keys or credentials needed
  credentials_needed:
    - service: "{service name}"
      type: "{API key|OAuth token|username+password}"
      where_to_get: "{URL to sign up/get credentials}"
      free_tier_limits: "{what the free tier allows — e.g., '100 lookups/month'}"

  # Estimated execution time and cost
  estimated_duration: "{e.g., '15-30 minutes for 200 leads'}"
  estimated_cost: "{e.g., '$0 (free tier) to $49 (paid enrichment)'}"

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  depends_on:
    - id: "{path/to/strategy-card-that-defines-what-to-build}"
      label: "{Strategy/decision card this executes}"
    - id: "{path/to/prerequisite-recipe}"
      label: "{Recipe that must run before this one}"
  feeds_into:
    - id: "{path/to/next-recipe-in-pipeline}"
      label: "{Recipe that consumes this recipe's output}"
    - id: "{path/to/dashboard-card}"
      label: "{Dashboard view where output is displayed}"
  related_to:
    - id: "{path/to/benchmark-card}"
      label: "{Quality benchmarks to validate output against}"
  alternative_to:
    - id: "{path/to/alternative-recipe-different-tool}"
      label: "{Same output, different tool/platform}"

# === SOURCES ===
sources:
  - id: src1
    title: "{Primary API/tool documentation}"
    author: {Publisher}
    url: {url}
    type: official_docs
    published: {YYYY-MM-DD}
    reliability: authoritative
---

# {Recipe Name — e.g., "Lead Scraping & Enrichment Pipeline"}

## Purpose

{2-3 sentences. What this recipe BUILDS/CREATES/EXECUTES (not documents). Be specific about the tangible output. E.g., "This recipe produces a scored, enriched lead database of 200+ contacts matching the ICP definition, with verified emails, firmographic data, and personalized outreach angles — ready for CRM import and outreach sequence loading."}

## Prerequisites
<!-- Agents: verify ALL prerequisites before executing. Missing prerequisites = failed execution. -->

- [ ] **{Input 1}** available from `{source agent}` — [{link to source card}](/{path})
- [ ] **{Input 2}** available from `{source agent}` — [{link to source card}](/{path})
- [ ] **{Credential 1}** — API key from [{service}]({signup_url}) (free tier: {limits})
- [ ] **{Credential 2}** — Account at [{platform}]({signup_url})
- [ ] **{Technical requirement}** — {e.g., "Node.js 18+ installed" or "Python 3.10+ with pip"}

## Constraints
<!-- Hard rules. Agents: enforce throughout execution. Violating these = broken output or legal risk. -->

- {Constraint 1 — rate limit: "Apollo.io free tier: 50 credits/month. Pace requests to avoid hitting limits mid-execution."}
- {Constraint 2 — legal: "GDPR: do not scrape personal emails of EU residents without legitimate interest basis. B2B work emails are generally permissible."}
- {Constraint 3 — quality: "Email verification must pass before adding to final list. Unverified emails = deliverability damage."}
- {Constraint 4 — cost: "Enrichment at scale costs $0.03-$0.15/lead depending on provider. Budget {$X} for {Y} leads."}
- {Constraint 5 — timing: "Rate-limited APIs require {X} minutes per {Y} records. Don't parallelize beyond provider limits."}

## Tool Selection Decision

<!-- Agent selects the right tool path based on user inputs.
     Each path leads to a different execution flow below. -->

```
Which path?
├── User is non-technical AND budget = free
│   └── PATH A: No-Code Free — {tool combination}
├── User is non-technical AND budget > $0
│   └── PATH B: No-Code Paid — {tool combination}
├── User is semi-technical or developer AND budget = free
│   └── PATH C: Code + Free APIs — {tool combination}
└── User is developer AND budget > $0
    └── PATH D: Code + Paid APIs — {tool combination}
```

| Path | Tools | Cost | Speed | Output Quality |
|------|-------|------|-------|---------------|
| A: No-Code Free | {tools} | $0 | {time} | {quality assessment} |
| B: No-Code Paid | {tools} | ${range}/mo | {time} | {quality assessment} |
| C: Code + Free | {tools} | $0 | {time} | {quality assessment} |
| D: Code + Paid | {tools} | ${range}/mo | {time} | {quality assessment} |

## Execution Flow

### Step 1: {Setup / Configuration}

**Duration**: {estimate}
**Tool**: {which tool(s)}

{What to do — specific, executable instructions. Not "consider doing X" but "do X."}

```{language}
# {Exact command, API call, or configuration}
# Include actual code/commands the agent should execute or guide the user through

{code block with real, working commands/code}
```

**Verify**: {How to confirm this step succeeded — specific check}
**If failed**: {What to do — specific recovery action}

### Step 2: {Data Acquisition / Core Execution}

**Duration**: {estimate}
**Tool**: {which tool(s)}
**Rate limit**: {if applicable — e.g., "Max 100 requests/minute. Sleep 1s between batches of 10."}

{Specific execution instructions.}

```{language}
{Working code/commands/API calls}
```

**Expected output**: {What you should have after this step — e.g., "CSV with ~200 rows, columns: company, name, title, raw_email, linkedin_url"}
**Verify**: {Validation check — e.g., "Row count > 150, no null values in company or name columns"}
**If failed**: {Recovery — e.g., "If < 100 results, broaden ICP criteria in search query and re-run"}

### Step 3: {Processing / Enrichment / Transformation}

**Duration**: {estimate}
**Tool**: {which tool(s)}

{Instructions for processing raw output into refined output.}

```{language}
{Working code/commands}
```

**Verify**: {Validation — e.g., "Email verification rate > 85%. If below, data source may be low quality."}
**If failed**: {Recovery action}

### Step 4: {Quality Assurance / Scoring}

**Duration**: {estimate}

{Apply quality checks, scoring, and final formatting.}

```{language}
{Working code/commands for scoring, dedup, validation}
```

**Verify**: {Final quality check — e.g., "Final list has > 80% verified emails, all leads scored, no duplicates"}

### Step 5: {Output Generation / Deployment}

**Duration**: {estimate}

{Generate the final deliverable in the required format.}

```{language}
{Working code/commands for generating final output}
```

**Output files**:
- `{filename.ext}` — {description — e.g., "Primary lead database, sorted by score descending"}
- `{filename.ext}` — {description — e.g., "CRM import file formatted for HubSpot"}
- `{filename.ext}` — {description — e.g., "Summary statistics and quality report"}

### Step 6: {Integration / Loading} (Optional)

**Duration**: {estimate}
**Tool**: {CRM, email tool, dashboard, etc.}

{Load output into downstream systems.}

```{language}
{Working code/API calls for loading into CRM, email tool, etc.}
```

**Verify**: {Integration check — e.g., "All leads visible in CRM pipeline, tags applied, sequences assigned"}

<!-- 4-8 steps total. Each step must be independently executable and verifiable.
     If a step fails, the agent should be able to retry or skip without losing prior work. -->

## Output Schema

<!-- Exact format of the deliverable. Downstream agents and dashboard cards
     reference this schema to consume the output. -->

```json
{
  "output_type": "{e.g., 'lead_database'}",
  "format": "{CSV|JSON|XLSX}",
  "columns": [
    {"name": "{column 1}", "type": "{string|number|boolean|date}", "description": "{what it contains}", "required": true},
    {"name": "{column 2}", "type": "{type}", "description": "{description}", "required": true},
    {"name": "{column 3}", "type": "{type}", "description": "{description}", "required": false}
  ],
  "expected_row_count": "{range — e.g., '150-300'}",
  "sort_order": "{e.g., 'score descending'}",
  "deduplication_key": "{e.g., 'email'}"
}
```

## Quality Benchmarks

<!-- How to evaluate if the output is good enough.
     Links to benchmark cards where applicable. -->

| Quality Metric | Minimum Acceptable | Good | Excellent |
|---------------|-------------------|------|-----------|
| {Metric 1 — e.g., "Email verification rate"} | {e.g., "> 75%"} | {e.g., "> 85%"} | {e.g., "> 95%"} |
| {Metric 2 — e.g., "ICP match score average"} | {e.g., "> 60/100"} | {e.g., "> 75/100"} | {e.g., "> 85/100"} |
| {Metric 3 — e.g., "Data completeness"} | {e.g., "> 70% fields populated"} | {e.g., "> 85%"} | {e.g., "> 95%"} |
| {Metric 4 — e.g., "Duplicate rate"} | {e.g., "< 5%"} | {e.g., "< 2%"} | {e.g., "< 0.5%"} |

**If below minimum**: {What to do — e.g., "Re-run Step 3 with different enrichment provider, or reduce ICP criteria scope."}

## Error Handling

<!-- Common failures and recovery actions. Agents need this to handle
     execution errors without human intervention. -->

| Error | Likely Cause | Recovery Action |
|-------|-------------|----------------|
| {Error 1 — e.g., "API rate limit exceeded (429)"} | {Cause — e.g., "Too many requests in time window"} | {Action — e.g., "Wait {retry-after} seconds, reduce batch size to 5"} |
| {Error 2 — e.g., "Authentication failed (401)"} | {Cause — e.g., "API key expired or invalid"} | {Action — e.g., "Regenerate API key at {url}, update config"} |
| {Error 3 — e.g., "Empty results from search"} | {Cause — e.g., "Search criteria too narrow"} | {Action — e.g., "Broaden {specific parameter}, retry"} |
| {Error 4 — e.g., "Output file corrupted"} | {Cause — e.g., "Process interrupted mid-write"} | {Action — e.g., "Delete partial file, re-run from Step {N}"} |
| {Error 5 — e.g., "CRM import rejected"} | {Cause — e.g., "Field mapping mismatch"} | {Action — e.g., "Check CRM required fields, adjust column mapping in Step 5"} |

## Cost Breakdown

<!-- Real cost analysis so agents can warn users before execution. -->

| Component | Free Tier | Paid Tier | At Scale |
|-----------|-----------|-----------|----------|
| {Component 1 — e.g., "Lead sourcing"} | {e.g., "50 leads/mo"} | {e.g., "$49/mo = 500 leads"} | {e.g., "$199/mo = 5000 leads"} |
| {Component 2 — e.g., "Email verification"} | {e.g., "100/mo"} | {e.g., "$16/1000"} | {e.g., "$10/1000"} |
| {Component 3 — e.g., "Enrichment"} | {e.g., "Limited"} | {e.g., "$0.10/lead"} | {e.g., "$0.05/lead"} |
| **Total for {typical batch}** | **{$0}** | **{$X}** | **{$Y}** |

## Anti-Patterns

### Wrong: {Execution mistake #1}
{What goes wrong — e.g., "Sending outreach to unverified email list. Result: 15%+ bounce rate → domain blacklisted → all future emails go to spam."} [src2]

### Correct: {Right approach}
{Fix — e.g., "Always run email verification (Step 4) before loading into outreach tool. Remove any emails scoring below 90% confidence."}

### Wrong: {Execution mistake #2}
{What goes wrong.}

### Correct: {Right approach}
{Fix.}

## When This Matters

{1-2 sentences: when an agent should use this recipe. E.g., "Use when the agent needs to produce an actual lead database, not a document about how to find leads. Requires ICP definition from persona-builder agent as input."}

## Related Units

- [{Strategy card this executes}](/{path})
- [{Next recipe in pipeline — e.g., 'outreach sequence loading'}](/{path})
- [{Alternative recipe with different tools}](/{path})
- [{Benchmark card for quality validation}](/{path})
- [{Dashboard view where output is displayed}](/{path})
