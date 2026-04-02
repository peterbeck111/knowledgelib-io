/**
 * POST /api/v1/suggest
 *
 * Submit a question or topic request to knowledgelib.io.
 * If the question is already answered by an existing card, returns the match.
 * Otherwise, records the suggestion for future card creation.
 * Popular suggestions are prioritized in the pipeline.
 */

import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  logError,
  detectAgentType,
  detectAccessChannel,
  normalizeQuestion,
  getCatalog,
  hashIp,
  checkRateLimit,
} from '../../_shared/utils.js';
import { SuggestSchema, validate } from '../../_shared/validation.js';

const SUGGEST_RATE_LIMIT = 10; // max 10 suggestions per IP per hour

export async function onRequest(context) {
  const { env, request } = context;
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST');
  }

  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipKey = ip ? await hashIp(ip) : null;
  const rl = checkRateLimit(ipKey ? `suggest:${ipKey}` : null, SUGGEST_RATE_LIMIT);
  if (!rl.allowed) {
    return errorResponse('RATE_LIMITED', `Too many suggestions. Try again in ${Math.ceil(rl.resetMs / 60000)} minute(s).`, {
      'X-Request-Id': requestId,
      'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
    });
  }

  // Parse and validate request body
  let rawBody;
  try {
    rawBody = await request.json();
  } catch (_) {
    return errorResponse('INVALID_BODY', 'Invalid JSON body');
  }

  const v = validate(SuggestSchema, rawBody);
  if (!v.success) {
    return errorResponse('INVALID_PARAMETER', v.error);
  }
  const { question, context: questionContext, domain } = v.data;
  const normalized = normalizeQuestion(question);

  try {
    // Check catalog.json for an existing match
    const match = await findExistingMatch(env, request, normalized);
    if (match) {
      return jsonResponse({
        status: 'already_answered',
        existing_match: {
          id: match.id,
          canonical_question: match.canonical_question,
          url: match.url,
          raw_md: match.raw_md,
        },
        message: 'This question is already answered by an existing knowledge unit.',
      }, 200, { 'X-Request-Id': requestId });
    }

    // Detect agent type from User-Agent
    const ua = request.headers.get('User-Agent') || '';
    const agentType = detectAgentType(ua);
    const sourceChannel = detectAccessChannel(agentType, 'api_suggest');

    // Upsert into discovered_questions via RPC
    const result = await upsertSuggestion(env, {
      question: question.substring(0, 500),
      normalized: normalized.substring(0, 500),
      sourceChannel,
      agentType,
      context: questionContext,
      domainHint: domain,
    });

    return jsonResponse({
      status: 'recorded',
      suggestion_id: result.suggestion_id,
      is_duplicate: result.is_duplicate,
      occurrence_count: result.total_count,
      message: result.is_duplicate
        ? `Thank you. This question has been seen ${result.total_count} time(s) and is being considered for card creation.`
        : 'Thank you. Your question has been recorded and will be reviewed for card creation.',
    }, 200, { 'X-Request-Id': requestId });
  } catch (err) {
    console.error('Suggest error:', err.message);
    context.waitUntil(logError(env, 'api_suggest', question, err));
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Check catalog.json for an existing card that answers this question.
 * Reuses the same scoring approach as query.js.
 */
async function findExistingMatch(env, request, queryLower) {
  try {
    const catalog = await getCatalog(env, request);
    if (!catalog) return null;

    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

    let bestMatch = null;
    let bestScore = 0;

    for (const unit of catalog.units) {
      let score = 0;
      const canonical = (unit.canonical_question || '').toLowerCase();
      const aliasesStr = (unit.aliases || []).join(' ').toLowerCase();

      if (canonical === queryLower) {
        score += 100;
      } else if (canonical.includes(queryLower)) {
        score += 60;
      } else if ((unit.aliases || []).some(a => a.toLowerCase() === queryLower)) {
        score += 80;
      } else if (aliasesStr.includes(queryLower)) {
        score += 50;
      }

      for (const word of queryWords) {
        if (canonical.includes(word)) score += 5;
        if (aliasesStr.includes(word)) score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = unit;
      }
    }

    // Threshold: only consider it "already answered" if score > 50
    return bestScore > 50 ? bestMatch : null;
  } catch (_) {
    return null;
  }
}

/**
 * Call the upsert_question_suggestion() RPC function in Supabase.
 */
async function upsertSuggestion(env, params) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_question_suggestion`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      p_question: params.question,
      p_normalized: params.normalized,
      p_source_channel: params.sourceChannel,
      p_agent_type: params.agentType,
      p_context: params.context,
      p_domain_hint: params.domainHint,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase RPC error: ${res.status} — ${errText}`);
  }

  const rows = await res.json();
  if (!rows || rows.length === 0) {
    throw new Error('Supabase RPC returned no rows');
  }

  return rows[0];
}
