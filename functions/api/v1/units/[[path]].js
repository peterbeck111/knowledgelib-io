/**
 * GET /api/v1/units/{category}/{subcategory}/{topic}/{version}.md
 * GET /api/v1/units/{category}/{subcategory}/{topic}/{version}.json
 *
 * Retrieve a specific knowledge unit as raw markdown or structured JSON.
 */

import {
  CORS_HEADERS,
  corsPreflightResponse,
  errorResponse,
  logError,
  logAccess,
  detectAgentType,
  detectAccessChannel,
  hashIp,
  computeEtag,
  checkNotModified,
} from '../../../_shared/utils.js';

export async function onRequest(context) {
  const { params, env, request } = context;
  const requestId = crypto.randomUUID();

  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (request.method !== 'GET') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use GET');
  }

  const pathSegments = params.path || [];
  const fullPath = pathSegments.join('/');

  if (!fullPath) {
    return errorResponse('INVALID_PARAMETER', 'Missing unit path. Use: /api/v1/units/{category}/{subcategory}/{topic}/{version}.md or .json');
  }

  // Determine format from extension
  let format = 'md';
  let unitPath = fullPath;

  if (fullPath.endsWith('.json')) {
    format = 'json';
    unitPath = fullPath.slice(0, -5);
  } else if (fullPath.endsWith('.md')) {
    format = 'md';
    unitPath = fullPath.slice(0, -3);
  }

  try {
    // Fetch the raw .md file from static assets
    const mdUrl = new URL(`/${unitPath}.md`, request.url);
    const mdRes = await env.ASSETS.fetch(mdUrl);

    // Cloudflare SPA fallback returns 200 with text/html for missing assets
    const contentType = mdRes.headers.get('Content-Type') || '';
    if (!mdRes.ok || contentType.includes('text/html')) {
      return errorResponse('UNIT_NOT_FOUND', `Unit not found: ${unitPath}`);
    }

    const mdContent = await mdRes.text();

    // ETag based on content hash
    const etag = await computeEtag(mdContent);
    const notModified = checkNotModified(request, etag);
    if (notModified) return notModified;

    // Log access asynchronously
    context.waitUntil(logUnitAccess(env, request, unitPath, format));

    if (format === 'md') {
      return new Response(mdContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'ETag': etag,
          'X-Request-Id': requestId,
          ...CORS_HEADERS,
        },
      });
    }

    // Parse frontmatter and return as JSON
    const parsed = parseFrontmatter(mdContent);

    const response = {
      id: parsed.metadata.id || unitPath,
      metadata: parsed.metadata,
      body: parsed.body,
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'ETag': etag,
        'X-Request-Id': requestId,
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error('Unit retrieval error:', err.message);
    context.waitUntil(logError(env, 'api_unit', unitPath, err));
    return errorResponse('INTERNAL_ERROR', 'Internal server error', { 'X-Request-Id': requestId });
  }
}

/**
 * Unit-specific access logging with format-aware channel detection.
 */
async function logUnitAccess(env, request, unitPath, format) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const ua = request.headers.get('User-Agent') || '';
    const agentType = detectAgentType(ua);
    const accessChannel = detectAccessChannel(agentType, format === 'md' ? 'raw_md' : 'api');

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
        card_id: unitPath,
        access_channel: accessChannel,
        http_method: request.method,
        referer: (request.headers.get('Referer') || '').substring(0, 2000) || null,
        user_agent: ua.substring(0, 500) || null,
        agent_type: agentType,
        ip_hash: ipHash,
        country_code: cfData.country || null,
        response_status: 200,
      }),
    });
  } catch (_) {
    // Fire-and-forget
  }
}

/**
 * Parse YAML frontmatter from markdown content.
 * Simple parser — splits on --- markers, parses key-value pairs.
 */
function parseFrontmatter(content) {
  // Support both \n and \r\n line endings
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const yamlStr = match[1].replace(/\r\n/g, '\n');
  const body = match[2].trim();
  const metadata = parseSimpleYaml(yamlStr);

  return { metadata, body };
}

/**
 * Lightweight YAML parser for frontmatter.
 * Handles: scalars, quoted strings, arrays (- items), nested keys.
 * Does NOT handle full YAML spec — just enough for our frontmatter.
 */
function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let currentArray = null;
  let currentObject = null;
  let currentObjectKey = null;
  let objectArray = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('#') || line.trim() === '') continue;

    if (currentObjectKey && /^  - /.test(line)) {
      if (currentObject) {
        objectArray.push(currentObject);
      }
      currentObject = {};
      const kv = line.trim().slice(2);
      const colonIdx = kv.indexOf(':');
      if (colonIdx > 0) {
        const k = kv.slice(0, colonIdx).trim();
        const v = kv.slice(colonIdx + 1).trim();
        currentObject[k] = cleanValue(v);
      }
      continue;
    }

    if (currentObject && /^    \w/.test(line)) {
      const kv = line.trim();
      const colonIdx = kv.indexOf(':');
      if (colonIdx > 0) {
        const k = kv.slice(0, colonIdx).trim();
        const v = kv.slice(colonIdx + 1).trim();
        currentObject[k] = cleanValue(v);
      }
      continue;
    }

    if (currentArray && /^  - /.test(line)) {
      currentArray.push(cleanValue(line.trim().slice(2)));
      continue;
    }

    if (currentArray && !/^  /.test(line)) {
      result[currentKey] = currentArray;
      currentArray = null;
      currentKey = null;
    }

    if (currentObjectKey && !/^  /.test(line)) {
      if (currentObject) {
        objectArray.push(currentObject);
        currentObject = null;
      }
      result[currentObjectKey] = objectArray;
      currentObjectKey = null;
      objectArray = null;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !line.startsWith(' ')) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();

      if (value === '' || value === undefined) {
        const nextLine = lines[i + 1] || '';
        if (/^  - \w+:/.test(nextLine)) {
          currentObjectKey = key;
          objectArray = [];
        } else {
          currentKey = key;
          currentArray = [];
        }
      } else {
        result[key] = cleanValue(value);
      }
    }
  }

  if (currentArray) result[currentKey] = currentArray;
  if (currentObjectKey) {
    if (currentObject) objectArray.push(currentObject);
    result[currentObjectKey] = objectArray;
  }

  return result;
}

function cleanValue(v) {
  if (v === undefined || v === null) return null;
  let s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null') return null;
  return s;
}
