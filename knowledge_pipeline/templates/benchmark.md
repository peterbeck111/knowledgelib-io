---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{What are the benchmarks for {X}? / What's normal for {metric}?}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{industry averages / typical ranges variant}"
entity_type: benchmark
domain: {category} > {subcategory} > {topic_readable}
region: {global|US|EU|APAC}
jurisdiction: {global|region-specific}
temporal_scope: {year}

# === VERIFICATION ===
last_verified: {YYYY-MM-DD}
confidence: {0.00-1.00}
version: 1.0
first_published: {YYYY-MM-DD}

# === TEMPORAL VALIDITY ===
# Benchmark cards are almost always volatile — data changes quarterly or annually.
temporal_validity:
  status: volatile
  last_breaking_change: {description — e.g., "2025 market correction shifted all SaaS multiples down 30-40%"}
  next_review: {YYYY-MM-DD — typically 3-6 months}
  change_sensitivity: high
  data_vintage: "{month/quarter and year of source data — e.g., 'Q4 2025'}"

# === CONSTRAINTS ===
constraints:
  - "{Segment specificity — benchmarks vary dramatically by segment; never apply cross-segment}"
  - "{Sample bias — describe the population these benchmarks represent and who they exclude}"
  - "{Geographic limitation — if benchmarks are US-centric, state this explicitly}"
  - "{Methodology caveat — self-reported vs measured, median vs mean, how outliers are handled}"
  - "{Vintage warning — data from {source_date}; market conditions may have shifted}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{User needs a decision, not data}"
    use_instead: "{path/to/decision-card}"
  - condition: "{User needs a different industry's benchmarks}"
    use_instead: "{path/to/industry-specific-benchmark}"
  - condition: "{User's company is too early-stage for these benchmarks to apply}"
    use_instead: "{path/to/early-stage-specific-benchmarks}"

# === AGENT HINTS ===
inputs_needed:
  - key: segment
    question: "Which segment applies?"
    type: choice
    options: ["{segment 1}", "{segment 2}", "{segment 3}", "{segment 4}"]
  - key: company_stage
    question: "What stage is the company?"
    type: choice
    options: ["{stage 1}", "{stage 2}", "{stage 3}"]
  - key: metric_focus
    question: "Which metrics are most relevant?"
    type: multi_select
    options: ["{metric category 1}", "{metric category 2}", "{metric category 3}", "{metric category 4}"]

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD}, data vintage: {data period})"

# === RELATED UNITS ===
related_kos:
  referenced_by:
    - id: "{path/to/assessment-card}"
      label: "{Assessment card that scores against these benchmarks}"
    - id: "{path/to/decision-card}"
      label: "{Decision card that uses these benchmarks for cost comparison}"
  related_to:
    - id: "{path/to/related-benchmark}"
      label: "{Adjacent benchmark card — e.g., different time period or segment}"
  depends_on: []
  often_confused_with: []
  alternative_to: []

# === SOURCES ===
# Benchmark cards require high-quality, datable sources.
# Always include publication date and data collection period.
sources:
  - id: src1
    title: "{Primary benchmark report}"
    author: {Publisher}
    url: {url}
    type: {industry_report|primary_research}
    published: {YYYY-MM-DD}
    data_period: "{e.g., 'Q3-Q4 2025'}"
    sample_size: "{e.g., '1,200 SaaS companies'}"
    reliability: {authoritative|high}
---

# {Benchmark Name — e.g., "SaaS Unit Economics Benchmarks 2026"}

## Summary

{2-3 sentences. What these benchmarks cover, the source population, data vintage, and the single most important takeaway. Be explicit about what changed from previous periods.} [src1]

**Data vintage**: {Specific period — e.g., "Based on Q4 2025 data from 1,200+ SaaS companies."}
**Key shift**: {What changed from last period — e.g., "Median CAC increased 15% YoY due to rising paid channel costs."}

## Constraints
<!-- Agents: read before citing any benchmark number. -->

- {Constraint 1 — segment specificity: "These benchmarks represent {population}. Do not apply to {excluded groups}."}
- {Constraint 2 — methodology: "Figures are {median|mean|percentile}. {Explain why this matters — e.g., 'Mean is skewed by outliers; use median for planning.'}"}
- {Constraint 3 — geography: "Primarily {US|global|EU} data. Adjust {X}% for {other regions}."}
- {Constraint 4 — vintage: "Data collected {period}. If more than {X} months old, search for updated figures before citing."}
- {Constraint 5 — comparison validity: "Only compare companies within the same segment row. Cross-segment comparison is misleading."}

## Metric Category 1: {Name — e.g., "Acquisition Metrics"}

### {Metric 1.1 — e.g., "Customer Acquisition Cost (CAC)"}

**Definition**: {Precise definition — agents often use inconsistent definitions. e.g., "Total sales + marketing spend / new customers acquired in the period. Include salaries, tools, ad spend, events. Exclude customer success and onboarding costs."}

| Segment | Median | 25th Percentile | 75th Percentile | Top Decile |
|---------|--------|-----------------|-----------------|------------|
| {Segment 1} | {$value} | {$value} | {$value} | {$value} |
| {Segment 2} | {$value} | {$value} | {$value} | {$value} |
| {Segment 3} | {$value} | {$value} | {$value} | {$value} |
| {Segment 4} | {$value} | {$value} | {$value} | {$value} |

