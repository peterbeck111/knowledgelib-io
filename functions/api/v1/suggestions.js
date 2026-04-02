/**
 * GET /api/v1/suggestions?limit=N&min_count=N&status=...
 *
 * Returns top unanswered question suggestions ranked by demand.
 * Used by the pipeline to identify what topics agents want covered,
 * and by admin to review/prioritize the suggestion queue.
 */

import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
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
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const minCount = Math.max(parseInt(url.searchParams.get('min_count') || '1', 10), 1);
  const status = url.searchParams.get('status') || 'pending';

  const validStatuses = ['pending', 'approved', 'rejected', 'created'];
  if (!validStatuses.includes(status)) {
    return errorResponse('INVALID_PARAMETER', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return errorResponse('DB_UNAVAILABLE', 'Database is temporarily unavailable. Retry shortly.');
    }

    const params = new URLSearchParams({
      'card_id': 'is.null',
      'is_new_card_candidate': 'eq.true',
      'status': `eq.${status}`,
      'occurrence_count': `gte.${minCount}`,
      'order': 'occurrence_count.desc,last_seen_at.desc',
      'limit': String(limit),
      'select': 'id,question_text,normalized_text,occurrence_count,first_seen_at,last_seen_at,source_channel,agent_type,domain_hint,context',
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/discovered_questions?${params}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase query failed:', res.status, errText);
      return errorResponse('DB_UNAVAILABLE', 'Failed to fetch suggestions');
    }

    const suggestions = await res.json();

    return jsonResponse({
      suggestions: suggestions.map(s => ({
        id: s.id,
        question: s.question_text,
        occurrence_count: s.occurrence_count,
        first_seen: s.first_seen_at,
        last_seen: s.last_seen_at,
        source_channel: s.source_channel,
        agent_type: s.agent_type,
        domain_hint: s.domain_hint,
        context: s.context,
      })),
      total: suggestions.length,
      filters: { status, min_count: minCount, limit },
    }, 200, {
      'Cache-Control': 'public, max-age=60',
      'X-Request-Id': requestId,
    });
  } catch (err) {
    console.error('Suggestions error:', err.message);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}
