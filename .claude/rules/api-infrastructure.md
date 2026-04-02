---
paths:
  - "functions/**"
  - "mcp-server/**"
  - "n8n-node/**"
  - "langchain/**"
---

# API & MCP Infrastructure

## Shared Utilities
All API functions import from `functions/_shared/utils.js` — the single source of truth for CORS headers, `jsonResponse()`, `errorResponse()` (structured error codes), `detectAgentType()`, `detectAccessChannel()`, `normalizeQuestion()`, `hashIp()`, `logError()`, `logAccess()`, `getCatalog()` (with 60s in-memory TTL cache), `searchCatalog()`, `qualityStatus()`, and `captureUnansweredQuery()`. **Never duplicate these utilities in endpoint files.**

### Structured Error Codes
All API errors use `errorResponse(code, message)` returning `{"error": {"code", "message", "retryable", "retry_after_ms"}}`. Codes: `INVALID_QUERY` (400), `INVALID_BODY` (400), `INVALID_PARAMETER` (400), `METHOD_NOT_ALLOWED` (405), `UNIT_NOT_FOUND` (404), `CARD_NOT_FOUND` (404), `CATALOG_UNAVAILABLE` (503, retryable), `DB_UNAVAILABLE` (503, retryable), `RATE_LIMITED` (429, retryable), `INTERNAL_ERROR` (500, retryable).

## REST API (Cloudflare Functions)
- **Search**: `GET /api/v1/query?q=...&limit=N&domain=...&region=...&jurisdiction=...&entity_type=...` — searches catalog.json by canonical_question/aliases, returns ranked JSON results. Auto-captures 0-result queries as suggestions via `discovered_questions`. Response includes `entity_type`, `temporal_status`, `jurisdiction`, `open_issues`, `content_preview`, `total_tokens` per result.
- **Get Unit**: `GET /api/v1/units/{id}.md` — returns raw markdown; `.json` returns parsed frontmatter + body
- **Suggest Question**: `POST /api/v1/suggest` — agents submit topic requests. Deduplicates, checks for existing matches (score > 50), records via `upsert_question_suggestion()` RPC. Returns `{ status: "recorded" | "already_answered" }`.
- **List Suggestions**: `GET /api/v1/suggestions?limit=N&min_count=N&status=pending` — browse top unanswered questions ranked by occurrence count
- **Content Feedback**: `POST /api/v1/feedback` — report issues on knowledge units (card_id, type, description, severity, section). `GET /api/v1/feedback?card_id=...&status=open` — browse open feedback for a card.
- **Batch Query**: `POST /api/v1/batch` — execute up to 10 queries in a single request with shared catalog parse. Body: `{"queries": [{"q":"...","limit":3,...}, ...]}`. Response includes per-query results + aggregate `total_results` and `total_tokens`.
- **Health Check**: `GET /api/v1/health` — returns `{status: "healthy"|"degraded"|"down", checks: {catalog: {...}, supabase: {...}}}`. Returns 503 if any dependency is down.
- **OpenAPI spec**: `https://knowledgelib.io/api/v1/openapi.json` (static file)

### Response Enhancements
- **Correlation IDs**: All API responses include `X-Request-Id` header (UUID). Use this when reporting issues for end-to-end traceability.
- **Quality Status**: Query results include `quality_status` field: `verified` (0 issues, confidence >= 0.85), `needs_review` (1-2 issues or low confidence), `unreliable` (3+ issues). MCP tools surface warnings for non-verified units.
- **Related Units**: Query results include `related_units` array (from frontmatter `related_kos`) with typed edges (`related_to`, `depends_on`, `solves`, `alternative_to`, `often_confused_with`). Enables knowledge graph traversal without fetching full unit content.
- **ETag / If-None-Match**: Query and unit endpoints return `ETag` headers. Clients sending `If-None-Match` get `304 Not Modified` on cache hits — zero bandwidth, zero token spend.
- **Zod Validation**: All POST endpoints validated with Zod schemas (`functions/_shared/validation.js`). Returns per-field errors: `{"error":{"code":"INVALID_PARAMETER","message":"card_id: card_id is required..."}}`.
- **Rate Limiting**: `POST /api/v1/suggest` (10/hr per IP) and `POST /api/v1/feedback` (20/hr per IP). In-memory per-isolate counters. Returns `429 RATE_LIMITED` with `Retry-After` header.

### Query Filters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `q` | Search query (required) | `wireless earbuds under 150` |
| `limit` | Max results (default 50, max 20) | `5` |
| `domain` | Filter by domain | `consumer_electronics` |
| `region` | Filter by region (matches exact or `global`) | `US` |
| `jurisdiction` | Filter by jurisdiction (matches exact, `global`, or multi-value) | `EU` |
| `entity_type` | Filter by entity type | `product_comparison` |

## MCP HTTP Endpoint (Streamable HTTP transport)
- **Endpoint**: `POST https://knowledgelib.io/mcp` — JSON-RPC 2.0 over HTTP, MCP spec 2025-03-26
- **Tools**: Same 6 tools as the stdio MCP server (query_knowledge, batch_query, get_unit, list_domains, suggest_question, report_issue)
- **Use case**: Claude.ai web, remote MCP clients, any HTTP-capable agent — no npm/CLI install required
- **CORS**: Fully open (`Access-Control-Allow-Origin: *`)
- **Session**: `Mcp-Session-Id` header returned on initialize
- **GET /mcp**: Returns server info (name, version, tool count) for discovery
- **Logging**: All tool calls logged to `card_access_log` with `access_channel: mcp_http`

