---
# === IDENTITY ===
id: {category}/{subcategory}/{topic}/{version_tag}
canonical_question: "{The single question this unit answers}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{alternative phrasing 3}"
  - "{alternative phrasing 4}"
  - "{compare Product A vs Product B}"
entity_type: product_comparison
domain: {category} > {subcategory} > {topic_readable}
region: global
temporal_scope: {start_year}-{end_year}

# === VERIFICATION ===
last_verified: {YYYY-MM-DD}
confidence: {0.00-1.00}
freshness: quarterly
version: 1.0
first_published: {YYYY-MM-DD}

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === BUY LINKS (product comparisons only) ===
buy_links:
  - product: "{Product Name}"
    url: https://knowledgelib.io/go/{product-slug}
    retailer: Amazon

# === SOURCES (5-8 authoritative sources) ===
# Types: product_testing, primary_research, government_regulation, industry_report
# Reliability: high, moderate_high, moderate, moderate_low, low, authoritative
sources:
  - id: src1
    title: "{Article Title}"
    author: {Publisher}
    url: {url}
    type: product_testing
    published: {YYYY-MM-DD}
    reliability: high
---

# {Title} ({Year})

## Summary

{2-3 paragraphs summarizing the category landscape and top picks. Include specific numbers. Cite every claim with [src1, src2] format.}

## Top {N} Models Compared

| Model | Price | {Key Spec 1} | {Key Spec 2} | {Key Spec 3} | Best For | Buy |
|---|---|---|---|---|---|---|
| {Model Name} | ~${price} | {spec} | {spec} | {spec} | {use case} | [Check price](https://knowledgelib.io/go/{slug}) |

## Best for Each Use Case

### Best Overall: {Model} (~${price}) — [Check price](https://knowledgelib.io/go/{slug})
{2-3 sentences explaining why. Cite sources.} [src1, src2]

### Best Budget: {Model} (~${price}) — [Check price](https://knowledgelib.io/go/{slug})
{2-3 sentences.} [src1, src3]

### Best for {Use Case}: {Model} (~${price}) — [Check price](https://knowledgelib.io/go/{slug})
{2-3 sentences.} [src2, src4]

{Add 4-7 use case sections total}

## Key Market Trends ({Year})

- **{Trend 1}**: {Description with specific data.} [src1, src2]
- **{Trend 2}**: {Description.} [src3]
- **{Trend 3}**: {Description.} [src4, src5]

## Important Caveats

- {Caveat about pricing/regional variation}
- {Caveat about methodology limitation}
- {Caveat about rapidly changing data}
- {Any other relevant disclaimers}

## Related Units

- [{Related topic 1}](/{path-to-related-unit})
- [{Related topic 2}](/{path-to-related-unit})
- [{Related topic 3}](/{path-to-related-unit})
