/**
 * GET /api/v1/health
 *
 * Health check endpoint. Returns status of all dependencies:
 * catalog availability, Supabase connectivity, and system metadata.
 * Enables agent-side circuit breakers and monitoring dashboards.
 */

import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  getCatalog,
} from '../../_shared/utils.js';

export async function onRequest(context) {
  const { env, request } = context;

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use GET');
  }

  const checks = {
    catalog: { ok: false, unit_count: 0, generated: null },
    supabase: { ok: false, latency_ms: null },
  };

  // Check catalog
  try {
    const catalogStart = Date.now();
    const catalog = await getCatalog(env, request);
    const catalogMs = Date.now() - catalogStart;

    if (catalog) {
      checks.catalog = {
        ok: true,
        unit_count: catalog.total_units || catalog.units?.length || 0,
        generated: catalog.generated || null,
        latency_ms: catalogMs,
      };
    }
  } catch (_) {
    // catalog check failed
  }

  // Check Supabase connectivity with a lightweight query
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const dbStart = Date.now();
      const res = await fetch(
        `${supabaseUrl}/rest/v1/knowledge_cards?select=id&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      const dbMs = Date.now() - dbStart;

      checks.supabase = {
        ok: res.ok,
        latency_ms: dbMs,
      };
    }
  } catch (_) {
    // supabase check failed
  }

  // Compute overall status
  const allOk = checks.catalog.ok && checks.supabase.ok;
  const anyOk = checks.catalog.ok || checks.supabase.ok;
  const status = allOk ? 'healthy' : anyOk ? 'degraded' : 'down';

  return jsonResponse({
    status,
    version: '1.2.0',
    checks,
    timestamp: new Date().toISOString(),
  }, allOk ? 200 : 503, {
    'Cache-Control': 'no-cache',
  });
}
