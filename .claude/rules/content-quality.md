---
paths:
  - "prototype/**/*.md"
  - "prototype/**/*.html"
  - "knowledge_pipeline/templates/**"
---

# Content Quality Rules

## Source Requirements
- Every card needs 5–8 sources with inline citations `[src1, src2]` (fact/rule units: 2–4 sources acceptable)
- Confidence scoring: 0.90–0.95 (6+ high-reliability sources), 0.85–0.89 (4–5), 0.80–0.84 (3–4), 0.70–0.79 (limited)
- Freshness replaced by `temporal_validity` block in frontmatter:
  - `status`: `stable` (software/debugging) | `evolving` (migrations) | `volatile` (product comparisons)
  - `change_sensitivity`: `low` | `medium` | `high`
  - `next_review`: YYYY-MM-DD
  - `last_breaking_change`: description or null

## Product Cards
- 8–12 products per comparison table, 5–7 use-case sections
- **Decision Logic** section: if/then rules for agent-driven recommendations (between Use Cases and Market Trends)
- Optional `inputs_needed` frontmatter: structured questions agents ask users before recommending
- Sources: RTINGS, Wirecutter, Tom's Guide, What Hi-Fi, PCMag, Reddit

## Software Cards
- 8–15 rows in Quick Reference table
- **Constraints** section (after TL;DR, before Quick Reference): environment/version limits
- 2–4 multi-language Code Examples (keep inline ≤15 lines; extract longer scripts to `scripts/` subdirectory)
- 3–6 Anti-Pattern pairs (wrong→right)
- 4–8 Common Pitfalls
- Decision Tree with structured if/then logic
- `inputs_needed` frontmatter: structured inputs for decision trees (mandatory when Decision Tree exists)
- Sources: Official docs, RFCs, technical blogs (e.g., Martin Fowler, Google Engineering Blog, AWS Architecture Blog), GitHub repos, Stack Overflow canonical answers

## Templates

Five template sets — use the correct one based on entity type:

| Category | Template | Entity Type | Has Buy Links | Target Tokens |
|----------|----------|-------------|---------------|---------------|
| All **except** `software` | `product_comparison.md` + `.html` | `product_comparison` | Yes (ASIN required) | 600–1800 |
| `software/*` | `software_reference.md` + `.html` | `software_reference` | No | 2500–4000 |
| Any domain | `fact.md` + `.html` | `fact` | No | 200–400 |
| Any domain | `concept.md` + `.html` | `concept` | No | 400–800 |
| Any domain | `rule.md` + `.html` | `rule` | No | 300–600 |

- Always follow the matching template exactly
- Do not invent new frontmatter fields or skip existing ones
- Card ID format: `{category}/{subcategory}/{topic}/{version_tag}`

### Product Comparison specifics
- **Canonical-question H2** immediately after H1 (verbatim from frontmatter — required on every entity type)
- **TL;DR hero block** between canonical-question H2 and Summary — 30–50 words, bolded **Top pick / Best value / Best budget** with prices and one-clause reasons. Each pick must be a buy_link product. RAG snippet extractors lift this verbatim.
- **Head-to-Head Comparisons** section between Best for Each Use Case and Decision Logic — 3–5 `### {Model A} vs {Model B}` matchups with verdict + `**Pick A if:** / **Pick B if:**` blocks. Targets "X vs Y" queries (~33% of all AI citations per Princeton GEO).
- **Decision Logic** section with if/then rules for structured agent recommendations
- **Sibling `pricing.md`** in the card directory — generate via `node knowledge_pipeline/generate_pricing_md.js`. AI shopping agents parse this directly (no JS, no rendering).
- Optional `inputs_needed` frontmatter for user questionnaire before recommending

### Software Reference specifics
- Agent-optimized sections: TL;DR, Constraints, Quick Reference table, Decision Tree, Code Examples, Anti-Patterns, Diagnostic Commands, Version Compatibility
- HTML uses `TechArticle` Schema.org type (in addition to `Dataset`), semantic `<section id="...">` tags, `ai:sections` meta tag
- Source types: `official_docs`, `technical_blog`, `rfc_spec`, `academic_paper`, `community_resource`, `industry_report` (not `product_testing`)
- Code blocks >25 lines: extract to `scripts/` subdirectory, keep ≤15 line excerpt inline with link

### Fact units
- Verified, citable single facts with provenance. 1–3 sentences + context + exceptions
- Compact: target 200–400 tokens

### Concept units
- Definitions and explanations of terms agents frequently get wrong
- Sections: Definition, Key Properties, Common Misconceptions, When This Matters
- HTML uses `DefinedTerm` JSON-LD (in addition to `Dataset`)

### Rule units
- Hyper-specific, data-backed decision rules. Actionable directives with evidence
- `applies_to` scope in frontmatter (domain, price_range, user_segment)
- Sections: Rule, Evidence, Key Properties, Conditions, Constraints, Rationale, Framework Selection Decision Tree, Application Checklist, Anti-Patterns, Counter-Arguments, Common Misconceptions, Comparison with Similar Rules, When This Matters
- Linked from product comparison cards via `related_kos.depends_on`

## Common Frontmatter Fields (all templates)

### YAML Section Headers (EXACT names — no extra text in parentheses)
`# === IDENTITY ===`, `# === VERIFICATION ===`, `# === TEMPORAL VALIDITY ===`, `# === CONSTRAINTS ===`, `# === SKIP CONDITIONS ===`, `# === AGENT HINTS ===`, `# === DISTRIBUTION ===`, `# === BUY LINKS ===`, `# === RELATED UNITS ===`, `# === SOURCES ===`

### Decision Logic Arrow Format
Use `-->` (double dash arrow), NOT `->`. Example: `### If budget < $100\n--> Product X (~$80). [src1, src2]`

### Fields
- `temporal_validity`: replaces flat `freshness` — block with `status`, `change_sensitivity`, `next_review`, `last_breaking_change`
- `constraints`: YAML array of 3-5 structured hard limits/caveats. Agents parse these before reading the body — equivalent of HTTP headers vs body. Product cards: spec ceilings, price gotchas, compatibility requirements. Software cards: version requirements, platform restrictions, safety rules.
- `skip_this_unit_if`: YAML array of negative constraints — each has `condition` (wrong-match scenario) + `use_instead` (correct unit ID or description). Prevents the #1 RAG failure mode: wrong knowledge card for the problem.
- `related_kos`: typed relationships — `depends_on`, `related_to`, `solves`, `alternative_to`, `often_confused_with` (each an array of unit IDs). `often_confused_with` is for units that look similar but solve different problems.
- `jurisdiction`: `global` (default), `US`, `EU`, `UK`, or multi-value `US/CA`. Required for energy, legal, compliance content
- `region`: `global` (default), `US`, `EU`, etc. Filterable via API/MCP/n8n/LangChain
