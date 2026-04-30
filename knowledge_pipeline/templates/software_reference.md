---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{The single question this unit answers}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{alternative phrasing 3}"
  - "{alternative phrasing 4}"
entity_type: software_reference
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
  last_breaking_change: "{version/date of last breaking change, or null}"
  next_review: {YYYY-MM-DD}
  change_sensitivity: low

# === CONSTRAINTS ===
constraints:
  - "{Hard limit: version requirement, platform restriction, or safety-critical rule}"
  - "{Second constraint}"
  - "{Third constraint}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{Error or scenario that looks similar but is a different problem}"
    use_instead: "{category}/{subcategory}/{correct-topic}/{version_tag}"
  - condition: "{Another wrong-match scenario}"
    use_instead: "{alternative unit or description}"

# === AGENT HINTS ===
inputs_needed:
  - key: "{input_key}"
    question: "{Question agent should ask user before traversing decision tree}"
    type: choice
    options: ["{option1}", "{option2}"]

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  depends_on:
    - id: "{category}/{subcategory}/{prereq-topic}/{version_tag}"
      label: "{Prerequisite Unit Title}"
  related_to:
    - id: "{category}/{subcategory}/{related-topic}/{version_tag}"
      label: "{Related Unit Title}"
  solves:
    - id: "{category}/{subcategory}/{downstream-topic}/{version_tag}"
      label: "{Downstream Problem Unit Title}"
  alternative_to:
    - id: "{category}/{subcategory}/{alt-topic}/{version_tag}"
      label: "{Alternative Approach Unit Title}"
  often_confused_with:
    - id: "{category}/{subcategory}/{confused-topic}/{version_tag}"
      label: "{Unit that looks similar but solves a different problem}"

# === SOURCES (5-8 authoritative sources) ===
# Types: official_docs, technical_blog, rfc_spec, academic_paper, community_resource, industry_report
# Reliability: high, moderate_high, moderate, moderate_low, low, authoritative
sources:
  - id: src1
    title: "{Article or Documentation Title}"
    author: {Publisher or Author}
    url: {url}
    type: official_docs
    published: {YYYY-MM-DD}
    reliability: high
---

# {Title}

## TL;DR

{3-5 bullet points. The complete answer in ≤100 tokens. An agent that only reads this section should be able to give a useful response.}

