'use strict';

const http = require('node:http');
const https = require('node:https');
const { getEcosystemServices, resolveEcosystemSecrets } = require('./global-resources.cjs');

function resolveRagApiConfig() {
  const svcs = getEcosystemServices();
  const secrets = resolveEcosystemSecrets();
  const url = String(process.env.RAG_MANAGER_URL || svcs.ragManager?.url || 'http://127.0.0.1:27130').replace(/\/+$/, '');
  const token = process.env.RAG_MANAGER_TOKEN || secrets?.data?.tokens?.ragManager || null;
  return { url, token };
}

function resolveDeepTutorConfig() {
  const svcs = getEcosystemServices();
  const secrets = resolveEcosystemSecrets();
  const url = String(process.env.DEEPTUTOR_URL || svcs.deepTutor?.url || 'http://127.0.0.1:8001').replace(/\/+$/, '');
  const webUrl = String(process.env.DEEPTUTOR_WEB_URL || svcs.deepTutor?.webUrl || 'http://127.0.0.1:3782').replace(/\/+$/, '');
  const token = process.env.DEEPTUTOR_TOKEN || secrets?.data?.tokens?.deepTutor || null;
  return { url, webUrl, token };
}

function requestLoopbackJson(rawUrl, { method = 'POST', pathSuffix = '/', body = null, token = null, timeoutMs = 4500 } = {}) {
  return new Promise((resolve) => {
    let endpoint;
    try {
      endpoint = new URL(pathSuffix, `${String(rawUrl || '').replace(/\/+$/, '')}/`);
    } catch {
      resolve({ ok: false, offline: true, error: 'Invalid loopback URL' });
      return;
    }

    const host = endpoint.hostname.toLowerCase();
    if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1' && host !== '[::1]') {
      resolve({ ok: false, offline: true, error: 'Refused non-loopback ecosystem host' });
      return;
    }

    const payload = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const headers = {};
    if (payload != null) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      headers['Content-Length'] = Buffer.byteLength(payload, 'utf8');
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const transport = endpoint.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = transport.request(
      endpoint,
      { method, timeout: timeoutMs, headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            parsed = { raw };
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            done({ ok: true, status: res.statusCode, data: parsed });
          } else {
            done({
              ok: false,
              status: res.statusCode,
              data: parsed,
              error: parsed?.error || parsed?.detail || `HTTP ${res.statusCode}`
            });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      done({ ok: false, offline: true, error: 'Request timed out' });
    });
    req.on('error', (err) => {
      done({ ok: false, offline: true, error: err?.message || 'Service unreachable' });
    });
    if (payload != null) req.write(payload, 'utf8');
    req.end();
  });
}

async function postRagIngestEvent(payload = {}, options = {}) {
  const cfg = resolveRagApiConfig();
  const apiUrl = options.apiUrl || cfg.url;
  const token = options.token !== undefined ? options.token : cfg.token;
  return requestLoopbackJson(apiUrl, {
    method: 'POST',
    pathSuffix: '/v1/ingest/event',
    body: payload,
    token,
    timeoutMs: options.timeoutMs || 5000
  });
}

async function searchRagEcosystem({ query, limit = 12, sources, apiUrl, token, timeoutMs = 4000 } = {}) {
  const q = String(query || '').trim();
  if (!q) return { ok: true, results: [], total: 0 };

  const cfg = resolveRagApiConfig();
  const resolvedUrl = apiUrl || cfg.url;
  const resolvedToken = token !== undefined ? token : cfg.token;

  let res = await requestLoopbackJson(resolvedUrl, {
    method: 'POST',
    pathSuffix: '/v1/search',
    body: {
      query: q,
      limit,
      ...(Array.isArray(sources) && sources.length ? { sources } : {})
    },
    token: resolvedToken,
    timeoutMs
  });

  if (!res.ok && res.status === 405) {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    res = await requestLoopbackJson(resolvedUrl, {
      method: 'GET',
      pathSuffix: `/v1/search?${qs.toString()}`,
      token: resolvedToken,
      timeoutMs
    });
  }

  const rawItems = Array.isArray(res.data?.results)
    ? res.data.results
    : Array.isArray(res.data?.hits)
      ? res.data.hits
      : Array.isArray(res.data?.items)
        ? res.data.items
        : [];

  const results = rawItems.map((item, idx) => ({
    id: item?.id || String(idx),
    title: item?.title || item?.name || item?.path || 'Result',
    snippet: item?.snippet || item?.text || item?.excerpt || '',
    sourceApp: item?.source_app || item?.sourceApp || item?.source || 'rag-manager',
    sourceUri: item?.source_uri || item?.sourceUri || item?.uri || item?.deep_link || '',
    score: typeof item?.score === 'number' ? item.score : null,
    xrefId: item?.xref_id || item?.xrefId || null
  }));

  return {
    ok: res.ok,
    results,
    total: results.length,
    offline: !!res.offline,
    error: res.ok ? null : (res.error || 'Search failed')
  };
}

async function requestAudioTranscription({ audioPath, boardId, trackId, language = 'en', apiUrl, token, timeoutMs = 30000 } = {}) {
  const cfg = resolveRagApiConfig();
  const resolvedUrl = apiUrl || cfg.url;
  const resolvedToken = token !== undefined ? token : cfg.token;

  const res = await requestLoopbackJson(resolvedUrl, {
    method: 'POST',
    pathSuffix: '/v1/transcribe',
    body: {
      source_app: 'gaussboard',
      board_id: boardId || null,
      track_id: trackId || null,
      audio_path: audioPath || null,
      language
    },
    token: resolvedToken,
    timeoutMs
  });

  return {
    ok: res.ok,
    text: res.data?.text || '',
    cues: Array.isArray(res.data?.cues) ? res.data.cues : [],
    engine: res.data?.engine || 'groq-whisper-v3',
    offline: !!res.offline,
    error: res.ok ? null : (res.error || 'Transcription failed')
  };
}

async function sendToDeepTutor({ mode = 'ask', prompt = '', title = '', boardId = null, xrefId = null, sourceUri = null, markdown = '', apiUrl, webUrl, token, timeoutMs = 5000 } = {}) {
  const cfg = resolveDeepTutorConfig();
  const resolvedApiUrl = apiUrl || cfg.url;
  const resolvedWebUrl = String(webUrl || cfg.webUrl || 'http://127.0.0.1:3782').replace(/\/+$/, '');
  const resolvedToken = token !== undefined ? token : cfg.token;

  const qs = new URLSearchParams({
    source: 'gaussboard',
    mode: String(mode || 'ask'),
    board: String(boardId || ''),
    xref: String(xrefId || '')
  });
  const fallbackUrl = `${resolvedWebUrl}/?${qs.toString()}`;

  const res = await requestLoopbackJson(resolvedApiUrl, {
    method: 'POST',
    pathSuffix: '/api/v1/context',
    body: {
      mode,
      prompt,
      title,
      source_app: 'gaussboard',
      board_id: boardId,
      xref_id: xrefId,
      source_uri: sourceUri,
      content: markdown
    },
    token: resolvedToken,
    timeoutMs
  });

  return {
    ok: res.ok,
    status: res.status || null,
    data: res.data || null,
    sessionUrl: res.data?.session_url || res.data?.url || fallbackUrl,
    webUrl: fallbackUrl,
    offline: !!res.offline,
    error: res.ok ? null : (res.error || 'DeepTutor unavailable')
  };
}

module.exports = {
  resolveRagApiConfig,
  resolveDeepTutorConfig,
  postRagIngestEvent,
  searchRagEcosystem,
  requestAudioTranscription,
  sendToDeepTutor
};
