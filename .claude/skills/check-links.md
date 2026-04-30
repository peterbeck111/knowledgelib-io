---
name: check-links
description: Check source citations and affiliate buy links in knowledge cards for broken or incorrect URLs. Writes a markdown report.
---

# Check Links for knowledgelib.io

You are the link validation agent for knowledgelib.io — an AI Knowledge Library with structured, cited knowledge units.

## Your Task

Validate all source citations and affiliate buy links in knowledge cards. Detect broken URLs, inactive affiliate slugs, and dead Amazon product pages.

## Invocation

| Command | What happens |
|---------|--------------|
| `/check-links` | Checks all cards under `prototype/` |
| `/check-links --category consumer-electronics/audio` | Checks only cards in that category path |
| `/check-links --topic 42` | Checks the card from tracker row 42 |
| `/check-links --topic 1,3,5` | Checks cards from tracker rows 1, 3, and 5 |
| `/check-links --topic 1-10` | Checks cards from tracker rows 1 through 10 |

## How to Run

Execute the Node.js script with the appropriate flags:

```bash
node knowledge_pipeline/check_links.js
node knowledge_pipeline/check_links.js --category consumer-electronics/audio
node knowledge_pipeline/check_links.js --topic 42
node knowledge_pipeline/check_links.js --topic 1,3,5
node knowledge_pipeline/check_links.js --topic 1-10
```

## What It Checks

### 1. Source Citations (external URLs)
- Extracts all `<a href="https://...">` links from HTML files (excluding knowledgelib.io, schema.org, creativecommons.org)
- Sends HTTP HEAD request (falls back to GET on 405/403)
- Per-domain throttling: max 1 request/second per domain, max 3 concurrent requests
- Reports: HTTP status code, timeout, connection errors

### 2. Affiliate Buy Links (`/go/{slug}`)
- Extracts all `/go/{slug}` hrefs from HTML files
- **DB check**: Queries Supabase `affiliate_links` table — is the slug present? Is it active?
- **Destination check**: For active slugs, HTTP HEAD on the Amazon destination URL
- Falls back to Supabase REST API if direct PG connection fails
- Reports: missing slugs, inactive slugs, dead destination URLs

## Output

Results are written to `knowledge_pipeline/link_report.md` with:
- Summary table (cards checked, cards with issues, broken counts)
- Per-card issue tables (link type, URL, HTTP status, error)
- Console summary printed at the end

## After the Check

Review the report at `knowledge_pipeline/link_report.md`. For each broken link:

- **Source citation 404/410**: The article was removed or moved. Find the updated URL or a replacement source.
- **Source citation 403**: The site may be blocking the checker. Verify manually before acting.
- **Affiliate slug not in DB**: The product was never inserted. Run `node db/insert_card.js` with the correct buy_links.
- **Affiliate slug inactive**: The product was deactivated. Check if it should be reactivated or replaced.
- **Affiliate destination dead**: The Amazon product page is gone. Find the updated ASIN and update the affiliate_links table.