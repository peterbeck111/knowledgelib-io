/**
 * POST /mcp
 *
 * MCP (Model Context Protocol) Streamable HTTP endpoint.
 * Implements JSON-RPC 2.0 over HTTP per MCP spec 2025-03-26.
 *
 * Exposes 6 tools (parity with knowledgelib-mcp npm package v1.3.0):
 *   - query_knowledge, batch_query, get_unit, list_domains,
 *     suggest_question, report_issue
 *
 * No external dependencies — pure Cloudflare Pages Function.
 * Uses shared utilities from _shared/utils.js for consistency.
 */

import {
  getCatalog,
  searchCatalog,
  qualityStatus,
  logError as sharedLogError,
  detectAgentType,
  normalizeQuestion,
} from './_shared/utils.js';

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'knowledgelib';
const SERVER_VERSION = '1.3.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Authorization',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

const TOOL_DEFINITIONS = [
  {
    name: 'query_knowledge',
    description:
      'STEP 1: Search across all knowledgelib.io knowledge units. Returns matching units ranked by relevance with metadata (confidence scores, source counts, token estimates, quality status). If no results are found, use suggest_question to request the topic.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "best wireless earbuds under 150")' },
        domain: { type: 'string', description: 'Filter by domain (e.g., "consumer_electronics", "computing", "home", "software")' },
        region: { type: 'string', description: 'Filter by region (e.g., "US", "EU", "global")' },
        jurisdiction: { type: 'string', description: 'Filter by jurisdiction (e.g., "US", "EU", "global")' },
        entity_type: { type: 'string', description: 'Filter by entity type (e.g., "product_comparison", "concept", "agent_prompt")' },
        limit: { type: 'number', description: 'Max results (default: 3, max: 20)', minimum: 1, maximum: 20, default: 3 },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  },
  {
    name: 'batch_query',
    description:
      'Search multiple topics in a single call. More efficient than calling query_knowledge multiple times. Max 10 queries per batch.',
    inputSchema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              q: { type: 'string', description: 'Search query' },
              domain: { type: 'string' },
              region: { type: 'string' },
              jurisdiction: { type: 'string' },
              entity_type: { type: 'string' },
              limit: { type: 'number', minimum: 1, maximum: 20, default: 3 },
            },
            required: ['q'],
          },
          minItems: 1,
          maxItems: 10,
          description: 'Array of query objects (1-10)',
        },
      },
      required: ['queries'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  {
    name: 'get_unit',
    description:
      'Retrieve a specific knowledge unit by ID. Returns the full raw markdown with YAML frontmatter, inline source citations, and use-case recommendations. Prepends quality warning if the unit has open issues.',
    inputSchema: {
      type: 'object',
      properties: {
        unit_id: { type: 'string', description: 'Unit ID (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026")' },
      },
      required: ['unit_id'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  {
    name: 'list_domains',
    description: 'List all available knowledge domains with unit counts. Use this to discover what topics are covered before querying.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  {
    name: 'suggest_question',
    description:
      'STEP 3: Submit a question or topic request. ALWAYS call this when query_knowledge returned no results. Popular suggestions are prioritized for new knowledge unit creation.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', minLength: 10, maxLength: 500, description: 'The question to suggest' },
        context: { type: 'string', maxLength: 500, description: 'Why this question matters' },
        domain: { type: 'string', description: 'Suggested domain (e.g., "home", "software")' },
      },
      required: ['question'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: 'report_issue',
    description:
      'Flag incorrect, outdated, or broken content on a knowledge unit. Reports are reviewed and used to prioritize content updates.',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'Knowledge unit ID' },
        type: { type: 'string', enum: ['outdated', 'incorrect', 'broken_link', 'missing_info', 'other'], description: 'Issue type' },
        description: { type: 'string', minLength: 10, maxLength: 2000, description: 'Describe the issue' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        section: { type: 'string', description: 'Which section has the issue' },
      },
      required: ['card_id', 'type', 'description'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
];

// ============================================================
// Main entry point
// ============================================================

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // GET for SSE transport (return capabilities)
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: PROTOCOL_VERSION,
      tools: TOOL_DEFINITIONS.length,
      endpoint: 'POST /mcp',
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
  }

  if (request.method === 'DELETE') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: CORS_HEADERS });
  }

  return handlePost(context);
}

