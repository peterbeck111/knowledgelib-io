---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{How mature/healthy is {domain}? / What's the current state of {function}?}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{audit/review/evaluation variant}"
entity_type: assessment
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
  status: {stable|evolving|volatile}
  last_breaking_change: {description or null}
  next_review: {YYYY-MM-DD}
  change_sensitivity: {low|medium|high}

# === CONSTRAINTS ===
constraints:
  - "{Who should run this assessment — role/seniority requirement}"
  - "{Minimum data/access needed — e.g., '12 months of CRM data required for reliable scoring'}"
  - "{Company stage applicability — e.g., 'not meaningful for pre-revenue startups'}"
  - "{Assessment is diagnostic, not prescriptive — pair with decision cards for recommendations}"
  - "{Score thresholds are benchmarks, not absolutes — industry and context shift them}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{User wants a recommendation, not a diagnosis}"
    use_instead: "{path/to/decision-card}"
  - condition: "{User already knows the problem and needs execution steps}"
    use_instead: "{path/to/playbook-card}"
  - condition: "{Assessment domain is too narrow — e.g., 'only evaluating one tool, not the function'}"
    use_instead: "{path/to/more-specific-card}"

# === AGENT HINTS ===
inputs_needed:
  - key: company_stage
    question: "What stage is the company?"
    type: choice
    options: ["{stage 1}", "{stage 2}", "{stage 3}", "{stage 4}"]
  - key: company_size
    question: "How large is the company?"
    type: choice
    options: ["{band 1}", "{band 2}", "{band 3}"]
  - key: assessment_depth
    question: "What depth of assessment is needed?"
    type: choice
    options: ["quick health check (15 min)", "standard assessment (1 hour)", "deep audit (half day)"]
  - key: data_available
    question: "What data does the user have access to?"
    type: multi_select
    options: ["{data source 1}", "{data source 2}", "{data source 3}", "{data source 4}"]

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  leads_to:
    - id: "{path/to/decision-card-for-results}"
      label: "{Decision card to use AFTER assessment results are known}"
    - id: "{path/to/playbook-for-improvement}"
      label: "{Execution playbook for improving weak areas}"
  related_to:
    - id: "{path/to/benchmark-card}"
      label: "{Benchmark data this assessment scores against}"
  depends_on:
    - id: "{path/to/prerequisite-assessment}"
      label: "{Assessment that should be run first, if any}"
  often_confused_with: []
  alternative_to: []

# === SOURCES ===
sources:
  - id: src1
    title: "{Primary methodology source}"
    author: {Publisher or Author}
    url: {url}
    type: {industry_report|academic_paper|official_docs}
    published: {YYYY-MM-DD}
    reliability: {authoritative|high|moderate_high}
---

# {Function/Domain} {Assessment|Diagnostic|Maturity Assessment}

## Purpose

{2-3 sentences. What this assessment evaluates, who should use it, and what the output enables. Make clear this is diagnostic — it identifies the current state, not the solution.} [src1]

## Constraints
<!-- Agents: read before running this assessment with a user. -->

- {Constraint 1 — minimum data or access requirements}
- {Constraint 2 — company stage or size applicability}
- {Constraint 3 — who should be involved (roles, seniority)}
- {Constraint 4 — what this assessment does NOT cover}
- {Constraint 5 — how often this should be re-run}

## Assessment Dimensions

<!-- Each dimension is scored independently. The structured format lets agents
     walk through this conversationally with a user, one dimension at a time. -->

### Dimension 1: {Name — e.g., "Pipeline Management"}

**What this measures**: {One sentence — what capability or maturity this dimension evaluates.}

| Score | Level | Description | Evidence |
|-------|-------|-------------|----------|
| 1 | Ad hoc | {What level 1 looks like — specific observable behaviors} | {What you'd see in data/tools/process} |
| 2 | Emerging | {What level 2 looks like} | {Observable evidence} |
| 3 | Defined | {What level 3 looks like} | {Observable evidence} |
| 4 | Managed | {What level 4 looks like} | {Observable evidence} |
| 5 | Optimized | {What level 5 looks like} | {Observable evidence} |

**Red flags**: {Specific signals that indicate score 1-2 even if user claims higher.} [src2]
**Quick diagnostic question**: "{Single question an agent can ask to roughly score this dimension.}"

### Dimension 2: {Name}

**What this measures**: {One sentence.}

| Score | Level | Description | Evidence |
|-------|-------|-------------|----------|
| 1 | Ad hoc | {Description} | {Evidence} |
| 2 | Emerging | {Description} | {Evidence} |
| 3 | Defined | {Description} | {Evidence} |
| 4 | Managed | {Description} | {Evidence} |
| 5 | Optimized | {Description} | {Evidence} |

**Red flags**: {Level 1-2 signals.}
**Quick diagnostic question**: "{Single question to roughly score.}"

### Dimension 3: {Name}

{Same structure. Repeat for 4-8 dimensions total.}

<!-- 4-8 dimensions total. More than 8 = split into two assessments.
     Fewer than 4 = probably too narrow for a standalone card. -->

## Scoring & Interpretation

### Overall Score Calculation

{How to aggregate dimension scores — simple average, weighted, or minimum-of-all.}

```
Overall Score = ({Dimension 1} × {weight} + {Dimension 2} × {weight} + ...) / {total weight}
```

### Score Interpretation

| Overall Score | Maturity Level | Interpretation | Recommended Next Step |
|---------------|---------------|----------------|----------------------|
| 1.0 - 1.9 | Critical | {What this means — specific implications for the business} | {Which card to fetch next — usually a foundational playbook} |
| 2.0 - 2.9 | Developing | {Interpretation} | {Next step — specific card reference} |
| 3.0 - 3.9 | Competent | {Interpretation} | {Next step — optimization-focused card} |
| 4.0 - 4.5 | Advanced | {Interpretation} | {Next step — fine-tuning or scaling card} |
| 4.6 - 5.0 | Best-in-class | {Interpretation} | {Next step — maintain and innovate} |

### Dimension-Level Action Routing

<!-- This is the key value-add: assessment results route directly to specific
     decision or playbook cards for each weak dimension. -->

| Weak Dimension (Score < 3) | Fetch This Card |
|----------------------------|-----------------|
| {Dimension 1 name} | [{Specific improvement playbook}](/{path}) |
| {Dimension 2 name} | [{Specific decision framework}](/{path}) |
| {Dimension 3 name} | [{Specific improvement playbook}](/{path}) |

## Benchmarks by Segment

<!-- Scores mean different things at different company stages.
     This table prevents agents from applying one-size-fits-all thresholds. -->

| Segment | Expected Average Score | "Good" Threshold | "Alarm" Threshold |
|---------|----------------------|-------------------|-------------------|
| {Segment 1 — e.g., "Seed/Series A"} | {typical score} | {above this = healthy} | {below this = urgent} |
| {Segment 2 — e.g., "Series B-C"} | {typical score} | {threshold} | {threshold} |
| {Segment 3 — e.g., "Growth/Public"} | {typical score} | {threshold} | {threshold} |

[src3]

## Common Pitfalls in Assessment

- **{Pitfall 1}**: {What goes wrong — e.g., "Self-assessment bias: teams consistently over-score by 0.5-1.0 points. Calibrate by asking for evidence, not opinions."} [src2]
- **{Pitfall 2}**: {What goes wrong — e.g., "Snapshot fallacy: a single assessment is a point-in-time snapshot. Track quarterly for trend analysis."}
- **{Pitfall 3}**: {What goes wrong — e.g., "Dimension independence: low score in one dimension may be caused by a different dimension's weakness. Check for root causes."}

## When This Matters

{1-2 sentences: when an agent should fetch this card. E.g., "Fetch when a user asks to evaluate their sales process, diagnose why revenue is plateauing, or prepare for a board-level operational review."}

## Related Units

- [{Decision card for post-assessment recommendations}](/{path})
- [{Benchmark card this assessment references}](/{path})
- [{Playbook for improving the most common weak dimension}](/{path})
