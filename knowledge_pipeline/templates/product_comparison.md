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
jurisdiction: global
temporal_scope: {start_year}-{end_year}

# === VERIFICATION ===
last_verified: {YYYY-MM-DD}
confidence: {0.00-1.00}
version: 1.0
first_published: {YYYY-MM-DD}

# === TEMPORAL VALIDITY ===
temporal_validity:
  status: volatile
  last_breaking_change: null
  next_review: {YYYY-MM-DD}
  change_sensitivity: high

# === CONSTRAINTS ===
constraints:
  - "{Hard limit or caveat that affects recommendations — e.g., spec ceiling, price gotcha, compatibility requirement}"
  - "{Second constraint}"
  - "{Third constraint}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{Symptom or scenario where this card is the wrong answer}"
    use_instead: "{category}/{subcategory}/{correct-topic}/{version_tag}"
  - condition: "{Another wrong-match scenario}"
    use_instead: "{alternative unit or description}"

# === AGENT HINTS ===
# inputs_needed:
#   - key: budget
#     question: "What is your budget?"
#     type: choice
#     options: ["{range1}", "{range2}", "{range3}"]
#   - key: primary_use
#     question: "What will you primarily use it for?"
#     type: choice
#     options: ["{use1}", "{use2}", "{use3}"]

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/{category}/{subcategory}/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === BUY LINKS (product comparisons only) ===
buy_links:
  - slug: "{product-slug}"
    product_name: "{Product Name}"
    asin: "{B0XXXXXXXX}"
    retailer: amazon_us
    destination_url: "https://www.amazon.com/dp/{ASIN}?tag=knowledgelib-20"

# === RELATED UNITS ===
related_kos:
  related_to:
    - id: "{category}/{subcategory}/{related-topic}/{version_tag}"
      label: "{Related Unit Title}"
  alternative_to:
    - id: "{category}/{subcategory}/{alt-topic}/{version_tag}"
      label: "{Alternative Unit Title}"
  often_confused_with:
    - id: "{category}/{subcategory}/{confused-topic}/{version_tag}"
      label: "{Unit that looks similar but solves a different problem}"
  depends_on: []
  solves: []

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

## {Canonical Question — verbatim, e.g. "What are the best Bluetooth speakers under $100 in 2026?"}
<!-- The canonical_question from frontmatter, restated as an H2 immediately under H1.
     This gives AI tree-walking algorithms a clean question→answer pair right at the top
     and matches how users phrase queries in ChatGPT, Perplexity, and Google AI Overviews.
     Do NOT change the wording — copy the canonical_question from frontmatter exactly. -->

## TL;DR

**Top pick: {Best Overall Model} (~${price}) — {one-clause why}.**
**Best value: {Best Value Model} (~${price}) — {one-clause why}.**
**Best budget: {Best Budget Model} (~${price}) — {one-clause why}.**
{Optional one-sentence context about the category in {Year}.}
[<a href="{source_url}">src1</a>, <a href="{source_url}">src2</a>]

<!-- TL;DR is the AI-extraction-optimized hero block. Target 30-50 words.
     RAG snippet extractors will lift this verbatim. The bolded picks must each be a buy_link.
     Do NOT bury the answer in prose — lead with the names + prices + one reason each. -->

## Summary

{2-3 paragraphs expanding on the TL;DR with category context, market trends, and supporting detail. Include specific numbers. Cite every claim with [src1, src2] format.}

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

## Head-to-Head Comparisons

<!-- Pairwise comparisons of the top 3-5 picks. Captures "X vs Y" queries — comparison
     content is ~33% of all AI citations per Princeton GEO research. Each subsection targets
     a real query an agent or buyer would search (e.g., "JBL Flip 7 vs Soundcore Motion 300").
     Use the pairings buyers actually compare — not all permutations. 3-5 head-to-heads is enough. -->

### {Model A} vs {Model B}
{2-3 sentences picking a winner for the typical buyer, with the key tradeoff stated plainly. Cite sources.} [src1, src2]

**Pick {Model A} if:** {scenario in one clause}.
**Pick {Model B} if:** {scenario in one clause}.

### {Model A} vs {Model C}
{2-3 sentences.} [src1, src3]

**Pick {Model A} if:** {scenario}.
**Pick {Model C} if:** {scenario}.

### {Model B} vs {Model C}
{2-3 sentences.} [src2, src4]

**Pick {Model B} if:** {scenario}.
**Pick {Model C} if:** {scenario}.

{3-5 head-to-head sections total. Pair the natural matchups, not every combination.}

## Decision Logic

<!-- Structured if-then rules for agent decision-making. Data-backed, specific to this category.
     Agents use this to narrow recommendations without reading the full card. -->

### If budget < ${low_threshold}
→ {Recommendation with reasoning.} [src1]

### If primary use is {use case}
→ Prioritize {spec} over {spec} because {data-backed reason.} [src2, src3]

### If user has {constraint}
→ {Specific recommendation accounting for constraint.} [src1]

### Default recommendation
→ {The safest pick for unknown requirements.} [src4]

{Add 3-6 decision rules total. Each must cite a source.}

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
<!-- Generated from related_kos frontmatter -->

- [{Related topic 1}](/{path-to-related-unit})
- [{Related topic 2}](/{path-to-related-unit})
- [{Related topic 3}](/{path-to-related-unit})