**Trend**: {Direction and magnitude — e.g., "Up 15% YoY driven by rising paid channel costs."} [src1]
**Red flag threshold**: {When this metric signals a problem — e.g., "CAC > 12-month contract value = unsustainable acquisition economics."}
**Action trigger**: {What to do when outside normal range — link to relevant card.}

[src1, src2]

### {Metric 1.2 — e.g., "CAC Payback Period"}

**Definition**: {Precise definition.}

| Segment | Median | Healthy Range | Alarm Threshold |
|---------|--------|---------------|-----------------|
| {Segment 1} | {value} | {range} | {threshold} |
| {Segment 2} | {value} | {range} | {threshold} |
| {Segment 3} | {value} | {range} | {threshold} |

**Red flag threshold**: {When to worry.}
**Action trigger**: {What to investigate.}

[src1]

## Metric Category 2: {Name — e.g., "Retention Metrics"}

### {Metric 2.1 — e.g., "Net Revenue Retention (NRR)"}

**Definition**: {Precise definition — e.g., "Starting MRR + expansion - contraction - churn) / starting MRR, measured over 12 months for a cohort. Include only existing customers, exclude new logos."}

| Segment | Median | 25th Percentile | 75th Percentile | Top Decile |
|---------|--------|-----------------|-----------------|------------|
| {Segment 1} | {%} | {%} | {%} | {%} |
| {Segment 2} | {%} | {%} | {%} | {%} |
| {Segment 3} | {%} | {%} | {%} | {%} |

**Trend**: {Direction.} [src2]
**Red flag threshold**: {e.g., "Below 100% = revenue base is contracting. Below 90% = urgent churn problem."}
**Action trigger**: {Link to retention improvement playbook.}

### {Metric 2.2}

{Same structure. Repeat for all metrics in this category.}

## Metric Category 3: {Name — e.g., "Efficiency Metrics"}

{Same structure as categories above.}

<!-- 3-5 metric categories, each with 2-4 individual metrics.
     Total metrics per card: 8-15. More than 15 = split into two benchmark cards. -->

## Composite Metrics & Rules of Thumb

<!-- Pre-calculated composite metrics and heuristics that agents can cite directly.
     These save significant reasoning effort. -->

| Rule | Formula / Threshold | Interpretation |
|------|--------------------|----------------|
| {Rule 1 — e.g., "Rule of 40"} | {Formula: growth rate + profit margin ≥ 40%} | {What it means: "Healthy balance of growth and profitability"} |
| {Rule 2 — e.g., "LTV:CAC > 3:1"} | {LTV / CAC > 3.0} | {What it means: "Sustainable unit economics"} |
| {Rule 3 — e.g., "Magic Number > 0.75"} | {Net new ARR / prior quarter S&M spend} | {What it means: "Efficient growth engine"} |
| {Rule 4} | {Formula} | {Interpretation} |

**Constraint**: {When rules of thumb break down — e.g., "Rule of 40 is not meaningful for pre-$10M ARR companies. LTV:CAC ratio is unreliable when LTV is based on < 2 years of cohort data."} [src3]

## Segment Definitions

<!-- Critical for preventing cross-segment comparison errors.
     Agents need explicit segment boundaries. -->

| Segment | Definition | Typical Characteristics |
|---------|-----------|----------------------|
| {Segment 1 — e.g., "SMB SaaS"} | {Boundary criteria — e.g., "ACV < $10K, < 100 employees"} | {Typical traits: sales motion, deal cycle, etc.} |
| {Segment 2 — e.g., "Mid-Market SaaS"} | {Criteria} | {Traits} |
| {Segment 3 — e.g., "Enterprise SaaS"} | {Criteria} | {Traits} |
| {Segment 4 — e.g., "PLG SaaS"} | {Criteria} | {Traits} |

## Year-over-Year Trend Summary

<!-- Shows direction of change. Agents need this to avoid citing stale data
     or making recommendations based on outdated trends. -->

| Metric | {Year - 2} | {Year - 1} | {Current Year} | Direction |
|--------|-----------|-----------|---------------|-----------|
| {Key metric 1} | {value} | {value} | {value} | {↑/↓/→ and %} |
| {Key metric 2} | {value} | {value} | {value} | {↑/↓/→ and %} |
| {Key metric 3} | {value} | {value} | {value} | {↑/↓/→ and %} |
| {Key metric 4} | {value} | {value} | {value} | {↑/↓/→ and %} |

[src1, src3]

## Common Misinterpretations

- **{Misinterpretation 1}**: {What people get wrong — e.g., "Comparing logo churn rate to revenue churn rate. They measure different things — a company can have 10% logo churn but negative net revenue churn if expansion exceeds losses."} [src2]
- **{Misinterpretation 2}**: {Error — e.g., "Applying enterprise benchmarks to SMB companies. Enterprise NRR above 130% is common due to seat expansion; expecting this in SMB (where accounts are smaller and churn higher) sets unrealistic targets."}
- **{Misinterpretation 3}**: {Error — e.g., "Treating benchmarks as targets. Median means half of companies are below this number. Use 75th percentile for ambitious targets, median for sanity checks."}

## When This Matters

{1-2 sentences: when an agent should fetch this card. E.g., "Fetch when a user asks about industry benchmarks, wants to evaluate their metrics against peers, is building a financial model, or needs to set KPI targets."}

## Related Units

- [{Assessment card that scores against these benchmarks}](/{path})
- [{Decision card that uses these cost benchmarks}](/{path})
- [{Previous year's benchmark card for trend comparison}](/{path})
- [{Adjacent industry benchmark card}](/{path})
