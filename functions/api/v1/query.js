/**
 * GET /api/v1/query?q=...&limit=N&domain=...&region=...&jurisdiction=...&entity_type=...
 *
 * Search across all knowledge units. Returns top matching units
 * ranked by relevance score against canonical_question + aliases.
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
  computeEtag,
  checkNotModified,
} from '../../_shared/utils.js';

export async function onRequest(context) {
  const { env, request } = context;
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use GET');
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 20);
  const domain = url.searchParams.get('domain');
  const region = url.searchParams.get('region');
  const jurisdiction = url.searchParams.get('jurisdiction');
  const entityType = url.searchParams.get('entity_type');

  if (!query || query.trim().length === 0) {
    return errorResponse('INVALID_QUERY', 'Missing required parameter: q');
  }

  try {
    const catalog = await getCatalog(env, request);
    if (!catalog) {
      return errorResponse('CATALOG_UNAVAILABLE', 'Knowledge catalog is temporarily unavailable. Retry shortly.');
    }

    const { results, total_tokens } = searchCatalog(catalog.units, {
      q: query, limit, domain, region, jurisdiction, entity_type: entityType,
    });

    const response = {
      query: query.trim(),
      results,
      total_results: results.length,
      total_tokens,
      query_cost_tokens: 42,
    };

    if (results.length === 0) {
      response.suggestion_recorded = true;
      response.message = 'No matching knowledge units found. Your query has been recorded as a topic suggestion.';
    }

    // ETag based on catalog version + query params + result IDs
    const etagInput = `${catalog.generated}:${url.search}:${results.map(r => r.id).join(',')}`;
    const etag = await computeEtag(etagInput);
    const notModified = checkNotModified(request, etag);
    if (notModified) return notModified;

    const topCardId = results.length > 0 ? results[0].id : null;
    context.waitUntil(logAccess(env, request, {
      cardId: topCardId,
      query: query,
      resultCount: results.length,
      requestId,
    }));

    if (results.length === 0 && query.trim().length >= 10) {
      context.waitUntil(captureUnansweredQuery(env, request, query));
    }

    return jsonResponse(response, 200, {
      'Cache-Control': 'public, max-age=300',
      'ETag': etag,
      'X-Request-Id': requestId,
    });
  } catch (err) {
    console.error('Query error:', err.message);
    context.waitUntil(logError(env, 'api_query', query, err));
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}