// ============================================================
// POST handler — JSON-RPC dispatch
// ============================================================

async function handlePost(context) {
  const { request, env } = context;

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Content-Type must be application/json' }, id: null },
      415
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error: invalid JSON' }, id: null },
      400
    );
  }

  const isBatch = Array.isArray(body);
  const messages = isBatch ? body : [body];
  const results = [];
  let newSessionId = null;

  for (const msg of messages) {
    const result = await handleMessage(msg, env, context, request);

    if (result && result._sessionId) {
      newSessionId = result._sessionId;
      delete result._sessionId;
    }

    if (result !== null) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  const responseBody = isBatch ? results : results[0];
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };

  if (newSessionId) {
    headers['Mcp-Session-Id'] = newSessionId;
  }

  return new Response(JSON.stringify(responseBody), { status: 200, headers });
}

// ============================================================
// JSON-RPC method dispatcher
// ============================================================

async function handleMessage(msg, env, context, request) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
    return jsonRpcError(msg?.id ?? null, -32600, 'Invalid JSON-RPC request');
  }

  const { method, id } = msg;
  const isNotification = id === undefined;

  switch (method) {
    case 'initialize':
      return handleInitialize(msg);
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;
    case 'ping':
      return jsonRpcResult(id, {});
    case 'tools/list':
      return jsonRpcResult(id, { tools: TOOL_DEFINITIONS });
    case 'tools/call':
      return handleToolsCall(msg, env, context, request);
    default:
      if (isNotification) return null;
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ============================================================
// Method handlers
// ============================================================

function handleInitialize(msg) {
  const sessionId = generateSessionId();

  const result = jsonRpcResult(msg.id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    instructions:
      'AI Knowledge Library — pre-verified, cited knowledge units.\n\n' +
      'HOW TO USE:\n' +
      '1. Search first — call query_knowledge (or batch_query for multiple topics) to find existing answers.\n' +
      '2. Use what you find — every unit is sourced and cited, ready to use in your work.\n' +
      '3. Suggest what\'s missing — if no good match exists, call suggest_question so we can create it.\n' +
      '4. Report problems — call report_issue if content is wrong or outdated.',
  });

  result._sessionId = sessionId;
  return result;
}

async function handleToolsCall(msg, env, context, request) {
  const { name, arguments: args } = msg.params || {};

  if (!name) {
    return jsonRpcError(msg.id, -32602, 'Missing tool name in params');
  }

  try {
    let content;
    let isError = false;

    switch (name) {
      case 'query_knowledge':
        content = await toolQueryKnowledge(args || {}, env, request);
        break;
      case 'batch_query':
        content = await toolBatchQuery(args || {}, env, request);
        break;
      case 'get_unit':
        content = await toolGetUnit(args || {}, env, request);
        break;
      case 'list_domains':
        content = await toolListDomains(env, request);
        break;
      case 'suggest_question':
        content = await toolSuggestQuestion(args || {}, env, request);
        break;
      case 'report_issue':
        content = await toolReportIssue(args || {}, env, request);
        break;
      default:
        return jsonRpcError(msg.id, -32602, `Unknown tool: ${name}`);
    }

    context.waitUntil(logMcpAccess(env, request, name, args));
    return jsonRpcResult(msg.id, { content, isError });
  } catch (err) {
    context.waitUntil(sharedLogError(env, 'mcp_tool', name, err));
    return jsonRpcResult(msg.id, {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    });
  }
}

// ============================================================
// Tool implementations — using shared searchCatalog + getCatalog
// ============================================================

