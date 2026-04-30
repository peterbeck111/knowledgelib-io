---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{When should I {action}? / How should I decide {decision}?}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{alternative phrasing 3}"
entity_type: rule
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
  status: evolving
  last_breaking_change: null
  next_review: {YYYY-MM-DD}
  change_sensitivity: medium

# === RULE SCOPE ===
applies_to:
  domain: "{category} > {subcategory}"
  price_range: "{$min-$max, or null}"
  user_segment: "{target user description}"
  context: "{additional scoping context}"

# === CONSTRAINTS ===
# Hard boundaries on when this rule applies. Agents: read before recommending.
constraints:
  - "{Jurisdictional or regulatory scope — where this rule is enforceable}"
  - "{Temporal limitation — regulatory changes, sunset clauses, pending amendments}"
  - "{Entity/size threshold — which organizations this applies to}"
  - "{Prerequisite — what must be in place before this rule can be followed}"
  - "{Interaction effect — how this rule conflicts with or depends on other rules}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{Scenario where this rule doesn't apply}"
    use_instead: "{alternative unit}"
  - condition: "{User is in a different jurisdiction or context}"
    use_instead: "{category}/{subcategory}/{correct-topic}/{version_tag}"

# === AGENT HINTS ===
inputs_needed:
  - key: "{situation_key}"
    question: "{What is the user's regulatory situation?}"
    type: choice
    options:
      - "{scenario where this rule is the right answer}"
      - "{scenario where this rule is the right answer}"
      - "{scenario where a different rule applies}"

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  depends_on:
    - id: "{category}/{subcategory}/{fact-or-concept}/{version_tag}"
      label: "{Fact or Concept this rule builds on}"
  related_to:
    - id: "{category}/{subcategory}/{comparison-card}/{version_tag}"
      label: "{Product Comparison this rule applies to}"
  often_confused_with:
    - id: "{category}/{subcategory}/{confused-topic}/{version_tag}"
      label: "{Rule that looks similar but covers a different scope}"
  solves: []
  alternative_to: []

# === SOURCES (3-6 authoritative sources with data backing the rule) ===
# Types: product_testing, primary_research, industry_report, community_resource, government_regulation, official_docs
# Reliability: high, moderate_high, moderate, authoritative
sources:
  - id: src1
    title: "{Data source backing the rule}"
    author: {Publisher}
    url: {url}
    type: government_regulation
    published: {YYYY-MM-DD}
    reliability: authoritative
---

# {Rule Statement as Title}

## Rule

{The rule, stated as a clear actionable directive. One paragraph, 2-4 sentences. Must be specific enough that an agent can act on it without further interpretation.} [src1, src2]

## Evidence

