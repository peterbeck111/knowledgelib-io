/**
 * POST /api/v1/feedback — Submit feedback about a knowledge unit
 * GET  /api/v1/feedback?card_id=...&status=open — List feedback for a card
 *
 * Part of the feedback & self-improvement loop.
 * Enables agents and users to flag incorrect, outdated, or broken content.
 */

import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  logError,
  detectAgentType,
  detectAccessChannel,
  hashIp,
  checkRateLimit,
} from '../../_shared/utils.js';
import { FeedbackSchema, validate } from '../../_shared/validation.js';

const VALID_STATUSES = ['open', 'acknowledged', 'fixed', 'dismissed'];
const FEEDBACK_RATE_LIMIT = 20; // max 20 feedback reports per IP per hour

export async function onRequest(context) {
  const { env, request } = context;
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method === 'GET') {
    return handleGet(env, request, requestId);
  }

  if (request.method === 'POST') {
    // Rate limit POST only (reads are free)
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const ipKey = ip ? await hashIp(ip) : null;
    const rl = checkRateLimit(ipKey ? `feedback:${ipKey}` : null, FEEDBACK_RATE_LIMIT);
    if (!rl.allowed) {
      return errorResponse('RATE_LIMITED', `Too many feedback reports. Try again in ${Math.ceil(rl.resetMs / 60000)} minute(s).`, {
        'X-Request-Id': requestId,
        'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
      });
    }
    return handlePost(env, request, context, requestId);
  }

  return errorResponse('METHOD_NOT_ALLOWED', 'Use GET or POST');
}

// ============================================================
// GET /api/v1/feedback?card_id=...&status=open
// ============================================================

async function handleGet(env, request, requestId) {
  const url = new URL(request.url);
  const cardId = url.searchParams.get('card_id');
  const status = url.searchParams.get('status') || 'open';

  if (!cardId) {
    return errorResponse('INVALID_PARAMETER', 'card_id parameter is required');
  }

  if (!VALID_STATUSES.includes(status)) {
    return errorResponse('INVALID_PARAMETER', `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return errorResponse('DB_UNAVAILABLE', 'Database is temporarily unavailable. Retry shortly.');
  }

  try {
    const params = new URLSearchParams({
      card_id: `eq.${cardId}`,
      status: `eq.${status}`,
      order: 'created_at.desc',
      limit: '50',
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/content_feedback?${params}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Supabase error: ${res.status}`);
    }

    const items = await res.json();

    return jsonResponse({
      card_id: cardId,
      status_filter: status,
      count: items.length,
      items: items.map(item => ({
        id: item.id,
        type: item.feedback_type,
        severity: item.severity,
        description: item.description,
        section: item.reported_section,
        status: item.status,
        created_at: item.created_at,
        resolved_at: item.resolved_at,
        resolution_notes: item.resolution_notes,
      })),
    }, 200, { 'X-Request-Id': requestId });
  } catch (err) {
    console.error('Feedback GET error:', err.message);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}

// ============================================================
// POST /api/v1/feedback
// ============================================================

async function handlePost(env, request, context, requestId) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch (_) {
    return errorResponse('INVALID_BODY', 'Invalid JSON body');
  }

  const v = validate(FeedbackSchema, rawBody);
  if (!v.success) {
    return errorResponse('INVALID_PARAMETER', v.error);
  }
  const { card_id: cardId, type: feedbackType, description, severity, section } = v.data;

  // Detect agent type
  const ua = request.headers.get('User-Agent') || '';
  const agentType = detectAgentType(ua);
  const sourceChannel = detectAccessChannel(agentType);
  const reporterIp = request.headers.get('CF-Connecting-IP') || null;

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return errorResponse('DB_UNAVAILABLE', 'Database is temporarily unavailable. Retry shortly.');
  }

  try {
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
        feedback_type: feedbackType,
        severity,
        description: description.substring(0, 2000),
        reported_section: section,
        source_channel: sourceChannel,
        agent_type: agentType,
        reporter_ip: reporterIp,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Check for FK violation (card doesn't exist)
      if (res.status === 409 || errText.includes('violates foreign key')) {
        return errorResponse('CARD_NOT_FOUND', `Card not found: ${cardId}`);
      }
      throw new Error(`Supabase error: ${res.status} — ${errText}`);
    }

    const rows = await res.json();
    const feedbackId = rows[0]?.id;

    return jsonResponse({
      status: 'recorded',
      feedback_id: feedbackId,
      card_id: cardId,
      type: feedbackType,
      severity,
      message: 'Feedback recorded. Thank you for helping improve our knowledge base.',
    }, 201, { 'X-Request-Id': requestId });
  } catch (err) {
    console.error('Feedback POST error:', err.message);
    context.waitUntil(logError(env, 'api_feedback', cardId, err));
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}
