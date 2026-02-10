/**
 * /go/ affiliate redirect handler
 *
 * Cloudflare Pages Function — catch-all route.
 * Looks up the slug in Supabase affiliate_links, returns 302 redirect.
 * Logs clicks asynchronously via waitUntil().
 */

export async function onRequest(context) {
  const { params, env, request } = context;

  const slug = (params.slug || []).join('/');

  if (!slug) {
    return new Response('Missing redirect slug', { status: 400 });
  }

  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;

    const apiUrl = `${supabaseUrl}/rest/v1/affiliate_links` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&is_active=eq.true` +
      `&select=id,destination_url,card_id,product_name`;

    const res = await fetch(apiUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`Supabase error: ${res.status} ${res.statusText}`);
      return new Response('Service temporarily unavailable', { status: 502 });
    }

    const rows = await res.json();

    if (!rows || rows.length === 0) {
      return Response.redirect('https://knowledgelib.io/', 302);
    }

    const link = rows[0];

    // Fire-and-forget click logging
    context.waitUntil(logClick(env, link, request));

    return Response.redirect(link.destination_url, 302);

  } catch (err) {
    console.error('Redirect handler error:', err.message);
    return new Response('Internal error', { status: 500 });
  }
}

async function logClick(env, link, request) {
  try {
    const referer = request.headers.get('Referer') || null;
    const userAgent = request.headers.get('User-Agent') || null;
    const cfData = request.cf || {};

    let refererType = 'direct';
    if (referer) {
      if (referer.includes('knowledgelib.io')) {
        refererType = 'knowledgelib_page';
      } else if (/chatgpt|openai|claude|anthropic|perplexity/i.test(referer)) {
        refererType = 'ai_agent';
      } else if (/google|bing|duckduckgo|yahoo/i.test(referer)) {
        refererType = 'search';
      } else {
        refererType = 'external';
      }
    }

    let agentType = null;
    if (userAgent) {
      if (/chatgpt|openai/i.test(userAgent)) agentType = 'chatgpt';
      else if (/claude|anthropic/i.test(userAgent)) agentType = 'claude';
      else if (/perplexity/i.test(userAgent)) agentType = 'perplexity';
    }

    // Hash IP for privacy
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const ipHashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(ip)
    );
    const ipHash = Array.from(new Uint8Array(ipHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const payload = {
      link_id: link.id,
      card_id: link.card_id,
      referer: referer,
      referer_type: refererType,
      agent_type: agentType,
      ip_hash: ipHash,
      user_agent: userAgent ? userAgent.substring(0, 500) : null,
      country_code: cfData.country || null,
      device_type: classifyDevice(userAgent),
      destination_url: link.destination_url,
      http_status: 302
    };

    await fetch(`${env.SUPABASE_URL}/rest/v1/affiliate_click_log`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Click logging failed:', err.message);
  }
}

function classifyDevice(ua) {
  if (!ua) return null;
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}
