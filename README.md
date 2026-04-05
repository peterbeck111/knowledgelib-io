# knowledgelib.io

AI Knowledge Library — structured, cited knowledge units for AI agents. Pre-verified answers that save tokens, reduce hallucinations, and cite every source.

## What is this?

1,564 knowledge units across 16 domains (consumer electronics, software, business strategy, ERP integration, compliance, energy, finance, and more). Each unit answers one canonical question with:

- **Confidence scores** (0.0-1.0) per published methodology
- **Inline source citations** from 5-8 authoritative sources
- **Freshness tracking** with verified dates and temporal validity
- **Quality status** — verified, needs_review, or unreliable
- **Knowledge graph** — related units with typed edges

One API call replaces 5 web searches and 8,000 tokens of parsing.

## Quick Start

### MCP Server (Claude, Cursor, Windsurf)

```bash
npx knowledgelib-mcp
```

Or add to `claude_desktop_config.json`:

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

Streamable HTTP transport, JSON-RPC 2.0, MCP spec 2025-03-26.

### REST API

```bash
# Search
curl https://knowledgelib.io/api/v1/query?q=best+wireless+earbuds+under+150

# Batch search (up to 10 queries)
curl -X POST https://knowledgelib.io/api/v1/batch \
  -H "Content-Type: application/json" \
  -d '{"queries":[{"q":"earbuds"},{"q":"headphones"}]}'

# Get full unit
curl https://knowledgelib.io/api/v1/units/consumer-electronics/audio/wireless-earbuds-under-150/2026.md

# Health check
curl https://knowledgelib.io/api/v1/health
```

### LangChain (Python)

```bash
pip install langchain-knowledgelib
```

```python
from langchain_knowledgelib import KnowledgelibRetriever
retriever = KnowledgelibRetriever()
docs = retriever.invoke("best wireless earbuds")
```

### n8n

```bash
npm install n8n-nodes-knowledgelib
```

## MCP Tools

| Tool | Description | Read-only |
|------|-------------|-----------|
| `query_knowledge` | Search across all knowledge units with filters | Yes |
| `batch_query` | Search multiple topics in one call (max 10) | Yes |
| `get_unit` | Retrieve full markdown content by ID | Yes |
| `list_domains` | List all domains with unit counts | Yes |
| `suggest_question` | Submit a topic request for new unit creation | No |
| `report_issue` | Flag incorrect, outdated, or broken content | No |

All read-only tools are marked with `readOnlyHint: true` and `idempotentHint: true` per MCP spec 2025-03-26, enabling parallel execution by agents.

## API Features

- **Structured error codes** with retryable flag and retry_after_ms
- **ETag / If-None-Match** caching (304 Not Modified)
- **Correlation IDs** (X-Request-Id header on all responses)
- **Quality status** (verified / needs_review / unreliable) on all results
- **Related units** for knowledge graph traversal
- **Content previews** (150-char summaries without fetching full unit)
- **Token budgeting** (total_tokens across results)
- **Rate limiting** on write endpoints (10 suggestions/hr, 20 feedback/hr)
- **Zod validation** with per-field error messages

## Entity Types

| Type | Count | Description |
|------|-------|-------------|
| product_comparison | 418 | Best-of roundups with decision logic and buy links |
| concept | 336 | Definitions of terms agents often get wrong |
| software_reference | 239 | Code examples, anti-patterns, decision trees |
| execution_recipe | 202 | Step-by-step implementation plans |
| erp_integration | 166 | API capabilities, rate limits, data mapping |
| agent_prompt | 55 | System prompts for pipeline sub-agents |
| assessment | 54 | Structured scoring frameworks |
| decision_framework | 35 | Decision trees with trade-offs |
| benchmark | 28 | Industry benchmarks by segment |
| rule | 28 | Actionable directives with evidence |

## Discovery

- [/llms.txt](https://knowledgelib.io/llms.txt) — Plain-text guide for LLMs
- [/llms-full.txt](https://knowledgelib.io/llms-full.txt) — Complete index of all questions
- [/.well-known/ai-knowledge.json](https://knowledgelib.io/.well-known/ai-knowledge.json) — Machine-readable manifest
- [/catalog.json](https://knowledgelib.io/catalog.json) — Full catalog with metadata
- [/for-agents](https://knowledgelib.io/for-agents) — Integration guide

## Links

- Website: https://knowledgelib.io
- npm: https://www.npmjs.com/package/knowledgelib-mcp
- PyPI: https://pypi.org/project/langchain-knowledgelib/
- HTTP MCP: https://knowledgelib.io/mcp
- OpenAPI: https://knowledgelib.io/api/v1/openapi.json
- GPT Actions: https://knowledgelib.io/.well-known/openapi-gpt.json

## License

CC BY-SA 4.0
