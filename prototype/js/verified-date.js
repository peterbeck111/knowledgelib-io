/**
 * Fetches the live "Verified" date from Supabase updated_at
 * and replaces the static placeholder in the .unit-meta div.
 *
 * Also logs page views to card_access_log (once per session per card)
 * with referer, UTM source, and user agent classification.
 *
 * Caches results in localStorage with a 30-minute TTL per card
 * to avoid hitting Supabase on every page load.
 *
 * Requires: <div class="unit-meta" data-card-id="...">
 *           <span id="verified-date">...</span>
 *
 * Config is read from window.__KL (set by an inline <script> in the HTML).
 */
(function () {
  var cfg = window.__KL;
  if (!cfg || !cfg.supabaseUrl || !cfg.anonKey) return;

  var meta = document.querySelector('.unit-meta[data-card-id]');
  if (!meta) return;

  var cardId = meta.getAttribute('data-card-id');
  var span = document.getElementById('verified-date');
  if (!cardId || !span) return;

  var TTL_MS = 30 * 60 * 1000; // 30 minutes
  var cacheKey = 'kl_vdate_' + cardId;

  // Try localStorage cache first
  try {
    var cached = localStorage.getItem(cacheKey);
    if (cached) {
      var entry = JSON.parse(cached);
      if (entry.t && (Date.now() - entry.t) < TTL_MS) {
        span.textContent = entry.d;
        logPageView(cfg, cardId);
        return;
      }
    }
  } catch (e) { /* localStorage unavailable or corrupt — continue to fetch */ }

  var url = cfg.supabaseUrl + '/rest/v1/knowledge_cards' +
    '?id=eq.' + encodeURIComponent(cardId) +
    '&select=updated_at' +
    '&limit=1';

  fetch(url, {
    headers: {
      'apikey': cfg.anonKey,
      'Authorization': 'Bearer ' + cfg.anonKey,
      'Accept': 'application/json'
    }
  })
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      if (rows && rows.length > 0 && rows[0].updated_at) {
        var dateStr = rows[0].updated_at.split('T')[0];
        span.textContent = dateStr;
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ d: dateStr, t: Date.now() }));
        } catch (e) { /* quota exceeded or unavailable — silent */ }
      }
    })
    .catch(function () { /* keep the static fallback */ });

  logPageView(cfg, cardId);
})();

/**
 * Logs a page view to card_access_log via Supabase REST API.
 * Deduplicates: fires once per card per browser session.
 */
function logPageView(cfg, cardId) {
  var sessionKey = 'kl_pv_' + cardId;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
  } catch (e) { /* sessionStorage unavailable — log anyway */ }

  var ref = document.referrer || null;
  var ua = navigator.userAgent || null;
  var params = {};
  try {
    var sp = new URLSearchParams(location.search);
    if (sp.get('utm_source')) params.utm_source = sp.get('utm_source');
    if (sp.get('utm_medium')) params.utm_medium = sp.get('utm_medium');
    if (sp.get('utm_campaign')) params.utm_campaign = sp.get('utm_campaign');
  } catch (e) { /* old browser — skip UTMs */ }

  // Classify referer
  var searchEngine = null;
  var agentType = 'browser';
  if (ref) {
    if (/google\./i.test(ref)) searchEngine = 'google';
    else if (/bing\./i.test(ref)) searchEngine = 'bing';
    else if (/duckduckgo\./i.test(ref)) searchEngine = 'duckduckgo';
    else if (/yahoo\./i.test(ref)) searchEngine = 'yahoo';
    else if (/yandex\./i.test(ref)) searchEngine = 'yandex';
    else if (/baidu\./i.test(ref)) searchEngine = 'baidu';
  }
  // UTM source overrides referer for AI agent classification
  var utmSrc = params.utm_source || '';
  if (/chatgpt/i.test(utmSrc) || /chatgpt/i.test(ref || '')) agentType = 'chatgpt';
  else if (/perplexity/i.test(utmSrc) || /perplexity/i.test(ref || '')) agentType = 'perplexity';
  else if (/claude/i.test(utmSrc) || /anthropic/i.test(ref || '')) agentType = 'claude';
  else if (/copilot/i.test(utmSrc) || /copilot/i.test(ref || '')) agentType = 'copilot';
  else if (/gemini/i.test(utmSrc) || /gemini/i.test(ref || '')) agentType = 'gemini';

  // Build query string from UTMs for the agent_query field
  var agentQuery = null;
  if (utmSrc) {
    var parts = [];
    if (params.utm_source) parts.push('src=' + params.utm_source);
    if (params.utm_medium) parts.push('med=' + params.utm_medium);
    if (params.utm_campaign) parts.push('cmp=' + params.utm_campaign);
    agentQuery = parts.join('&');
  }

  var payload = {
    card_id: cardId,
    access_channel: 'web',
    http_method: 'GET',
    agent_query: agentQuery,
    referer: ref ? ref.substring(0, 500) : null,
    search_engine: searchEngine,
    user_agent: ua ? ua.substring(0, 500) : null,
    agent_type: agentType,
    response_status: 200
  };

  // Fire-and-forget — keepalive survives page unload
  fetch(cfg.supabaseUrl + '/rest/v1/card_access_log', {
    method: 'POST',
    headers: {
      'apikey': cfg.anonKey,
      'Authorization': 'Bearer ' + cfg.anonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(function () {});
}
