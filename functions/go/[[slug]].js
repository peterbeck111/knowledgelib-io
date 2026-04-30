/**
 * /go/ affiliate redirect handler
 *
 * Cloudflare Pages Function — catch-all route.
 * Looks up the slug in Supabase affiliate_links, returns 302 redirect.
 * Geo-localizes Amazon URLs using Cloudflare's cf.country (OneLink enrolled).
 * Logs clicks asynchronously via waitUntil().
 */

// Maps visitor country (ISO 3166-1 alpha-2) → Amazon locale domain.
// Covers all OneLink-enrolled countries + AU, SA, SG.
const AMAZON_LOCALE = {
  US: 'www.amazon.com',
  CA: 'www.amazon.ca',
  GB: 'www.amazon.co.uk',
  FR: 'www.amazon.fr',
  DE: 'www.amazon.de',
  IT: 'www.amazon.it',
  NL: 'www.amazon.nl',
  PL: 'www.amazon.pl',
  ES: 'www.amazon.es',
  SE: 'www.amazon.se',
  AU: 'www.amazon.com.au',
  SA: 'www.amazon.sa',
  SG: 'www.amazon.sg',
};

// Known bot User-Agent patterns — these should never be redirected to Amazon.
// They inflate click stats and waste affiliate cookie windows.
const BOT_PATTERNS = [
  /bytespider/i,
  /ahrefsbot/i,
  /meta-externalagent/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /blex[bp]ot/i,
  /yandexbot/i,
  /baiduspider/i,
  /sogou/i,
  /petalbot/i,
  /dataforseo/i,
  /serpstatbot/i,
  /zoominfobot/i,
  /seranking(backlinks)?bot/i,
  /barkrowler/i,
  /babbar/i,
  /gptbot/i,
  /claude.?(bot|searchbot|user)/i,
  /anthropic-ai/i,
  /ccbot/i,
  /omgilibot/i,
  /turnitinbot/i,
  /googlebot/i,
  /bingbot/i,
  /applebot/i,
  /duckduckbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /discordbot/i,
  /Nexus 5X Build\/MMB29P/,  // Google's mobile quality checker
  /HeadlessChrome/i,
  /PhantomJS/i,
  /python-requests|aiohttp|httpx|curl|wget|go-http-client|java\/|okhttp/i,
];

// Per-isolate click quota: block an IP after it hits too many distinct slugs
// in a short window. Scrapers walk the whole catalog; buyers click 1–2 links.
const QUOTA_WINDOW_MS = 10 * 60 * 1000;  // 10 minutes
const QUOTA_MAX_SLUGS = 20;
const QUOTA_MAP_MAX = 5000;  // cap memory on long-lived isolates
const recentClicks = new Map();  // ip -> { slugs: Set<string>, windowStart: number }

function exceedsQuota(ip, slug) {
  if (!ip) return false;
  const now = Date.now();
  let entry = recentClicks.get(ip);
  if (!entry || now - entry.windowStart > QUOTA_WINDOW_MS) {
    entry = { slugs: new Set(), windowStart: now };
    recentClicks.set(ip, entry);
  }
  entry.slugs.add(slug);
  // Cheap eviction: when oversized, drop oldest half by windowStart
  if (recentClicks.size > QUOTA_MAP_MAX) {
    const sorted = [...recentClicks.entries()].sort((a, b) => a[1].windowStart - b[1].windowStart);
    for (let i = 0; i < sorted.length / 2; i++) recentClicks.delete(sorted[i][0]);
  }
  return entry.slugs.size > QUOTA_MAX_SLUGS;
}

function isBot(userAgent) {
  if (!userAgent) return false;
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

/**
 * Returns the Amazon URL unchanged.
 *
 * We previously rewrote amazon.com → local domains (amazon.co.uk, etc.)
 * using Cloudflare's cf.country.  However, US ASINs often don't exist on
 * regional stores, causing Amazon to redirect to unrelated products.
 * Amazon OneLink (we're enrolled) handles geo-redirection correctly when
 * the link starts at amazon.com, so we no longer rewrite the domain.
 */
function localizeAmazonUrl(destinationUrl, _countryCode) {
  return destinationUrl;
}

export async function onRequest(context) {
  const { params, env, request } = context;

  const slug = (params.slug || []).join('/');

  if (!slug) {
    return new Response('Missing redirect slug', { status: 400 });
  }

  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars');
      return new Response('Service unavailable', { status: 500 });
    }

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
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://knowledgelib.io/',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    const link = rows[0];
    const userAgent = request.headers.get('User-Agent') || '';
    const rawIp = request.headers.get('CF-Connecting-IP') || '';

    // Filter non-buyer traffic. Disqualifies the click if:
    //   1. User-Agent matches a known bot pattern
    //   2. IP exceeds per-isolate slug-diversity quota (scrapers walk catalogs)
    const uaIsBot = isBot(userAgent);
    const quotaBlocked = exceedsQuota(rawIp, slug);

    if (uaIsBot || quotaBlocked) {
      context.waitUntil(logClick(env, link, request, null, true));
      return new Response(`${link.product_name} — affiliate link\n`, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    // Geo-localize Amazon URL based on visitor's country
    const countryCode = (request.cf && request.cf.country) || null;
    const localizedUrl = localizeAmazonUrl(link.destination_url, countryCode);

    // Fire-and-forget click logging (records both original and localized URL)
    context.waitUntil(logClick(env, link, request, localizedUrl, false));

    return new Response(null, {
      status: 302,
      headers: {
        'Location': localizedUrl,
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });

  } catch (err) {
    console.error('Redirect handler error:', err.message);
    context.waitUntil(logError(env, 'redirect', slug, err));
    return new Response('Internal error', { status: 500 });
  }
}

async function logClick(env, link, request, localizedUrl, blocked) {
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
      // First-party clients (custom User-Agent)
      if (/knowledgelib-mcp/i.test(userAgent)) agentType = 'mcp';
      else if (/knowledgelib-n8n/i.test(userAgent)) agentType = 'n8n';
      else if (/knowledgelib-langchain/i.test(userAgent)) agentType = 'langchain';
      // AI agents
      else if (/chatgpt-user|openai/i.test(userAgent)) agentType = 'chatgpt';
      else if (/claude-web|anthropic/i.test(userAgent)) agentType = 'claude';
      else if (/perplexitybot|perplexity/i.test(userAgent)) agentType = 'perplexity';
      else if (/gemini|google-extended/i.test(userAgent)) agentType = 'gemini';
      else if (/copilot/i.test(userAgent)) agentType = 'copilot';
      // Generic clients that hint at SDK usage
      else if (/n8n/i.test(userAgent)) agentType = 'n8n';
      else if (/python-requests|aiohttp/i.test(userAgent)) agentType = 'langchain';
      // AI crawlers
      else if (/gptbot/i.test(userAgent)) agentType = 'gptbot';
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
      destination_url: localizedUrl || link.destination_url,
      http_status: blocked ? 200 : 302,
      is_bot: blocked || false
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

async function logError(env, operation, context_id, err) {
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
        operation: operation,
        status: 'failed',
        error_message: err.message || String(err),
        error_stack: err.stack || null,
        detail: { context_id },
        completed_at: new Date().toISOString(),
      }),
    });
  } catch (_) {
    // Fire-and-forget
  }
}
