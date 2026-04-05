# knowledgelib-mcp

MCP server for [knowledgelib.io](https://knowledgelib.io) — gives AI agents access to 1,564 structured, cited knowledge units across 16 domains. Pre-verified answers with inline source citations, confidence scores, quality status, and freshness tracking.

## Quick start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "knowledgelib": {
      "command": "npx",
      "args": ["knowledgelib-mcp"]
    }
  }
}
```

### MCP over HTTP (no install needed)

```
POST https://knowledgelib.io/mcp
```

Streamable HTTP transport, JSON-RPC 2.0, MCP spec 2025-03-26. Same 6 tools, works with any HTTP-capable MCP client.

### Other MCP clients (Cursor, Windsurf, etc.)

```bash
npx knowledgelib-mcp
```

The server uses stdio transport and works with any MCP-compatible client.

## Tools

### query_knowledge

Search across all knowledge units by relevance. Returns confidence scores, token estimates, quality status, content previews, and related units.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | Search query (e.g., "best wireless earbuds under 150") |
| `domain` | string | no | Filter by domain (e.g., "consumer_electronics", "software") |
| `region` | string | no | Filter by region (e.g., "US", "EU", "global") |
| `jurisdiction` | string | no | Filter by jurisdiction (e.g., "US", "EU", "global") |
| `entity_type` | string | no | Filter by type (e.g., "product_comparison", "concept", "agent_prompt") |
| `limit` | number | no | Max results, 1-20 (default: 3) |

### batch_query

Search multiple topics in a single call. Shares a single catalog parse — more efficient than calling query_knowledge multiple times.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queries` | array | yes | Array of query objects (1-10), each with `q`, optional `domain`, `region`, `jurisdiction`, `entity_type`, `limit` |

### get_unit

Retrieve a specific knowledge unit as raw markdown with YAML frontmatter. Prepends quality warning if the unit has open issues.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unit_id` | string | yes | Unit ID (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026") |

### list_domains

List all available knowledge domains with unit counts. No parameters.

### suggest_question

Submit a question or topic request. Popular suggestions are prioritized for new unit creation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The question to suggest (10-500 chars) |
| `context` | string | no | Why this question matters |
| `domain` | string | no | Suggested domain |

### report_issue

Flag incorrect, outdated, or broken content on a knowledge unit.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `card_id` | string | yes | Knowledge unit ID |
| `type` | string | yes | outdated, incorrect, broken_link, missing_info, other |
| `description` | string | yes | Describe the issue (10-2000 chars) |
| `severity` | string | no | low, medium, high, critical (default: medium) |
| `section` | string | no | Which section has the issue |

## Tool Annotations

All tools include MCP spec 2025-03-26 annotations:

| Tool | readOnlyHint | idempotentHint | destructiveHint |
|------|-------------|----------------|-----------------|
| query_knowledge | true | true | — |
| batch_query | true | true | — |
| get_unit | true | true | — |
| list_domains | true | true | — |
| suggest_question | false | true | false |
| report_issue | false | false | false |

Read-only tools can be called in parallel by agents.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KNOWLEDGELIB_URL` | `https://knowledgelib.io` | API base URL |
| `KNOWLEDGELIB_API_KEY` | (none) | API key (optional for free tier) |

## What you get

Each knowledge unit includes:

- **Structured metadata** — YAML frontmatter with confidence, sources, temporal validity, jurisdiction
- **Quality status** — verified, needs_review, or unreliable (based on open issues and confidence)
- **Content previews** — 150-char summaries without fetching full content
- **Related units** — knowledge graph edges (related_to, depends_on, alternative_to, often_confused_with)
- **Inline citations** from 5-8 authoritative sources
- **Token estimates** for context budget planning
- **Batch queries** — search up to 10 topics in one call

## Why use this instead of web search?

| | Without knowledgelib | With knowledgelib |
|---|---|---|
| Token cost | 3,000-8,000 tokens | ~600-1,800 tokens |
| Sources cited | Usually none | 100% — every claim cited |
| Confidence | Unknown | Scored 0.0-1.0 |
| Compute cost | $0.50-$5.00/question | $0.02/query |
| Freshness | Unknown | Verified date + schedule |
| Quality warnings | None | verified/needs_review/unreliable |

## REST API

The MCP server wraps the knowledgelib.io REST API. You can also use the API directly:

```
GET  https://knowledgelib.io/api/v1/query?q=best+earbuds&limit=3
POST https://knowledgelib.io/api/v1/batch
GET  https://knowledgelib.io/api/v1/units/{id}.md
GET  https://knowledgelib.io/api/v1/health
POST https://knowledgelib.io/api/v1/suggest
POST https://knowledgelib.io/api/v1/feedback
```

Full API docs: [knowledgelib.io/api](https://knowledgelib.io/api)
OpenAPI spec: [/api/v1/openapi.json](https://knowledgelib.io/api/v1/openapi.json)

## License

CC BY-SA 4.0
