'use strict';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Thin wrapper around the global fetch API (Node.js 18+).
 * Returns the parsed JSON body or throws on non-2xx status.
 */
async function getJSON(url, options = {}) {
  const { headers: optionHeaders = {}, signal, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      ...optionHeaders,
    },
    signal: signal || AbortSignal.timeout(15000),
  });

  const text = await res.text();

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} from ${url}`);
    err.statusCode = res.status;
    err.body = text;
    throw err;
  }

  return JSON.parse(text);
}

/**
 * Like getJSON but returns { ok, statusCode, text } without throwing on 4xx/5xx.
 * Useful for probing URLs (e.g. walkccc raw files).
 */
async function probe(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    return { ok: res.ok, statusCode: res.status, text };
  } catch {
    return { ok: false, statusCode: 0, text: '' };
  }
}

/**
 * POST JSON body, return parsed JSON response or throw.
 */
async function postJSON(url, body, options = {}) {
  const { headers: optionHeaders = {}, signal, ...rest } = options;
  const payload = JSON.stringify(body);
  const res = await fetch(url, {
    ...rest,
    method: 'POST',
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString(),
      ...optionHeaders,
    },
    body: payload,
    signal: signal || AbortSignal.timeout(15000),
  });

  const text = await res.text();

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} from ${url}`);
    err.statusCode = res.status;
    err.body = text;
    throw err;
  }

  return JSON.parse(text);
}

module.exports = { getJSON, postJSON, probe, DEFAULT_USER_AGENT };
