---
paths:
  - "prototype/**/*.md"
  - "prototype/**/*.html"
  - "db/**"
  - "functions/go/**"
---

# Affiliate Link Rules

- Pattern: `/go/{product-slug}` → Cloudflare Function → 302 redirect
- Amazon tag: `knowledgelib-20`
- Buy links in YAML frontmatter `buy_links:` section for machine readability

## ASIN Requirement
Every product must have its Amazon ASIN looked up via web search during card creation:
- With ASIN: `destination_url` = `https://www.amazon.com/dp/{ASIN}?tag=knowledgelib-20`
- Without ASIN (unreleased): `asin: null`, `destination_url` = `https://www.amazon.com/s?k={Product+Name}&tag=knowledgelib-20`

## JSON Fields
`slug`, `product_name`, `asin`, `retailer` (`"amazon_us"`), `destination_url`

Do NOT use `"product"`, `"url"`, or `"retailer": "Amazon"`.
