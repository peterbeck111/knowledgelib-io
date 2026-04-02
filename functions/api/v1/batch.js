/**
 * POST /api/v1/batch
 *
 * Execute multiple queries in a single request. Shares a single catalog parse
 * across all queries, reducing latency for multi-topic research workflows.
 *
 * Request body:
 *   { "queries": [ { "q": "...", "limit": N, "domain": "...", ... }, ... ] }
 *
 * Max 10 queries per batch.
 */

import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  logError,
  logAccess,
  captureUnansweredQuery,
  getCatalog,
  searchCatalog,
} from '../../_shared/utils.js';
import { BatchSchema, validate } from '../../_shared/validation.js';

export async function onRequest(context) {
  const { env, request } = context;
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST with JSON body: {"queries": [...]}');
  }

  let rawBody;
  try {
    rawBody = await request.json();
  } catch (_) {
    return errorResponse('INVALID_BODY', 'Invalid JSON body');
  }

  const v = validate(BatchSchema, rawBody);
  if (!v.success) {
    return errorResponse('INVALID_PARAMETER', v.error);
  }
  const { queries } = v.data;

  try {
    // Single catalog fetch shared across all queries
    const catalog = await getCatalog(env, request);
    if (!catalog) {
      return errorResponse('CATALOG_UNAVAILABLE', 'Knowledge catalog is temporarily unavailable. Retry shortly.');
    }

    const results = queries.map((queryParams, idx) => {
      const limit = Math.min(parseInt(queryParams.limit || '3', 10), 20);
      const { results: items, total_tokens } = searchCatalog(catalog.units, {
        q: queryParams.q,
        limit,
        domain: queryParams.domain,
        region: queryParams.region,
        jurisdiction: queryParams.jurisdiction,
        entity_type: queryParams.entity_type,
        compact: true,
      });

      return {
        query: queryParams.q.trim(),
        results: items,
        total_results: items.length,
        total_tokens,
      };
    });

    // Aggregate stats
    const totalResults = results.reduce((sum, r) => sum + r.total_results, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.total_tokens, 0);

    // Log access for first query (representative)
    const firstTopCard = results[0]?.results?.[0]?.id || null;
    context.waitUntil(logAccess(env, request, {
      cardId: firstTopCard,
      query: `batch:${queries.length}`,
      resultCount: totalResults,
      requestId,
    }));

    // Auto-capture unanswered queries
    for (const r of results) {
      if (r.total_results === 0 && r.query.length >= 10) {
        context.waitUntil(captureUnansweredQuery(env, request, r.query));
      }
    }

    return jsonResponse({
      batch_size: queries.length,
      results,
      total_results: totalResults,
      total_tokens: totalTokens,
    }, 200, {
      'Cache-Control': 'public, max-age=300',
      'X-Request-Id': requestId,
    });
  } catch (err) {
    console.error('Batch error:', err.message);
    context.waitUntil(logError(env, 'api_batch', `batch:${queries.length}`, err));
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}