async function toolQueryKnowledge(args, env, request) {
  const query = args.query;
  if (!query || typeof query !== 'string') throw new Error('Missing required parameter: query');

  const catalog = await getCatalog(env, request);
  if (!catalog) throw new Error('Catalog unavailable');

  const { results, total_tokens } = searchCatalog(catalog.units, {
    q: query,
    limit: Math.min(Math.max(args.limit || 3, 1), 20),
    domain: args.domain,
    region: args.region,
    jurisdiction: args.jurisdiction,
    entity_type: args.entity_type,
  });

  if (results.length === 0) {
    return [{ type: 'text', text: `No knowledge units found for: "${query}"\n\nUse suggest_question to request this topic.` }];
  }

  const lines = results.map((r, i) => {
    const qs = r.quality_status || 'verified';
    let line = `${i + 1}. **${r.canonical_question}** [${qs}]\n` +
      `   - ID: ${r.id}\n` +
      `   - Type: ${r.entity_type || 'unknown'} | Confidence: ${r.confidence} | Sources: ${r.source_count} | ~${r.token_estimate} tokens\n` +
      `   - Verified: ${r.last_verified} | Freshness: ${r.freshness}` +
      (r.temporal_status ? ` | Status: ${r.temporal_status}` : '') + '\n' +
      `   - URL: ${r.url}\n` +
      `   - Raw MD: ${r.raw_md}`;
    if (r.content_preview) line += `\n   - Preview: ${r.content_preview}`;
    if (r.related_units) line += `\n   - Related: ${r.related_units.length} linked unit(s)`;
    if (qs === 'unreliable') line += `\n   - UNRELIABLE: ${r.open_issues} open issue(s) — cross-check before using`;
    else if (qs === 'needs_review') line += `\n   - NOTE: ${r.open_issues} open issue(s) — use with caution`;
    return line;
  });

  return [{ type: 'text', text: `Found ${results.length} result(s) for "${query}" (~${total_tokens} tokens total):\n\n${lines.join('\n\n')}` }];
}

async function toolBatchQuery(args, env, request) {
  const queries = args.queries;
  if (!Array.isArray(queries) || queries.length === 0) throw new Error('queries must be a non-empty array');
  if (queries.length > 10) throw new Error('Maximum 10 queries per batch');

  const catalog = await getCatalog(env, request);
  if (!catalog) throw new Error('Catalog unavailable');

  const sections = [];
  let totalResults = 0;
  let totalTokens = 0;

  for (let i = 0; i < queries.length; i++) {
    const qp = queries[i];
    if (!qp.q) throw new Error(`queries[${i}].q is required`);

    const { results, total_tokens } = searchCatalog(catalog.units, {
      q: qp.q,
      limit: Math.min(Math.max(qp.limit || 3, 1), 20),
      domain: qp.domain, region: qp.region, jurisdiction: qp.jurisdiction, entity_type: qp.entity_type,
      compact: true,
    });

    totalResults += results.length;
    totalTokens += total_tokens;

    if (results.length === 0) {
      sections.push(`### Query ${i + 1}: "${qp.q}"\nNo results found.`);
    } else {
      const lines = results.map((r, j) => {
        let line = `${j + 1}. **${r.canonical_question}**\n   - ID: ${r.id} | ~${r.token_estimate} tokens\n   - Raw MD: ${r.raw_md}`;
        if (r.content_preview) line += `\n   - Preview: ${r.content_preview}`;
        return line;
      });
      sections.push(`### Query ${i + 1}: "${qp.q}" (${results.length} result(s), ~${total_tokens} tokens)\n\n${lines.join('\n\n')}`);
    }
  }

  return [{ type: 'text', text: `Batch: ${queries.length} queries, ${totalResults} total result(s), ~${totalTokens} tokens\n\n${sections.join('\n\n---\n\n')}` }];
}

