---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{How do I implement/execute {X}?}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{step-by-step / how-to variant}"
entity_type: playbook
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
  - "{Prerequisite — what must be true/done before starting this playbook}"
  - "{Resource requirement — minimum team, budget, or tools needed}"
  - "{Timeline reality — realistic duration, not optimistic estimate}"
  - "{Scope boundary — what this playbook covers and explicitly does NOT cover}"
  - "{Failure condition — if X is true, stop and reassess before proceeding}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{User hasn't decided on the approach yet}"
    use_instead: "{path/to/decision-card}"
  - condition: "{User needs to assess current state first}"
    use_instead: "{path/to/assessment-card}"
  - condition: "{Scope is different — e.g., 'user needs enterprise version, this is SMB'}"
    use_instead: "{path/to/correct-scope-playbook}"

# === AGENT HINTS ===
inputs_needed:
  - key: company_context
    question: "{Key context that determines which path through the playbook}"
    type: choice
    options: ["{context 1}", "{context 2}", "{context 3}"]
  - key: current_state
    question: "{Where is the user starting from?}"
    type: choice
    options: ["{starting point 1}", "{starting point 2}", "{starting point 3}"]
  - key: target_timeline
    question: "{How quickly does this need to happen?}"
    type: choice
    options: ["{fast — compressed}", "{standard}", "{phased — extended}"]
  - key: budget_range
    question: "{What's the budget for this initiative?}"
    type: choice
    options: ["{band 1}", "{band 2}", "{band 3}"]

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  depends_on:
    - id: "{path/to/decision-card-that-led-here}"
      label: "{Decision framework that routes to this playbook}"
    - id: "{path/to/assessment-card}"
      label: "{Assessment that should be completed first}"
  related_to:
    - id: "{path/to/benchmark-card}"
      label: "{Benchmarks referenced in timeline/cost sections}"
  leads_to:
    - id: "{path/to/next-phase-playbook}"
      label: "{What to do after this playbook is complete}"
  often_confused_with: []
  alternative_to:
    - id: "{path/to/alternative-approach-playbook}"
      label: "{Different approach to the same goal}"

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

# {Playbook Name — e.g., "Startup Launch Playbook: Idea to First 10 Customers"}

## Summary

{2-3 sentences. What this playbook helps you execute, the expected outcome, and realistic timeline. Be specific about scope boundaries.} [src1]

## Prerequisites
<!-- Agents: verify these BEFORE starting the playbook with a user.
     If any prerequisite is not met, route to the appropriate prerequisite card. -->

- [ ] {Prerequisite 1 — e.g., "Decision on build vs buy has been made"} → If not: [{Decision card}](/{path})
- [ ] {Prerequisite 2 — e.g., "Current state assessment completed"} → If not: [{Assessment card}](/{path})
- [ ] {Prerequisite 3 — e.g., "Budget approved and allocated"}
- [ ] {Prerequisite 4 — e.g., "Key stakeholders identified and available"}
- [ ] {Prerequisite 5 — e.g., "Required tools/systems access confirmed"}

## Constraints
<!-- Hard limits. Agents: enforce these throughout playbook execution. -->

- {Constraint 1 — timeline reality: "Phase 1 cannot be compressed below X weeks without significant risk"}
- {Constraint 2 — resource minimum: "Requires at least X people with Y skills"}
- {Constraint 3 — dependency: "Step X cannot begin until Step Y output is validated"}
- {Constraint 4 — regulatory/compliance: "In jurisdiction X, step Y requires Z approval"}
- {Constraint 5 — failure trigger: "If metric X drops below Y during execution, pause and reassess"}

## Timeline Overview

<!-- Visual timeline that agents can present upfront so users understand
     the full scope before diving into details. -->

```
{Phase 1 name}          {Phase 2 name}          {Phase 3 name}          {Phase 4 name}
[Week 1-{X}]            [Week {X}-{Y}]          [Week {Y}-{Z}]         [Week {Z}-{end}]
├── {Key action 1}      ├── {Key action}        ├── {Key action}       ├── {Key action}
├── {Key action 2}      ├── {Key action}        ├── {Key action}       ├── {Key action}
└── Gate: {criterion}   └── Gate: {criterion}   └── Gate: {criterion}  └── Done: {outcome}
```

| Phase | Duration | Key Output | Go/No-Go Gate |
|-------|----------|------------|---------------|
| {Phase 1} | {X weeks} | {Deliverable} | {What must be true to proceed} |
| {Phase 2} | {X weeks} | {Deliverable} | {Gate criterion} |
| {Phase 3} | {X weeks} | {Deliverable} | {Gate criterion} |
| {Phase 4} | {X weeks} | {Final deliverable} | {Success criteria} |

