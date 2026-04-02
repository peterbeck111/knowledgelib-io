/**
 * Shared utilities for knowledgelib.io API functions.
 *
 * Single source of truth for: CORS, JSON responses, agent detection,
 * access/error logging, IP hashing, question normalization, and
 * structured error codes.
 */

// ============================================================
// CORS
// ============================================================

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function corsPreflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ============================================================
// Structured Error Codes (A6)
// ============================================================

/**
 * Error code definitions with default status, retryable flag, and retry hint.
 */
const ERROR_CODES = {
  INVALID_QUERY:        { status: 400, retryable: false },
  INVALID_BODY:         { status: 400, retryable: false },
  INVALID_PARAMETER:    { status: 400, retryable: false },
  METHOD_NOT_ALLOWED:   { status: 405, retryable: false },
  UNIT_NOT_FOUND:       { status: 404, retryable: false },
  CARD_NOT_FOUND:       { status: 404, retryable: false },
  CATALOG_UNAVAILABLE:  { status: 503, retryable: true,  retry_after_ms: 5000 },
  DB_UNAVAILABLE:       { status: 503, retryable: true,  retry_after_ms: 5000 },
  RATE_LIMITED:         { status: 429, retryable: true,  retry_after_ms: 60000 },
  INTERNAL_ERROR:       { status: 500, retryable: true,  retry_after_ms: 2000 },
};

/**
 * Build a structured error response.
 *
 * @param {string} code - Error code key from ERROR_CODES
 * @param {string} message - Human-readable description
 * @param {object} [extraHeaders] - Additional response headers
 * @returns {Response}
 */
