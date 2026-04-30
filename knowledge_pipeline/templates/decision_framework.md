---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{How should I decide {X}? / Should I {option A} or {option B}?}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{vs comparison phrasing — e.g., 'build vs buy'}"
entity_type: decision_framework
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
  - "{Decision scope boundary — what this framework covers and what it doesn't}"
  - "{Information prerequisite — what data/analysis must exist before this decision can be made}"
  - "{Reversibility warning — which options are one-way doors vs two-way doors}"
  - "{Time-sensitivity — if delaying the decision has a cost, quantify it}"
  - "{Stakeholder requirement — who must be involved in this decision}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{User hasn't diagnosed the problem yet}"
    use_instead: "{path/to/assessment-card}"
  - condition: "{User has already decided and needs execution help}"
    use_instead: "{path/to/playbook-card}"
  - condition: "{Decision is outside the scope of this framework}"
    use_instead: "{path/to/broader-or-narrower-decision-card}"

# === AGENT HINTS ===
inputs_needed:
  - key: "{primary_decision_variable}"
    question: "{Core question that determines the decision — e.g., 'What's your budget?'}"
    type: choice
    options: ["{option 1}", "{option 2}", "{option 3}"]
  - key: "{secondary_variable}"
    question: "{Second most important factor}"
    type: choice
    options: ["{option 1}", "{option 2}", "{option 3}"]
  - key: "{context_variable}"
    question: "{Context that shifts the recommendation}"
    type: choice
    options: ["{option 1}", "{option 2}", "{option 3}"]
  - key: "{constraint_variable}"
    question: "{Hard constraint that eliminates options}"
    type: choice
    options: ["{option 1}", "{option 2}", "{option 3}"]

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  depends_on:
    - id: "{path/to/assessment-that-feeds-this-decision}"
      label: "{Assessment card whose output informs this decision}"
  leads_to:
    - id: "{path/to/playbook-for-option-A}"
      label: "{Execution playbook if Option A is chosen}"
    - id: "{path/to/playbook-for-option-B}"
      label: "{Execution playbook if Option B is chosen}"
  related_to:
    - id: "{path/to/benchmark-card}"
      label: "{Cost/timeline benchmarks referenced in this decision}"
  often_confused_with: []
  alternative_to: []

# === SOURCES ===
sources:
  - id: src1
    title: "{Primary decision methodology source}"
    author: {Publisher or Author}
    url: {url}
    type: {industry_report|academic_paper|official_docs}
    published: {YYYY-MM-DD}
    reliability: {authoritative|high|moderate_high}
---

# {Decision Name — e.g., "Build vs Buy vs Partner Decision Framework"}

## Summary

{2-3 sentences. What decision this card helps make, what the options are, and the key factors that determine the outcome. State the default recommendation upfront if one exists.} [src1]

## Constraints
<!-- Agents: read before walking through this decision with a user. -->

- {Constraint 1 — what must be true before this decision is relevant}
- {Constraint 2 — which options are irreversible (one-way doors)}
- {Constraint 3 — minimum information needed to make a good decision}
- {Constraint 4 — common decision-making biases to guard against}
- {Constraint 5 — timeline pressure and cost of delay}

## Decision Inputs

<!-- Structured list of what the agent must gather from the user before
     traversing the decision tree. Each input directly maps to a branch. -->

| Input | Why It Matters | How to Assess |
|-------|---------------|---------------|
| {Input 1 — e.g., "Strategic importance"} | {How this shifts the decision} | {Specific question to ask or data to check} |
| {Input 2 — e.g., "Budget range"} | {Impact on options} | {How to determine} |
| {Input 3 — e.g., "Timeline"} | {Which options it eliminates} | {How to determine} |
| {Input 4 — e.g., "Internal capability"} | {Feasibility filter} | {How to determine} |
| {Input 5 — e.g., "Risk tolerance"} | {Shifts toward safer/bolder options} | {How to determine} |

## Decision Tree