{2-4 sentences with specific data supporting the rule. Include numbers, percentages, test results, survey data, penalty amounts, enforcement actions. Every claim cited. This is what makes the rule credible — without data it's just an opinion.} [src1, src2, src3]

## Key Properties

- **{Property 1}**: {Value or explanation — e.g., "Penalty: up to EUR 20M or 4% of global turnover"}
- **{Property 2}**: {Value or explanation — e.g., "Scope: all entities processing EU resident data"}
- **{Property 3}**: {Value or explanation}
- **{Property 4}**: {Value or explanation}

{3-6 properties. Each should be a verifiable, specific attribute of the rule.}

## Conditions

- **Applies when**: {Specific conditions under which this rule holds — budget range, user type, use case, platform, jurisdiction}
- **Does NOT apply when**: {Exceptions where the rule breaks down — expert users, specific use cases, edge conditions, exemptions}
- **Confidence degrades when**: {Conditions where the rule is less reliable — e.g., "pending amendments", "enforcement guidance not yet issued"}

## Constraints
<!-- Agents: read this section before recommending this rule.
     These are hard boundaries on when and how it applies. -->

- {Constraint 1 — jurisdictional or regulatory scope}
- {Constraint 2 — temporal limitation or pending changes}
- {Constraint 3 — entity/size threshold}
- {Constraint 4 — prerequisite or dependency on other rules} [src3]
- {Constraint 5 — interaction effect with other regulatory frameworks}

{3-6 constraints. Each prevents an agent from over-applying this rule.}

## Rationale

{2-3 sentences explaining the causal reasoning behind the rule. Why does this rule exist? What's the underlying policy goal or mechanism? This helps agents explain the recommendation to users.} [src2, src3]

## Framework Selection Decision Tree

{Structured routing logic. Agents use this to determine if THIS rule is the right one, or if they should redirect to a different unit.}

```
START — User needs {category of regulatory/compliance guidance}
├── Which jurisdiction?
│   ├── {Jurisdiction A — where this rule applies}
│   │   └── {This Rule} ← YOU ARE HERE
│   ├── {Jurisdiction B — different rule applies}
│   │   └── {Alternative Rule} [often_confused_with]
│   └── {Multiple jurisdictions}
│       └── {Cross-border unit or comparison unit}
├── {Critical scoping question — e.g., "Does the entity meet the threshold?"}
│   ├── YES → Apply this rule: {key obligations}
│   └── NO → {Exemption or alternative path}
└── {Compliance maturity question — e.g., "Is there an existing program?"}
    ├── YES → Audit against {This Rule}: {key checkpoints}
    └── NO → Start with {foundational prerequisite}
```

## Application Checklist

{Structured steps an agent can walk through with a user. Each step has inputs, outputs, and a hard constraint that prevents misapplication.}

### Step 1: {First action — e.g., "Determine applicability"}
- **Inputs needed**: {What the user must provide — e.g., "entity type, jurisdiction, data processing scope"}
- **Output**: {What this step produces — e.g., "go/no-go on whether the rule applies"}
- **Constraint**: {Hard rule — when to stop or adjust} [src1]

### Step 2: {Second action — e.g., "Identify obligations"}
- **Inputs needed**: {What's required}
- **Output**: {Deliverable}
- **Constraint**: {Validation rule — what makes this step's output invalid}

### Step 3: {Third action — e.g., "Implement controls"}
- **Inputs needed**: {What's required}
- **Output**: {Deliverable}
- **Constraint**: {Quality gate — minimum threshold for compliance} [src2]

### Step 4: {Fourth action — e.g., "Validate and document"}
- **Inputs needed**: {Output from previous steps}
- **Output**: {Go/no-go decision or compliance attestation}
- **Constraint**: {When to escalate or seek legal counsel}

{3-5 steps. Each is self-contained: inputs → output → constraint.}

## Anti-Patterns

{Show WRONG application alongside CORRECT application. Agents frequently misapply rules — this section prevents the most common errors.}

### Wrong: {Description of common misapplication}
{1-2 sentences explaining what people do wrong and what happens as a result.} [src2]

### Correct: {The right approach}
{1-2 sentences explaining the correct application with specific example.} [src1]

### Wrong: {Second common misapplication}
{What goes wrong.} [src3]

### Correct: {The right approach}
{Correction with example.} [src1]

{3-4 anti-pattern pairs. Source from common compliance failures, enforcement actions, and known agent errors.}

## Counter-Arguments

- {Legitimate case against this rule, with source.} [src4]
- {When the opposite advice would be correct.}
- {Criticism of the rule's scope, enforcement, or proportionality.}

{1-3 counter-arguments. Omit only if the rule is universally applicable. Including counter-arguments increases agent trust in the rule.}

## Common Misconceptions

- **Misconception**: {What agents and people frequently get wrong about this rule.}
  **Reality**: {The correct understanding, with citation.} [src2]

- **Misconception**: {Second common error.}
  **Reality**: {Correction.} [src3]

{2-4 misconception/reality pairs. Directly prevents agent hallucinations about regulatory requirements.}

## Comparison with Similar Rules

| Rule/Framework | Key Difference | When to Use |
|---|---|---|
| {This rule} | {Its distinguishing feature} | {When this applies} |
| {Similar rule 1} | {How it differs} | {When that applies instead} |
| {Similar rule 2} | {How it differs} | {When that applies instead} |

{Include only if commonly confused with other rules/frameworks. Omit if unique.}

## When This Matters

{1-2 sentences: the specific scenario where an agent should fetch and cite this rule. E.g., "Fetch this when a user asks about data privacy requirements for businesses operating in the EU or processing EU resident data."}

## Related Units

- [{Related comparison card}](/{path-to-comparison})
- [{Related fact or concept}](/{path-to-fact-or-concept})
- [{Alternative rule for different conditions}](/{path-to-alt-rule})
