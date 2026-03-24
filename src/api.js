/**
 * api.js — API client for GSP Release Tracker
 * In dev: proxied to the API server via Vite proxy
 * In prod: same-origin (Express serves /api/* and static files)
 */

const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  health:     ()          => get('/health'),
  summary:    ()          => get('/summary'),
  partners:   ()          => get('/partners'),
  releases:   (params={}) => get('/releases' + toQS(params)),
  exceptions: (type)      => get('/exceptions' + (type ? `?type=${type}` : '')),
  changelog:  (params={}) => get('/changelog' + toQS(params)),
  query:      (q)         => post('/query', { q }),
};

function toQS(params) {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : '';
}

/** Quick health-check for the API (optional tooling). */
export async function isApiAvailable() {
  try {
    await fetch('/api/health', { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}