**Total timeline**: {X-Y weeks/months} (standard) / {compressed} / {phased}
**Constraint**: {What determines which timeline variant applies.} [src1]

## Phase 1: {Phase Name}

### Objective
{One sentence — what this phase achieves.}

### Step 1.1: {Action}
- **Owner**: {Role responsible}
- **Duration**: {Time estimate}
- **Inputs**: {What's needed to start}
- **Actions**:
  - {Specific action item 1}
  - {Specific action item 2}
  - {Specific action item 3}
- **Output**: {Deliverable or decision}
- **Constraint**: {Hard rule — e.g., "Do not proceed if X"} [src1]
- **Cost benchmark**: {Typical cost range for this step, if applicable}

### Step 1.2: {Action}
- **Owner**: {Role}
- **Duration**: {Time}
- **Inputs**: {What's needed — may reference output from 1.1}
- **Actions**:
  - {Action item 1}
  - {Action item 2}
- **Output**: {Deliverable}
- **Constraint**: {Hard rule}

### Step 1.3: {Action}
{Same structure.}

### Phase 1 Gate
<!-- Decision point: proceed, iterate, or stop. -->
- **Proceed if**: {Specific criteria — e.g., "Assessment score > 3.0 in all dimensions"}
- **Iterate if**: {What indicates the phase needs rework}
- **Stop if**: {Hard failure condition — e.g., "Budget exhausted before Phase 2 prerequisites met"}

## Phase 2: {Phase Name}

### Objective
{One sentence.}

### Step 2.1: {Action}
{Same structure as Phase 1 steps.}

### Step 2.2: {Action}
{Same structure.}

### Phase 2 Gate
- **Proceed if**: {Criteria}
- **Iterate if**: {Condition}
- **Stop if**: {Failure condition}

## Phase 3: {Phase Name}

{Same structure. Repeat for 3-5 phases total.}

<!-- 3-5 phases total. More than 5 = split into two playbooks.
     Each phase should be independently valuable — if the user stops after Phase 2,
     they should still have something useful. -->

## Anti-Patterns

### Wrong: {Common execution mistake #1}
{What people do wrong and the specific consequence — e.g., "Skipping Phase 1 stakeholder alignment → Phase 3 gets blocked by executive who wasn't consulted."} [src2]

### Correct: {Right approach}
{What to do instead.} [src1]

### Wrong: {Common execution mistake #2}
{Mistake and consequence.}

### Correct: {Right approach}
{Correction.}

### Wrong: {Common execution mistake #3}
{Mistake and consequence.}

### Correct: {Right approach}
{Correction.}

## Cost Benchmarks

<!-- Real numbers by scenario. Agents hallucinate costs — this section
     provides grounded estimates they can present confidently. -->

| Cost Category | {Small/Simple} | {Medium/Standard} | {Large/Complex} |
|---------------|---------------|-------------------|-----------------|
| {Category 1 — e.g., "Personnel"} | {$range} | {$range} | {$range} |
| {Category 2 — e.g., "Tools/licenses"} | {$range} | {$range} | {$range} |
| {Category 3 — e.g., "External services"} | {$range} | {$range} | {$range} |
| {Category 4 — e.g., "Contingency (15-25%)"} | {$range} | {$range} | {$range} |
| **Total estimated range** | **{$range}** | **{$range}** | **{$range}** |

**Constraint**: {Cost reality check — e.g., "If total budget is below the 'Small' range, scope must be reduced. Do not attempt full playbook on insufficient budget."} [src3]

## Success Metrics

<!-- How to know if the playbook execution was successful.
     Agents can use these to set expectations upfront and evaluate outcomes. -->

| Metric | Target | Measurement Method | Timeframe |
|--------|--------|-------------------|-----------|
| {Metric 1 — e.g., "Time to first customer"} | {Target value} | {How to measure} | {When to measure} |
| {Metric 2} | {Target} | {Method} | {Timeframe} |
| {Metric 3} | {Target} | {Method} | {Timeframe} |

## When This Matters

{1-2 sentences: when an agent should fetch this card. E.g., "Fetch when a user has decided to build a SaaS product and needs a structured execution plan from idea through first customers."}

## Related Units

- [{Decision card that routes here}](/{path})
- [{Assessment to run before starting}](/{path})
- [{Benchmark data for cost/timeline validation}](/{path})
- [{Next-phase playbook after this one completes}](/{path})
