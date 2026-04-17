/**
 * malditasmaquinas.com — Cloudflare Worker API
 * Router principal. Tots els endpoints a /api/*
 */

import { handleAuth } from './auth.js';
import { handleConsultations } from './consultations.js';
import { handleHours } from './hours.js';
import { handleAdmin } from './admin.js';
import { handleStripeWebhook } from './stripe-webhook.js';
import { handleStats } from './stats.js';

const ALLOWED_ORIGINS = [
  'https://malditasmaquinas.com',
  'https://112books.github.io',
  'http://localhost:1313',
  'http://127.0.0.1:1313',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    try {
      // ── Routes ──────────────────────────────────────────────────────────────
      if (path.startsWith('/auth'))              return await handleAuth(request, env, path);
      if (path.startsWith('/consultations'))     return await handleConsultations(request, env, path);
      if (path.startsWith('/hours'))             return await handleHours(request, env, path);
      if (path.startsWith('/admin'))             return await handleAdmin(request, env, path);
      if (path === '/stripe-webhook')            return await handleStripeWebhook(request, env);
      if (path.startsWith('/stats'))             return await handleStats(request, env, path, url);

      return json({ error: 'not found' }, 404);

    } catch (err) {
      console.error(err);
      return json({ error: 'internal server error' }, 500);
    }
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function json(data, status = 200, request = null) {
  const cors = request ? getCorsHeaders(request) : { 'Access-Control-Allow-Origin': '*' };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export function unauthorized(request = null) {
  return json({ error: 'unauthorized' }, 401, request);
}

export async function verifyJWT(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    // Verificació JWT simple amb Web Crypto API (HS256)
    const [headerB64, payloadB64, sigB64] = token.split('.');
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64url(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;

  } catch {
    return null;
  }
}

function base64url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