```
START — {Decision statement}
├── {First branching question — the highest-leverage differentiator}
│   ├── {Answer A}
│   │   ├── {Sub-question}?
│   │   │   ├── YES → RECOMMEND: {Option X}
│   │   │   │   Reason: {Why, in one sentence}
│   │   │   │   Constraint: {Key caveat}
│   │   │   │   Next: {path/to/execution-playbook}
│   │   │   └── NO → RECOMMEND: {Option Y}
│   │   │       Reason: {Why}
│   │   │       Next: {path/to/execution-playbook}
│   │   └── {Another sub-question}?
│   │       └── ...
│   ├── {Answer B}
│   │   └── RECOMMEND: {Option Z}
│   │       Reason: {Why}
│   │       Constraint: {Key caveat}
│   │       Next: {path/to/execution-playbook}
│   └── {Answer C}
│       └── {Sub-question}?
│           └── ...
├── OVERRIDE CONDITIONS (check these regardless of tree path):
│   ├── {Override 1 — e.g., "Budget < $X → eliminates Option Z regardless"}
│   ├── {Override 2 — e.g., "Regulatory requirement → forces Option Y"}
│   └── {Override 3 — e.g., "Timeline < X months → eliminates Option X"}
└── DEFAULT (if inputs are ambiguous):
    └── RECOMMEND: {Safest default option}
        Reason: {Why this is the safe default}
```

## Options Comparison

<!-- Structured comparison that agents can present to users.
     Each option includes what matters most: cost, timeline, risk, and constraints. -->

| Factor | {Option A} | {Option B} | {Option C} |
|--------|-----------|-----------|-----------|
| **Typical cost range** | {$X - $Y} | {$X - $Y} | {$X - $Y} |
| **Timeline to value** | {X-Y months} | {X-Y months} | {X-Y months} |
| **Risk level** | {Low/Medium/High} | {Low/Medium/High} | {Low/Medium/High} |
| **Reversibility** | {Easy/Hard/Irreversible} | {Easy/Hard/Irreversible} | {Easy/Hard/Irreversible} |
| **Internal capability needed** | {Description} | {Description} | {Description} |
| **Best when** | {1-sentence scenario} | {1-sentence scenario} | {1-sentence scenario} |
| **Worst when** | {1-sentence anti-scenario} | {1-sentence anti-scenario} | {1-sentence anti-scenario} |
| **Hidden costs** | {What people miss} | {What people miss} | {What people miss} |

[src1, src2]

## Decision Logic

<!-- If/then rules for agents. These are the machine-readable version of
     the decision tree — agents can evaluate these programmatically. -->

### If {condition 1} AND {condition 2}
→ **{Option A}**. {1-2 sentences explaining why this combination points here.} [src1]

### If {condition 3} AND {condition 4}
→ **{Option B}**. {Explanation.} [src2]

### If {condition 5} OR {override condition}
→ **{Option C}**. {Explanation.} [src3]

### If {condition for hybrid/phased approach}
→ **Start with {Option A}, transition to {Option B} at {trigger point}**. {Many decisions aren't binary — the phased approach is often optimal.} [src1]

### Default recommendation
→ **{Option}**. {When inputs are ambiguous or incomplete, this is the lowest-risk path. Explain why.} [src2]

## Anti-Patterns

### Wrong: {Common decision-making mistake #1}
{What happens — e.g., "Company assumes 'we can build it cheaper' without accounting for maintenance, opportunity cost, and turnover risk. Internal builds typically cost 2-5x the initial estimate."} [src3]

### Correct: {Right approach}
{How to avoid this — e.g., "Calculate total 3-year cost including: dev salaries, benefits, management overhead, infrastructure, maintenance, and opportunity cost of not shipping other features."} [src1]

### Wrong: {Common decision-making mistake #2}
{What happens.} [src2]

### Correct: {Right approach}
{How to avoid this.}

### Wrong: {Common decision-making mistake #3}
{What happens.}

### Correct: {Right approach}
{How to avoid this.}

## Cost Benchmarks

<!-- Real numbers agents can't reliably produce from training data.
     This section is what makes the card worth fetching. -->

| Scenario | {Option A} Cost | {Option B} Cost | {Option C} Cost |
|----------|----------------|----------------|----------------|
| {Small / simple} | {$range} | {$range} | {$range} |
| {Medium / standard} | {$range} | {$range} | {$range} |
| {Large / complex} | {$range} | {$range} | {$range} |
| {Ongoing annual cost} | {$range/yr} | {$range/yr} | {$range/yr} |

**Hidden cost multipliers**: {What to add to the above — e.g., "Add 20-40% for change management, 10-20% for data migration, 15-25% for contingency."} [src3]

## When This Matters

{1-2 sentences: when an agent should fetch this card. E.g., "Fetch when a user asks whether to build or buy a capability, is evaluating vendors vs internal development, or needs to justify a build/buy decision to leadership."}

## Related Units

- [{Assessment card that should precede this decision}](/{path})
- [{Execution playbook for Option A}](/{path})
- [{Execution playbook for Option B}](/{path})
- [{Benchmark data referenced in cost section}](/{path})
