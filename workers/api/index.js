/**
 * malditasmaquinas.com — Cloudflare Worker API
 * Router principal. Tots els endpoints a /api/*
 */

import { handleAuth } from './auth.js';
import { handleConsultations } from './consultations.js';
import { handleHours } from './hours.js';
import { handleStripeWebhook } from './stripe-webhook.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://malditasmaquinas.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // ── Routes ──────────────────────────────────────────────────────────────
      if (path.startsWith('/auth'))              return handleAuth(request, env, path);
      if (path.startsWith('/consultations'))     return handleConsultations(request, env, path);
      if (path.startsWith('/hours'))             return handleHours(request, env, path);
      if (path === '/stripe-webhook')            return handleStripeWebhook(request, env);

      return json({ error: 'not found' }, 404);

    } catch (err) {
      console.error(err);
      return json({ error: 'internal server error' }, 500);
    }
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function unauthorized() {
  return json({ error: 'unauthorized' }, 401);
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
