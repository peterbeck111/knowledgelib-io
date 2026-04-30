---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{The single question this fact answers}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{alternative phrasing 3}"
entity_type: fact
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
  last_breaking_change: "{spec/version that last changed this fact, or null}"
  next_review: {YYYY-MM-DD}
  change_sensitivity: low

# === SKIP CONDITIONS ===
# skip_this_unit_if:
#   - condition: "{Scenario where this fact doesn't apply}"
#     use_instead: "{alternative unit}"

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  related_to:
    - id: "{category}/{subcategory}/{related-topic}/{version_tag}"
      label: "{Related Unit Title}"
  often_confused_with: []
  depends_on: []
  solves: []
  alternative_to: []

# === SOURCES (2-5 authoritative sources) ===
# Types: official_docs, primary_research, government_regulation, industry_report, rfc_spec
# Reliability: high, moderate_high, moderate, authoritative
sources:
  - id: src1
    title: "{Primary source title}"
    author: {Publisher or Author}
    url: {url}
    type: official_docs
    published: {YYYY-MM-DD}
    reliability: authoritative
  - id: src2
    title: "{Corroborating source title}"
    author: {Publisher}
    url: {url}
    type: primary_research
    published: {YYYY-MM-DD}
    reliability: high
---

# {Fact Statement as Title}

## Fact

{1-3 sentences. The verified fact stated precisely with inline citations. Include specific numbers, dates, and versions where applicable.} [src1, src2]

## Context

{2-3 sentences. Why this fact matters to agents and users. When should an agent fetch this fact? What decisions does it inform?}

## Exceptions & Edge Cases

- {Exception or edge case where the fact doesn't hold}
- {Regional or version-specific variation}
- {Common misinterpretation to avoid}

{2-4 exceptions. Omit section entirely if none exist.}

## Related Units

- [{Related topic 1}](/{path-to-related-unit})
- [{Related topic 2}](/{path-to-related-unit})
