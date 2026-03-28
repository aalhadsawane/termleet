'use strict';

/**
 * Thin wrapper around the global fetch API (Node.js 18+).
 * Returns the parsed JSON body or throws on non-2xx status.
 */
async function getJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'termleet/1.0 (https://github.com/aalhadsawane/termleet)',
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
    ...options,
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
        'User-Agent': 'termleet/1.0 (https://github.com/aalhadsawane/termleet)',
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
  const payload = JSON.stringify(body);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'termleet/1.0 (https://github.com/aalhadsawane/termleet)',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload).toString(),
      ...options.headers,
    },
    body: payload,
    signal: AbortSignal.timeout(15000),
    ...options,
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

module.exports = { getJSON, postJSON, probe };