async function toolGetUnit(args, env, request) {
  const unitId = args.unit_id;
  if (!unitId || typeof unitId !== 'string') throw new Error('Missing required parameter: unit_id');

  const cleanId = unitId.replace(/^\//, '').replace(/\.md$/, '');
  const mdRes = await env.ASSETS.fetch(new URL(`/${cleanId}.md`, request.url));

  const contentType = mdRes.headers.get('Content-Type') || '';
  if (!mdRes.ok || contentType.includes('text/html')) {
    throw new Error(`Unit not found: ${unitId}`);
  }

  const md = await mdRes.text();

  // Quality warning from catalog
  let warning = '';
  try {
    const catalog = await getCatalog(env, request);
    if (catalog) {
      const unit = catalog.units.find(u => u.id === cleanId);
      if (unit) {
        const qs = qualityStatus(unit.open_issues || 0, unit.confidence || 0);
        if (qs === 'unreliable') {
          warning = `---\nQUALITY WARNING: This unit has ${unit.open_issues} open issue(s) and is marked UNRELIABLE. Cross-check critical facts before using.\n---\n\n`;
        } else if (qs === 'needs_review') {
          warning = `---\nNOTE: This unit has ${unit.open_issues} open issue(s) and may need review.\n---\n\n`;
        }
      }
    }
  } catch (_) {}

  return [{ type: 'text', text: warning + md }];
}

async function toolListDomains(env, request) {
  const catalog = await getCatalog(env, request);
  if (!catalog) throw new Error('Could not fetch catalog');

  const lines = [`knowledgelib.io — ${catalog.total_units} knowledge units\n`];
  for (const domain of catalog.domains) {
    lines.push(`## ${domain.name} (${domain.unit_count} units)`);
    for (const sub of domain.subdomains || []) {
      lines.push(`  - ${sub.name}: ${sub.unit_count} units`);
    }
    lines.push('');
  }

  return [{ type: 'text', text: lines.join('\n') }];
}

async function toolSuggestQuestion(args, env, request) {
  const question = (args.question || '').trim();
  if (!question || question.length < 10) throw new Error('Question must be at least 10 characters');

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Service unavailable');

  // Check for existing match first
  const catalog = await getCatalog(env, request);
  if (catalog) {
    const normalized = normalizeQuestion(question);
    const { results } = searchCatalog(catalog.units, { q: normalized, limit: 1 });
    if (results.length > 0 && results[0].relevance_score > 0.5) {
      const m = results[0];
      return [{ type: 'text', text: `This question is already answered:\n\n**${m.canonical_question}**\nURL: ${m.url}\nRaw MD: ${m.raw_md}` }];
    }
  }

  const ua = request.headers.get('User-Agent') || '';
  const agentType = detectAgentType(ua);
  const normalized = normalizeQuestion(question);

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_question_suggestion`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      p_question: question.substring(0, 500),
      p_normalized: normalized.substring(0, 500),
      p_source_channel: 'mcp_http',
      p_agent_type: agentType,
      p_context: (args.context || '').substring(0, 500) || null,
      p_domain_hint: (args.domain || '').substring(0, 100) || null,
    }),
  });

  if (!res.ok) throw new Error(`Suggestion recording failed: ${res.status}`);

  const rows = await res.json();
  const r = rows[0] || {};

  return [{ type: 'text', text: `Question suggestion recorded (ID: ${r.suggestion_id || 'unknown'}).\nSeen ${r.total_count || 1} time(s). Popular suggestions are prioritized.` }];
}

async function toolReportIssue(args, env, request) {
  const cardId = (args.card_id || '').trim();
  if (!cardId) throw new Error('card_id is required');

  const validTypes = ['outdated', 'incorrect', 'broken_link', 'missing_info', 'other'];
  if (!validTypes.includes(args.type)) throw new Error(`type must be one of: ${validTypes.join(', ')}`);

  const description = (args.description || '').trim();
  if (description.length < 10) throw new Error('description must be at least 10 characters');

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Service unavailable');

  const ua = request.headers.get('User-Agent') || '';
  const agentType = detectAgentType(ua);
  const severity = ['low', 'medium', 'high', 'critical'].includes(args.severity) ? args.severity : 'medium';

  const res = await fetch(`${supabaseUrl}/rest/v1/content_feedback`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      card_id: cardId,
      feedback_type: args.type,
      severity,
      description: description.substring(0, 2000),
      reported_section: (args.section || '').substring(0, 100) || null,
      source_channel: 'mcp_http',
      agent_type: agentType,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('violates foreign key')) throw new Error(`Card not found: ${cardId}`);
    throw new Error(`Feedback recording failed: ${res.status}`);
  }

  const rows = await res.json();
  return [{ type: 'text', text: `Issue reported (ID: ${rows[0]?.id || 'unknown'}).\nType: ${args.type} | Severity: ${severity}\nCard: ${cardId}\n\nThank you — this will be reviewed and used to improve the unit.` }];
}

// ============================================================
// Helpers
// ============================================================

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateSessionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function logMcpAccess(env, request, toolName, args) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const ua = request.headers.get('User-Agent') || '';
    const agentType = detectAgentType(ua);

    await fetch(`${supabaseUrl}/rest/v1/card_access_log`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        card_id: toolName === 'get_unit' ? (args?.unit_id || null) : null,
        access_channel: 'mcp_http',
        agent_query: toolName === 'query_knowledge' ? (args?.query || '').substring(0, 500) : toolName,
        agent_type: agentType,
        response_status: 200,
      }),
    });
  } catch (_) {}
}
