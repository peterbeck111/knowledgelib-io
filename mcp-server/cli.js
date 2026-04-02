#!/usr/bin/env node

/**
 * knowledgelib-mcp — MCP server for knowledgelib.io
 *
 * Provides five tools for AI agents:
 *   - query_knowledge: Search across all knowledge units (with region/jurisdiction/entity_type filters)
 *   - get_unit: Retrieve a specific knowledge unit as raw markdown
 *   - list_domains: List all available domains and unit counts
 *   - suggest_question: Submit a question or topic request for new card creation
 *   - report_issue: Flag incorrect, outdated, or broken content on a knowledge unit
 *
 * Usage:
 *   npx knowledgelib-mcp
 *
 * Environment:
 *   KNOWLEDGELIB_URL     — API base URL (default: https://knowledgelib.io)
 *   KNOWLEDGELIB_API_KEY — API key (optional for free tier)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.KNOWLEDGELIB_URL || 'https://knowledgelib.io';
const API_KEY = process.env.KNOWLEDGELIB_API_KEY || '';

const server = new McpServer({
  name: 'knowledgelib',
  version: '1.3.0',
  description:
    'AI Knowledge Library — pre-verified, cited knowledge units.\n\n' +
    'HOW TO USE:\n' +
    '1. Search first — call query_knowledge (or batch_query for multiple topics) to find existing answers.\n' +
    '2. Use what you find — every unit is sourced and cited, ready to use in your work.\n' +
    '3. Suggest what\'s missing — if no good match exists, call suggest_question so we can create it. Popular suggestions are prioritized.\n' +
    '4. Report problems — call report_issue if content is wrong or outdated.',
});

// --- Tool: query_knowledge ---
server.tool(
  'query_knowledge',
  'STEP 1: Search across all knowledgelib.io knowledge units. Returns matching units ranked by relevance with metadata (confidence scores, source counts, token estimates). If no results are found, use suggest_question to request the topic.',
  {
    query: z.string().describe('Search query (e.g., "best wireless earbuds under 150")'),
    domain: z.string().optional().describe('Filter by domain (e.g., "consumer_electronics", "computing", "home", "fitness", "software")'),
    region: z.string().optional().describe('Filter by region (e.g., "US", "EU", "global"). Units with region "global" always match.'),
    jurisdiction: z.string().optional().describe('Filter by jurisdiction (e.g., "US", "EU", "UK", "global"). Relevant for energy, legal, compliance content.'),
    entity_type: z.string().optional().describe('Filter by entity type (e.g., "product_comparison", "software_reference", "fact", "concept", "rule")'),
    limit: z.number().min(1).max(20).default(3).describe('Max results to return (default: 3)'),
  },
  { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  async ({ query, domain, region, jurisdiction, entity_type, limit }) => {
    const params = new URLSearchParams({ q: query, limit: String(limit || 3) });
    if (domain) params.set('domain', domain);
    if (region) params.set('region', region);
    if (jurisdiction) params.set('jurisdiction', jurisdiction);
    if (entity_type) params.set('entity_type', entity_type);

    const url = `${BASE_URL}/api/v1/query?${params}`;
    const res = await fetchApi(url);

    if (!res.ok) {
      const errData = await safeParseError(res);
      return { content: [{ type: 'text', text: `Error: API returned ${res.status}${errData.retryable ? ' (retryable)' : ''} — ${errData.message}` }], isError: true };
    }

    const data = await res.json();

    if (data.results.length === 0) {
      let msg = `No knowledge units found for: "${query}"`;
      if (data.suggestion_recorded) {
        msg += '\n\nYour query has been automatically recorded as a topic suggestion. ' +
          'You can also use the suggest_question tool to explicitly request this topic.';
      }
      return { content: [{ type: 'text', text: msg }] };
    }

    const lines = data.results.map((r, i) => {
      const qs = r.quality_status || (r.open_issues >= 3 ? 'unreliable' : r.open_issues >= 1 ? 'needs_review' : 'verified');
      let line = `${i + 1}. **${r.canonical_question}** [${qs}]\n` +
        `   - ID: ${r.id}\n` +
        `   - Type: ${r.entity_type || 'unknown'} | Confidence: ${r.confidence} | Sources: ${r.source_count} | ~${r.token_estimate} tokens\n` +
        `   - Verified: ${r.last_verified} | Freshness: ${r.freshness}` +
        (r.temporal_status ? ` | Status: ${r.temporal_status}` : '') + '\n' +
        `   - URL: ${r.url}\n` +
        `   - Raw MD: ${r.raw_md}`;
      if (r.content_preview) {
        line += `\n   - Preview: ${r.content_preview}`;
      }
      if (qs === 'unreliable') {
        line += `\n   - UNRELIABLE: ${r.open_issues} open issue(s) — cross-check before using`;
      } else if (qs === 'needs_review') {
        line += `\n   - NOTE: ${r.open_issues} open issue(s) — use with caution`;
      }
      return line;
    });

    let summary = `Found ${data.total_results} result(s) for "${query}"`;
    if (data.total_tokens) {
      summary += ` (~${data.total_tokens} tokens total if all fetched)`;
    }

    return {
      content: [{
        type: 'text',
        text: `${summary}:\n\n${lines.join('\n\n')}`,
      }],
    };
  }
);

// --- Tool: batch_query ---
server.tool(
  'batch_query',
  'Search multiple topics in a single call. More efficient than calling query_knowledge multiple times — shares a single catalog parse. Max 10 queries per batch.',
  {
    queries: z.array(z.object({
      q: z.string().describe('Search query'),
      domain: z.string().optional().describe('Filter by domain'),
      region: z.string().optional().describe('Filter by region'),
      jurisdiction: z.string().optional().describe('Filter by jurisdiction'),
      entity_type: z.string().optional().describe('Filter by entity type'),
      limit: z.number().min(1).max(20).default(3).optional().describe('Max results per query (default: 3)'),
    })).min(1).max(10).describe('Array of query objects (1-10)'),
  },
  { readOnlyHint: true, idempotentHint: true },
  async ({ queries }) => {
    const res = await fetchApi(`${BASE_URL}/api/v1/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });

    if (!res.ok) {
      const errData = await safeParseError(res);
      return { content: [{ type: 'text', text: `Error: ${errData.message}` }], isError: true };
    }

    const data = await res.json();

    const sections = data.results.map((r, i) => {
      if (r.total_results === 0) {
        return `### Query ${i + 1}: "${r.query}"\nNo results found.`;
      }
      const lines = r.results.map((item, j) => {
        let line = `${j + 1}. **${item.canonical_question}**\n` +
          `   - ID: ${item.id} | ~${item.token_estimate} tokens\n` +
          `   - Raw MD: ${item.raw_md}`;
        if (item.content_preview) line += `\n   - Preview: ${item.content_preview}`;
        if (item.open_issues > 0) line += `\n   - WARNING: ${item.open_issues} open issue(s)`;
        return line;
      });
      return `### Query ${i + 1}: "${r.query}" (${r.total_results} result(s), ~${r.total_tokens} tokens)\n\n${lines.join('\n\n')}`;
    });

    return {
      content: [{
        type: 'text',
        text: `Batch: ${data.batch_size} queries, ${data.total_results} total result(s), ~${data.total_tokens} tokens\n\n${sections.join('\n\n---\n\n')}`,
      }],
    };
  }
);

// --- Tool: get_unit ---
server.tool(
  'get_unit',
  'Retrieve a specific knowledge unit by ID. Returns the full raw markdown with YAML frontmatter, inline source citations, product comparisons, and use-case recommendations.',
  {
    unit_id: z.string().describe('Unit ID (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026")'),
  },
  { readOnlyHint: true, idempotentHint: true },
  async ({ unit_id }) => {
    const url = `${BASE_URL}/api/v1/units/${unit_id}.md`;
    const res = await fetchApi(url);

    if (!res.ok) {
      const errData = await safeParseError(res);
      return { content: [{ type: 'text', text: `Error: ${errData.message}` }], isError: true };
    }

    const md = await res.text();

    // Check catalog for quality warnings on this unit
    let warning = '';
    try {
      const catalogRes = await fetchApi(`${BASE_URL}/api/v1/query?q=${encodeURIComponent(unit_id)}&limit=1`);
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        const match = data.results?.find(r => r.id === unit_id);
        if (match) {
          const qs = match.quality_status || (match.open_issues >= 3 ? 'unreliable' : match.open_issues >= 1 ? 'needs_review' : 'verified');
          if (qs === 'unreliable') {
            warning = `\n\n---\nQUALITY WARNING: This unit has ${match.open_issues} open issue(s) and is marked UNRELIABLE. Cross-check critical facts before using.\n---\n`;
          } else if (qs === 'needs_review') {
            warning = `\n\n---\nNOTE: This unit has ${match.open_issues} open issue(s) and may need review.\n---\n`;
          }
        }
      }
    } catch (_) {
      // Non-fatal — skip quality check
    }

    return { content: [{ type: 'text', text: warning + md }] };
  }
);

// --- Tool: list_domains ---
server.tool(
  'list_domains',
  'List all available knowledge domains with unit counts. Use this to discover what topics are covered before querying.',
  {},
  { readOnlyHint: true, idempotentHint: true },
  async () => {
    const url = `${BASE_URL}/catalog.json`;
    const res = await fetchApi(url);

    if (!res.ok) {
      return { content: [{ type: 'text', text: 'Error: Could not fetch catalog' }], isError: true };
    }

    const catalog = await res.json();

    const lines = [`knowledgelib.io — ${catalog.total_units} knowledge units\n`];

    for (const domain of catalog.domains) {
      lines.push(`## ${domain.name} (${domain.unit_count} units)`);
      for (const sub of domain.subdomains || []) {
        lines.push(`  - ${sub.name}: ${sub.unit_count} units`);
      }
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// --- Tool: suggest_question ---
server.tool(
  'suggest_question',
  'STEP 3: Submit a question or topic request to knowledgelib.io. ' +
  'ALWAYS call this when query_knowledge returned no results, ' +
  'or when a user asks about a topic that should be covered. ' +
  'Popular suggestions are prioritized for new knowledge unit creation. ' +
  'The next agent that asks the same question will get an answer.',
  {
    question: z.string().min(10).max(500).describe(
      'The question to suggest (e.g., "What are the best robot vacuums under $500 in 2026?")'
    ),
    context: z.string().max(500).optional().describe(
      'Why this question matters or what triggered it'
    ),
    domain: z.string().optional().describe(
      'Suggested domain (e.g., "home", "consumer_electronics", "software")'
    ),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  async ({ question, context, domain }) => {
    const body = { question };
    if (context) body.context = context;
    if (domain) body.domain = domain;

    const res = await fetchApi(`${BASE_URL}/api/v1/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await safeParseError(res);
      return { content: [{ type: 'text', text: `Error: ${errData.message}` }], isError: true };
    }

    const data = await res.json();

    if (data.status === 'already_answered') {
      return {
        content: [{
          type: 'text',
          text: `This question is already answered:\n\n` +
            `**${data.existing_match.canonical_question}**\n` +
            `URL: ${data.existing_match.url}\n` +
            `Raw MD: ${data.existing_match.raw_md}`,
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Question suggestion recorded (ID: ${data.suggestion_id}).\n` +
          `Seen ${data.occurrence_count} time(s). ` +
          `Popular suggestions are prioritized for new knowledge unit creation.`,
      }],
    };
  }
);

// --- Tool: report_issue ---
server.tool(
  'report_issue',
  'Flag incorrect, outdated, or broken content on a knowledge unit. ' +
  'Use this when you notice factual errors, dead links, outdated information, or missing details in a knowledge unit. ' +
  'Reports are reviewed and used to prioritize content updates.',
  {
    card_id: z.string().describe(
      'The knowledge unit ID (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026")'
    ),
    type: z.enum(['outdated', 'incorrect', 'broken_link', 'missing_info', 'other']).describe(
      'Type of issue: outdated (info no longer current), incorrect (factual error), broken_link (dead URL), missing_info (important gap), other'
    ),
    description: z.string().min(10).max(2000).describe(
      'Describe the issue (10-2000 chars). Be specific: what is wrong and what the correct information should be.'
    ),
    severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium').describe(
      'Severity: low (cosmetic), medium (misleading detail), high (significantly wrong), critical (dangerous advice)'
    ),
    section: z.string().optional().describe(
      'Which section of the unit has the issue (e.g., "Quick Reference", "Code Examples", "Decision Logic")'
    ),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  async ({ card_id, type, description, severity, section }) => {
    const body = { card_id, type, description, severity: severity || 'medium' };
    if (section) body.section = section;

    const res = await fetchApi(`${BASE_URL}/api/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await safeParseError(res);
      return { content: [{ type: 'text', text: `Error: ${errData.message}` }], isError: true };
    }

    const data = await res.json();

    return {
      content: [{
        type: 'text',
        text: `Issue reported successfully (ID: ${data.feedback_id}).\n` +
          `Type: ${type} | Severity: ${severity || 'medium'}\n` +
          `Card: ${card_id}\n\n` +
          `Thank you — this report will be reviewed and used to improve the knowledge unit.`,
      }],
    };
  }
);

// --- Helpers ---

/**
 * Parse structured error response from the API.
 * Falls back gracefully if the response is not JSON or uses the old format.
 */
async function safeParseError(res) {
  try {
    const data = await res.json();
    if (data.error && typeof data.error === 'object') {
      return {
        code: data.error.code || 'UNKNOWN',
        message: data.error.message || `HTTP ${res.status}`,
        retryable: data.error.retryable || false,
        retry_after_ms: data.error.retry_after_ms || null,
      };
    }
    // Old-style string error
    return { code: 'UNKNOWN', message: data.error || `HTTP ${res.status}`, retryable: false };
  } catch (_) {
    return { code: 'UNKNOWN', message: `HTTP ${res.status}`, retryable: false };
  }
}

async function fetchApi(url, options = {}) {
  const headers = {
    'Accept': 'application/json, text/markdown',
    'User-Agent': 'knowledgelib-mcp/1.3.0',
    ...(options.headers || {}),
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  return fetch(url, { ...options, headers });
}

// --- Start server ---

const transport = new StdioServerTransport();
await server.connect(transport);