- **Bottom line**: {One sentence answer to the canonical question.}
- **Key tool/command**: `{the single most important command, API, or pattern}`
- **Watch out for**: {The #1 mistake people make.}
- **Works with**: {Version/platform compatibility in one line.}

## Constraints
<!-- Agents: read this section before recommending any action from this unit.
     These are hard constraints that must not be violated. -->

- {Constraint 1 — safety-critical rule or hard requirement}
- {Constraint 2 — version/platform requirement}
- {Constraint 3 — action that must never be taken}
- {Constraint 4 — edge case that changes the approach}

{3-6 constraints. Each is a hard rule an agent must respect.}

## Quick Reference

{Pick the appropriate format for the subcategory. This section is the core lookup table — agents fetch this to avoid reasoning from scratch.}

{FOR MIGRATIONS — equivalence mapping table:}

| {Source} Pattern | {Target} Equivalent | Example |
|---|---|---|
| `{old_api}` | `{new_api}` | `{minimal working code}` |

{FOR DEBUGGING — ranked diagnostic table:}

| # | Cause | Likelihood | Signature | Fix |
|---|---|---|---|---|
| 1 | {Cause} | ~{N}% of cases | `{error text or stack pattern}` | `{one-liner fix or command}` |

{FOR SYSTEM DESIGN — component architecture table:}

| Component | Role | Technology Options | Scaling Strategy |
|---|---|---|---|
| {Name} | {What it does} | {Tech 1, Tech 2} | {How it scales} |

{FOR PATTERNS — decision matrix:}

| Scenario | Pattern | Time | Space | Trade-off |
|---|---|---|---|---|
| {When you need X} | {Pattern name} | O({n}) | O({n}) | {Key trade-off} |

{FOR SECURITY — threat/fix checklist:}

| # | Vulnerability | Risk | Vulnerable Code | Secure Code |
|---|---|---|---|---|
| 1 | {Name} | Critical | `{bad pattern}` | `{fixed pattern}` |

{FOR DEVOPS — config summary:}

| Service | Image | Ports | Volumes | Key Env |
|---|---|---|---|---|
| {name} | `{image:tag}` | `{host:container}` | `{mount}` | `{VAR=val}` |

{8-15 rows. This table alone should answer 60% of agent queries on this topic.}

## Decision Tree

{Structured if/then logic. Agents use this to narrow down which code example or approach to recommend.}

```
START
├── {Condition A}?
│   ├── YES → {Recommendation + link to code example below}
│   └── NO ↓
├── {Condition B}?
│   ├── YES → {Recommendation}
│   └── NO ↓
└── DEFAULT → {Fallback recommendation}
```

{For DEBUGGING: "If stack trace contains X → Cause #1. If config shows Y → Cause #3."}
{For MIGRATIONS: "If codebase uses X pattern → follow Step 2a. If Y → Step 2b."}
{For SYSTEM DESIGN: "If <1K concurrent users → Approach A. If 1K-100K → B. If >100K → C."}

## Step-by-Step Guide

### 1. {Action verb + object}

{What to do, why, and what to verify after.} [src1]

```{language}
{Complete, runnable code. Not pseudo-code.}
```

**Verify**: `{command to confirm this step worked}` → expected output: `{output}`

### 2. {Action verb + object}

{Description.} [src2]

```{language}
{code}
```

**Verify**: `{command}` → `{expected}`

{4-8 steps. Each step is self-contained: code + verification.}

## Code Examples
<!-- Keep inline examples ≤15 lines. For longer scripts, extract to scripts/ subdirectory
     and link: "Full script: [name.ext](scripts/name.ext) (N lines)" -->

### {Language/Framework 1}: {Specific Use Case}

```{language}
// Input:  {what this code expects}
// Output: {what this code produces}

{Complete, tested, copy-pasteable code.
Every non-obvious line has a comment.
Includes error handling for production use.
Pin dependency versions in imports/requires.}
```

### {Language/Framework 2}: {Specific Use Case}

```{language}
// Input:  {what this code expects}
// Output: {what this code produces}

{Same pattern, different language.
Agents serve diverse tech stacks — multi-language examples maximize hit rate.}
```

{2-4 examples. Prioritize: Python, JavaScript/TypeScript, Go, Java — in that order of agent query frequency.}

## Anti-Patterns

{Show WRONG code alongside CORRECT code. This is the highest-value section — agents frequently generate these exact mistakes.}

### Wrong: {Description of what people do wrong}

```{language}
// ❌ BAD — {why this is wrong}
{wrong code}
```

### Correct: {The right approach}

```{language}
// ✅ GOOD — {why this is right}
{correct code}
```

{3-6 anti-pattern pairs. Source from Stack Overflow most-upvoted wrong answers, GitHub issues, and common agent hallucinations.}

## Common Pitfalls

- **{Pitfall 1}**: {What goes wrong, when, and why.} Fix: `{specific fix}`. [src3]
- **{Pitfall 2}**: {What goes wrong.} Fix: `{fix}`. [src4]
- **{Pitfall 3}**: {What goes wrong.} Fix: `{fix}`. [src5]
- **{Pitfall 4}**: {What goes wrong.} Fix: `{fix}`. [src2]

{4-8 pitfalls. Each one is: symptom → cause → fix. Dense, no filler.}

## Diagnostic Commands

{Commands an agent can suggest to the user to diagnose or verify. Omit for pattern/algorithm cards.}

```bash
# Check {what}
{command}

# Verify {what}
{command}

# Debug {what}
{command} | grep {pattern}
```

## Version History & Compatibility

| Version | Status | Breaking Changes | Migration Notes |
|---|---|---|---|
| {v3.x} | Current | {None / List} | — |
| {v2.x} | LTS until {date} | — | {Upgrade path} |
| {v1.x} | EOL | — | {What changed} |

{Include only when version-specific behavior matters. Omit for timeless content (algorithms, math, design principles).}

## When to Use / When Not to Use

| Use When | Don't Use When | Use Instead |
|---|---|---|
| {Scenario} | {Counter-scenario} | {Alternative approach} |
| {Scenario} | {Counter-scenario} | {Alternative} |
| {Scenario} | {Counter-scenario} | {Alternative} |

## Important Caveats

- {Caveat about version-specific behavior or breaking changes}
- {Caveat about platform/OS differences}
- {Caveat about performance or security trade-offs}

## Related Units
<!-- Generated from related_kos frontmatter -->

- [{Related topic 1}](/{path-to-related-unit})
- [{Related topic 2}](/{path-to-related-unit})
- [{Related topic 3}](/{path-to-related-unit})