export function errorResponse(code, message, extraHeaders = {}) {
  const def = ERROR_CODES[code] || ERROR_CODES.INTERNAL_ERROR;
  const body = {
    error: {
      code,
      message,
      retryable: def.retryable,
    },
  };
  if (def.retry_after_ms) {
    body.error.retry_after_ms = def.retry_after_ms;
  }
  return new Response(JSON.stringify(body, null, 2), {
    status: def.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// ============================================================
// JSON Response
// ============================================================

/**
 * Standard JSON response with CORS headers.
 */
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// ============================================================
// Agent Detection
// ============================================================

/**
 * Detect the agent type from User-Agent header.
 * This is the canonical version — all API endpoints must use this.
 */
export function detectAgentType(ua) {
  if (!ua) return 'unknown';
  // First-party clients (custom User-Agent)
  if (/knowledgelib-mcp/i.test(ua)) return 'mcp';
  if (/knowledgelib-n8n/i.test(ua)) return 'n8n';
  if (/knowledgelib-langchain/i.test(ua)) return 'langchain';
  // AI agents
  if (/chatgpt-user|openai/i.test(ua)) return 'chatgpt';
  if (/claude-web|anthropic/i.test(ua)) return 'claude';
  if (/perplexitybot|perplexity/i.test(ua)) return 'perplexity';
  if (/gemini|google-extended/i.test(ua)) return 'gemini';
  if (/copilot/i.test(ua)) return 'copilot';
  // Generic clients that hint at SDK usage
  if (/n8n/i.test(ua)) return 'n8n';
  if (/python-requests|aiohttp/i.test(ua)) return 'langchain';
  // Search engine bots
  if (/googlebot|bingbot|yandexbot|duckduckbot/i.test(ua)) return 'search_bot';
  if (/gptbot/i.test(ua)) return 'gptbot';
  // Generic
  if (/bot|crawler|spider/i.test(ua)) return 'bot';
  if (/mozilla|chrome|safari|firefox|edge/i.test(ua)) return 'browser';
  return 'unknown';
}

/**
 * Map agent type → access channel for card_access_log.
 * @param {string} agentType - Result from detectAgentType()
 * @param {string} [fallback='api'] - Default channel when no match
 */
export function detectAccessChannel(agentType, fallback = 'api') {
  if (agentType === 'mcp') return 'mcp';
  if (agentType === 'n8n') return 'n8n';
  if (agentType === 'langchain') return 'langchain';
  return fallback;
}

// ============================================================
// Question Normalization
// ============================================================

/**
 * Normalize a question string for deduplication.
 */
export function normalizeQuestion(q) {
  return q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.]+$/, '')
    .replace(/[""'']/g, '')
    .trim();
}

// ============================================================
// IP Hashing
// ============================================================

/**
 * Hash an IP address with SHA-256 for privacy-safe logging.
 * @param {string} ip - Raw IP address
 * @returns {Promise<string|null>} Hex-encoded hash, or null if no IP
 */
export async function hashIp(ip) {
  if (!ip) return null;
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ip)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================
// Logging
// ============================================================

/**
 * Log an error to pipeline_log (fire-and-forget).
 */
export async function logError(env, operation, contextId, err) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/rest/v1/pipeline_log`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        operation,
        status: 'failed',
        error_message: err.message || String(err),
        error_stack: err.stack || null,
        detail: { context_id: contextId },
        completed_at: new Date().toISOString(),
      }),
    });
  } catch (_) {
    // Fire-and-forget
  }
}

/**
 * Log an access event to card_access_log (fire-and-forget).
 */
export async function logAccess(env, request, {
  cardId = null,
  query: agentQuery = null,
  resultCount = null,
  responseStatus = 200,
} = {}) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const ua = request.headers.get('User-Agent') || '';
    const agentType = detectAgentType(ua);
    const accessChannel = detectAccessChannel(agentType);

    const ip = request.headers.get('CF-Connecting-IP') || '';
    const ipHash = await hashIp(ip);
    const cfData = request.cf || {};

    await fetch(`${supabaseUrl}/rest/v1/card_access_log`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        card_id: cardId,
        access_channel: accessChannel,
        http_method: request.method,
        agent_query: agentQuery ? agentQuery.substring(0, 500) : null,
        referer: (request.headers.get('Referer') || '').substring(0, 2000) || null,
        user_agent: ua.substring(0, 500) || null,
        agent_type: agentType,
        ip_hash: ipHash,
        country_code: cfData.country || null,
        response_status: responseStatus ?? (resultCount > 0 ? 200 : 404),
      }),
    });
  } catch (_) {
    // Fire-and-forget
  }
}

// ============================================================
// ETag Helpers (A4)
// ============================================================

/**
 * Compute a short ETag from string content using SHA-256.
 * @param {string} content - Content to hash
 * @returns {Promise<string>} Quoted ETag value (e.g., '"abc123"')
 */
export async function computeEtag(content) {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(content)
  );
  const hex = Array.from(new Uint8Array(hashBuffer).slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `"${hex}"`;
}

/**
 * Check If-None-Match header against an ETag.
 * Returns a 304 response if matched, null otherwise.
 */
export function checkNotModified(request, etag) {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
    return new Response(null, {
      status: 304,
      headers: { 'ETag': etag, ...CORS_HEADERS },
    });
  }
  return null;
}

// ============================================================
// Rate Limiting (B5) — per-IP, in-memory with sliding window
// ============================================================

const _rateLimitBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 3600_000; // 1 hour
const RATE_LIMIT_CLEANUP_INTERVAL = 300_000; // cleanup every 5 min
let _lastCleanup = 0;

/**
 * Check rate limit for a given key (typically IP hash).
 * Uses in-memory counters per Cloudflare isolate (best-effort, not global).
 *
 * @param {string} key - Rate limit key (e.g., hashed IP)
 * @param {number} maxRequests - Max requests per window
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, maxRequests) {
  const now = Date.now();

  // Periodic cleanup of expired buckets
  if (now - _lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    for (const [k, v] of _rateLimitBuckets) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) _rateLimitBuckets.delete(k);
    }
    _lastCleanup = now;
  }

  if (!key) return { allowed: true, remaining: maxRequests, resetMs: 0 };

  let bucket = _rateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    _rateLimitBuckets.set(key, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, maxRequests - bucket.count);
  const resetMs = RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart);

  return {
    allowed: bucket.count <= maxRequests,
    remaining,
    resetMs,
  };
}

// ============================================================
// Catalog Search (shared between query.js and batch.js)
// ============================================================

/**
 * Search the catalog units with scoring, filtering, and result formatting.
 *
 * @param {Array} units - catalog.units array
 * @param {object} params - Search parameters
 * @param {string} params.q - Search query
 * @param {number} [params.limit=10] - Max results
 * @param {string} [params.domain] - Domain filter
 * @param {string} [params.region] - Region filter
 * @param {string} [params.jurisdiction] - Jurisdiction filter
 * @param {string} [params.entity_type] - Entity type filter
 * @returns {{ results: Array, total_tokens: number }}
 */
export function searchCatalog(units, { q, limit = 10, domain, region, jurisdiction, entity_type, compact = false }) {
  const queryLower = q.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

  let scored = units.map(unit => {
    let score = 0;
    const canonical = (unit.canonical_question || '').toLowerCase();
    const aliasesStr = (unit.aliases || []).join(' ').toLowerCase();
    const domainStr = (unit.domain || '').toLowerCase();

    if (canonical === queryLower) score += 100;
    else if (canonical.includes(queryLower)) score += 60;
    else if ((unit.aliases || []).some(a => a.toLowerCase() === queryLower)) score += 80;
    else if (aliasesStr.includes(queryLower)) score += 50;

    for (const word of queryWords) {
      if (canonical.includes(word)) score += 5;
      if (aliasesStr.includes(word)) score += 3;
      if (domainStr.includes(word)) score += 2;
    }

    score += (unit.confidence || 0) * 5;
    return { unit, score };
  });

  if (domain) {
    const domainLower = domain.toLowerCase().replace(/_/g, ' ');
    scored = scored.filter(({ unit }) => {
      const d = (unit.domain || '').toLowerCase().replace(/_/g, ' ').replace(/>/g, ' ');
      return d.includes(domainLower);
    });
  }

  if (region) {
    const regionLower = region.toLowerCase();
    scored = scored.filter(({ unit }) => {
      const r = (unit.region || 'global').toLowerCase();
      return r === regionLower || r === 'global';
    });
  }

  if (jurisdiction) {
    const jurLower = jurisdiction.toLowerCase();
    scored = scored.filter(({ unit }) => {
      const j = (unit.jurisdiction || 'global').toLowerCase();
      return j === jurLower || j === 'global' || j.split('/').map(s => s.trim()).includes(jurLower);
    });
  }

  if (entity_type) {
    const etLower = entity_type.toLowerCase();
    scored = scored.filter(({ unit }) =>
      (unit.entity_type || '').toLowerCase() === etLower
    );
  }

  scored.sort((a, b) => b.score - a.score);

  // Minimum relevance threshold: filters noise (1-2 common word matches)
  // while keeping topically relevant multi-word matches.
  // Noise range: 23-31 (cook pasta → induction cooktops, AI coding → air purifiers)
  // Real matches: 43+ (SAP vs Oracle ERP, build vs buy)
  const MIN_SCORE = 35;
  const results = scored
    .filter(s => s.score >= MIN_SCORE)
    .slice(0, limit)
    .map(({ unit, score }) => formatResult(unit, score, compact));

  const totalTokens = results.reduce((sum, r) => sum + (r.token_estimate || 0), 0);
  return { results, total_tokens: totalTokens };
}

/**
 * Compute quality_status from open_issues count and confidence.
 */
export function qualityStatus(openIssues, confidence) {
  if (openIssues >= 3) return 'unreliable';
  if (openIssues >= 1 || confidence < 0.85) return 'needs_review';
  return 'verified';
}

function formatResult(unit, score, compact = false) {
  const result = {
    id: unit.id,
    canonical_question: unit.canonical_question,
    entity_type: unit.entity_type || null,
    confidence: unit.confidence,
    last_verified: unit.last_verified,
    relevance_score: Math.round(score) / 100,
    url: unit.url,
    raw_md: unit.raw_md,
    token_estimate: unit.token_estimate,
    source_count: unit.source_count,
    freshness: unit.freshness,
    temporal_status: unit.temporal_status || null,
    jurisdiction: unit.jurisdiction || 'global',
    open_issues: unit.open_issues || 0,
    quality_status: qualityStatus(unit.open_issues || 0, unit.confidence || 0),
  };
  // Compact mode: skip heavy fields (for batch responses / GPT Actions)
  if (!compact) {
    result.content_preview = unit.content_preview || null;
    if (unit.related_kos && unit.related_kos.length > 0) {
      result.related_units = unit.related_kos;
    }
  }
  return result;
}

// ============================================================
// Catalog Cache (B3) — in-memory with 60s TTL
// ============================================================

let _cachedCatalog = null;
let _cacheExpiry = 0;
const CATALOG_TTL_MS = 60_000;

/**
 * Fetch catalog.json with in-memory caching (60s TTL).
 * Cloudflare Workers isolate-level state persists across requests
 * within the same isolate, making this effective for hot paths.
 *
 * @param {object} env - Cloudflare env bindings
 * @param {Request} request - Incoming request (for URL base)
 * @returns {Promise<{units: Array}|null>} Parsed catalog or null on error
 */
export async function getCatalog(env, request) {
  const now = Date.now();
  if (_cachedCatalog && now < _cacheExpiry) {
    return _cachedCatalog;
  }

  try {
    const catalogRes = await env.ASSETS.fetch(new URL('/catalog.json', request.url));
    if (!catalogRes.ok) return null;

    _cachedCatalog = await catalogRes.json();
    _cacheExpiry = now + CATALOG_TTL_MS;
    return _cachedCatalog;
  } catch (_) {
    return null;
  }
}

// ============================================================
// Unanswered Query Capture
// ============================================================

/**
 * Auto-capture an unanswered query as a topic suggestion.
 */
export async function captureUnansweredQuery(env, request, query) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const ua = request.headers.get('User-Agent') || '';
    const agentType = detectAgentType(ua);
    const normalized = normalizeQuestion(query);

    await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_question_suggestion`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        p_question: query.trim().substring(0, 500),
        p_normalized: normalized.substring(0, 500),
        p_source_channel: 'auto_capture',
        p_agent_type: agentType,
        p_context: null,
        p_domain_hint: null,
      }),
    });
  } catch (_) {
    // Fire-and-forget
  }
}
