---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{What is {concept}? / How does {concept} work?}"
aliases:
  - "{alternative name 1}"
  - "{alternative name 2}"
  - "{common abbreviation}"
  - "{frequently confused term}"
entity_type: concept
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
  status: stable
  last_breaking_change: null
  next_review: {YYYY-MM-DD}
  change_sensitivity: low

# === CONSTRAINTS ===
# When this concept/framework does NOT apply or has known limitations.
# Agents: read before recommending. These prevent over-application.
constraints:
  - "{Resource or context requirement — e.g., 'requires X capability or budget level'}"
  - "{Execution gap — what the framework identifies vs. what it can't operationalize}"
  - "{Regulatory/domain limitation — where structural barriers prevent application}"
  - "{Empirical criticism — survivorship bias, weak evidence, or known failure modes}"
  - "{Prerequisite knowledge — what must be understood FIRST before applying this}"

# === SKIP CONDITIONS ===
# Routes agents to the correct unit when this one is a wrong match.
skip_this_unit_if:
  - condition: "{User actually needs X, not this concept}"
    use_instead: "{category}/{subcategory}/{correct-topic}/{version_tag}"
  - condition: "{User is in scenario Y where a different framework applies}"
    use_instead: "{category}/{subcategory}/{alt-topic}/{version_tag}"
  - condition: "{User's context (stage, size, domain) makes this inapplicable}"
    use_instead: "{category}/{subcategory}/{better-fit}/{version_tag}"

# === AGENT HINTS ===
# Structured version of "When This Matters" — helps agents decide whether
# to fetch this card BEFORE consuming the full body.
inputs_needed:
  - key: "{situation_key}"
    question: "{What is the user's situation or goal?}"
    type: choice
    options:
      - "{scenario where this concept is the right answer}"
      - "{scenario where this concept is the right answer}"
      - "{scenario where this concept is the right answer}"
      - "{scenario — comparing frameworks for a specific decision}"

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  related_to:
    - id: "{category}/{subcategory}/{related-topic}/{version_tag}"
      label: "{Related Unit Title}"
  often_confused_with:
    - id: "{category}/{subcategory}/{confused-topic}/{version_tag}"
      label: "{Unit that looks similar but solves a different problem}"
  depends_on: []
  solves: []
  alternative_to: []

# === SOURCES (3-6 authoritative sources) ===
# Types: official_docs, technical_blog, rfc_spec, academic_paper, primary_research, industry_report
# Reliability: high, moderate_high, moderate, authoritative
sources:
  - id: src1
    title: "{Authoritative definition source}"
    author: {Publisher or Author}
    url: {url}
    type: official_docs
    published: {YYYY-MM-DD}
    reliability: authoritative
---

# {Concept Name}

## Definition

{2-3 sentences. Precise, unambiguous definition that an agent can use directly in responses. Avoid jargon in the definition itself.} [src1]

## Key Properties

- **{Property 1}**: {Value or explanation — e.g., "Range: 20Hz-20kHz"}
- **{Property 2}**: {Value or explanation}
- **{Property 3}**: {Value or explanation}
- **{Property 4}**: {Value or explanation}

{3-6 properties. Each should be a verifiable, specific attribute.}

## Constraints
<!-- Agents: read this section before recommending this concept/framework.
     These are hard boundaries on when and how it applies. -->

- {Constraint 1 — resource or context requirement for valid application}
- {Constraint 2 — execution gap or what the framework can't operationalize}
- {Constraint 3 — regulatory/domain limitation}
- {Constraint 4 — empirical criticism with citation} [src3]
- {Constraint 5 — prerequisite knowledge or analysis required first}

{3-6 constraints. Each prevents an agent from over-recommending this concept.}

## Framework Selection Decision Tree

{Structured routing logic. Agents use this to determine if THIS concept is the right one, or if they should redirect to a different unit. This is the single biggest value-add — agents constantly pick the wrong framework.}

```
START — User needs {category of framework/concept}
├── What's the goal?
│   ├── {Goal A — where a different concept applies}
│   │   └── {Alternative Concept} [often_confused_with]
│   ├── {Goal B — where THIS concept is correct}
│   │   └── {This Concept} ← YOU ARE HERE
│   ├── {Goal C — where another concept applies}
│   │   └── {Another Alternative}
│   └── {Goal D — different need entirely}
│       └── {Yet Another Alternative}
├── {Critical context question — e.g., "Is the market regulated?"}
│   ├── YES → {How this changes the recommendation}
│   └── NO → {Default path}
└── {Resource/readiness question — e.g., "Does the company have X?"}
    ├── YES → Proceed with {This Concept}: {key steps}
    └── NO → Consider {lower-cost alternative}
```

## Application Checklist

{Structured steps an agent can walk through with a user. Each step has inputs, outputs, and a hard constraint that prevents misapplication.}

### Step 1: {First action}
- **Inputs needed**: {What the user must provide — e.g., "3-5 competitors, 5-8 competing factors"}
- **Output**: {What this step produces}
- **Constraint**: {Hard rule — when to stop or adjust} [src1]

### Step 2: {Second action}
- **Inputs needed**: {What's required}
- **Output**: {Deliverable}
- **Constraint**: {Validation rule — what makes this step's output invalid}

### Step 3: {Third action}
- **Inputs needed**: {What's required}
- **Output**: {Deliverable}
- **Constraint**: {Quality gate — minimum threshold for a valid result} [src2]

### Step 4: {Validation/viability check}
- **Inputs needed**: {Output from previous steps}
- **Output**: {Go/no-go decision}
- **Constraint**: {When to abandon this framework and switch approaches}

{3-5 steps. Each is self-contained: inputs → output → constraint. The constraints are the highest-value part — they prevent the framework from being applied badly.}

## Anti-Patterns

{Show WRONG application alongside CORRECT application. Agents frequently misapply frameworks — this section prevents the most common errors.}

### Wrong: {Description of common misapplication}
{1-2 sentences explaining what people do wrong and what happens as a result.} [src2]

### Correct: {The right approach}
{1-2 sentences explaining the correct application with specific example.} [src1]

### Wrong: {Second common misapplication}
{What goes wrong.} [src3]

### Correct: {The right approach}
{Correction with example.} [src1]

{3-4 anti-pattern pairs. Source from common consulting mistakes, academic critiques, and known agent hallucination patterns.}

## Common Misconceptions

- **Misconception**: {What agents and people frequently get wrong about this concept.}
  **Reality**: {The correct understanding, with citation.} [src2]

- **Misconception**: {Second common error.}
  **Reality**: {Correction.} [src3]

{2-4 misconception/reality pairs. Directly prevents agent hallucinations.}

## Comparison with Similar Concepts

| Concept | Key Difference | When to Use |
|---|---|---|
| {This concept} | {Its distinguishing feature} | {When this applies} |
| {Similar concept 1} | {How it differs} | {When that applies instead} |
| {Similar concept 2} | {How it differs} | {When that applies instead} |

{Include only if commonly confused with other concepts. Omit if unique.}

## When This Matters

{1-2 sentences: the specific scenario where an agent should fetch and cite this concept. E.g., "Fetch this when a user asks about competitive strategy in saturated markets or when comparing strategic frameworks for market positioning."}

## Related Units

- [{Related topic 1}](/{path-to-related-unit})
- [{Related topic 2}](/{path-to-related-unit})
- [{Related topic 3}](/{path-to-related-unit})