## OpenAI GPT Actions
- **Schema**: `https://knowledgelib.io/.well-known/openapi-gpt.json` — OpenAPI 3.1.0 tailored for GPT Actions
- **Operations**: searchKnowledge, batchSearch, getUnit, suggestTopic, reportIssue, checkHealth
- **Use case**: Custom GPTs in ChatGPT can import this schema as Actions to give users native knowledgelib access

## MCP Server (npm: knowledgelib-mcp v1.3.0 — stdio transport)
- **Install**: `npx knowledgelib-mcp`
- **Tools**: `query_knowledge`, `batch_query`, `get_unit`, `list_domains`, `suggest_question`, `report_issue` — thin client over REST API
- `query_knowledge` supports `region`, `jurisdiction`, `entity_type` filter params; response includes `content_preview`, `total_tokens`, `quality_status`
- `batch_query`: execute up to 10 queries in a single tool call (1-10 query objects with q, domain, region, jurisdiction, entity_type, limit)
- `get_unit`: fetches raw markdown + prepends quality warning if unit has open issues
- `report_issue`: flags incorrect/outdated/broken content (card_id, type, description, severity, section)
- **Tool annotations** (MCP spec 2025-03-26): `readOnlyHint`/`idempotentHint` on read tools (query_knowledge, batch_query, get_unit, list_domains); `destructiveHint: false` on write tools (suggest_question, report_issue). Enables agents to parallelize read-only tool calls.
- **Structured errors**: MCP tool responses use `isError: true` and parse API structured error codes (code, message, retryable, retry_after_ms)
- **Config**: `KNOWLEDGELIB_URL` (default: `https://knowledgelib.io`), `KNOWLEDGELIB_API_KEY` (optional)
- **Publish**: `cd mcp-server && npm publish --access public` (uses NPM_TOKEN from .env via `npm config set`)
- **Note**: HTTP MCP endpoint (`functions/mcp.js`) exists but is dormant — not routed in `_routes.json`. The stdio server via npm is the supported MCP path.

## n8n Community Node (npm: n8n-nodes-knowledgelib v0.2.0)
- **Operations**: Query Knowledge, Get Unit, List Domains, Suggest Question, Report Issue
- **Query filters**: Region Filter, Jurisdiction Filter, Entity Type Filter (dropdown)
- **Report Issue**: Card ID, Issue Type (dropdown), Description, Severity (dropdown), Section
- **Credentials**: Optional `knowledgelibApi` (apiUrl + apiKey)
- **Publish**: `cd n8n-node && npm run build && npm publish`

## LangChain Retriever (PyPI: langchain-knowledgelib v0.2.0)
- **Classes**: `KnowledgelibRetriever` (BaseRetriever with `region`, `jurisdiction`, `entity_type` fields)
- **Functions**: `suggest_question()` / `asuggest_question()` — topic requests; `report_issue()` / `areport_issue()` — content feedback
- **Metadata**: results include `entity_type`, `temporal_status`, `jurisdiction`, `open_issues`
- **Publish**: `cd langchain && pip install build && python -m build && twine upload dist/*`

## Agent Question Suggestion Loop
1. **Auto-capture**: 0-result queries on `/api/v1/query` are auto-recorded as suggestions (`source_channel: auto_capture`)
2. **Explicit submit**: Agents call `POST /api/v1/suggest` (or MCP `suggest_question`, n8n "Suggest Question", LangChain `suggest_question()`)
3. **Reconcile import**: `reconcile.js` pulls suggestions with >= 3 occurrences into `tracker.md` as pending rows, marks them `approved` in DB
4. **Card creation**: `/create-card` picks up pending rows → publishes new unit → agent gets an answer next time

The `discovered_questions` table tracks: `question_text`, `normalized_text`, `occurrence_count`, `source_channel` (auto_capture/api_suggest/mcp/n8n/langchain), `agent_type`, `status` (pending/approved/rejected/created), `domain_hint`, `context`. Upserts are atomic via `upsert_question_suggestion()` SECURITY DEFINER RPC.

## Content Feedback Loop
1. **Report**: Agents call `POST /api/v1/feedback` (or MCP `report_issue`, n8n "Report Issue", LangChain `report_issue()`)
2. **Browse**: Agents call `GET /api/v1/feedback?card_id=...&status=open` to check if a card has known issues
3. **Reconcile flagging**: `reconcile.js` flags cards with >= 3 open reports or any `critical` severity feedback in console output
4. **Catalog exposure**: `catalog.json` and query API responses include `open_issues` count per unit

## Discovery
- **AI manifest**: `https://knowledgelib.io/.well-known/ai-knowledge.json` (v1.1) — auto-generated by reconcile with live unit_count, domains, entity_types, filters (region, jurisdiction, entity_type), capabilities (temporal_validity, jurisdiction_filtering, region_filtering, entity_type_filtering, content_feedback, question_suggestions), `mcp_install`, `suggest_api`, `feedback_api`
- **Catalog**: `https://knowledgelib.io/catalog.json` (v1.1) — full machine-readable unit index with `entity_type`, `region`, `jurisdiction`, `temporal_status`, `open_issues` per unit
