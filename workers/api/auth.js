/**
 * auth.js — Autenticació amb magic link
 *
 * POST /api/auth/register   → registre nou usuari (status: pending)
 * POST /api/auth/magic-link → sol·licita magic link (usuaris active)
 * GET  /api/auth/verify     → valida token → retorna JWT
 * GET  /api/auth/me         → perfil de l'usuari autenticat
 */

import { json, unauthorized, verifyJWT } from './index.js';

const TOKEN_TTL_MIN  = 15;
const JWT_TTL_SEC    = 60 * 60 * 24 * 30; // 30 dies

// ── Helpers ───────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

async function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signJWT(payload, secret) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body    = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const key     = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  const sigB64  = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${sigB64}`;
}

async function sendEmail(env, { to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MalditasMaquinas <hola@malditasmaquinas.com>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) console.error('Resend error:', await res.text());
}

async function notifyTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  });
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function handleAuth(request, env, path) {
  const method = request.method;

  if (path === '/auth/register'    && method === 'POST') return register(request, env);
  if (path === '/auth/magic-link'  && method === 'POST') return requestMagicLink(request, env);
  if (path === '/auth/verify'      && method === 'GET')  return verifyToken(request, env);
  if (path === '/auth/me'          && method === 'GET')  return me(request, env);

  return json({ error: 'not found' }, 404);
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

async function register(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'json invàlid' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const nom   = (body.nom   || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'correu invàlid' }, 400);
  }
  if (!nom) {
    return json({ error: 'el nom és obligatori' }, 400);
  }

  // Comprova si ja existeix
  const existing = await env.DB.prepare('SELECT id, status FROM profiles WHERE email = ?').bind(email).first();
  if (existing) {
    if (existing.status === 'active') {
      // Ja té compte actiu → suggereix magic link
      return json({ error: 'ja_existeix', message: 'Aquest correu ja té compte. Usa el magic link per accedir.' }, 409);
    }
    if (existing.status === 'pending') {
      return json({ error: 'pendent', message: 'El compte ja existeix i està pendent de validació.' }, 409);
    }
    if (existing.status === 'blocked') {
      return json({ error: 'bloquejat' }, 403);
    }
  }

  const id = uuid();
  await env.DB.prepare(
    'INSERT INTO profiles (id, email, nom, status) VALUES (?, ?, ?, ?)'
  ).bind(id, email, nom, 'pending').run();

  // Email de confirmació a l'usuari
  await sendEmail(env, {
    to: email,
    subject: 'Compte creat · MalditasMaquinas',
    html: `
      <p>Hola ${nom},</p>
      <p>Hem rebut el teu registre. Revisarem el compte i t'avisarem per correu quan estigui actiu.</p>
      <p>Sol·licituds habituals: menys de 24h en dies laborables.</p>
      <br>
      <p>— MalditasMaquinas</p>
    `,
  });

  // Notificació Telegram a l'admin
  await notifyTelegram(env,
    `🆕 <b>Nou registre</b>\n` +
    `Nom: ${nom}\n` +
    `Email: ${email}\n` +
    `Valida a: https://malditasmaquinas.com/app/?admin=1`
  );

  return json({ ok: true, status: 'pending' });
}

// ── POST /api/auth/magic-link ─────────────────────────────────────────────────

async function requestMagicLink(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'json invàlid' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) return json({ error: 'correu obligatori' }, 400);

  const user = await env.DB.prepare('SELECT id, nom, status FROM profiles WHERE email = ?').bind(email).first();

  // Resposta genèrica (no revela si l'email existeix o no)
  if (!user || user.status !== 'active') {
    return json({ ok: true, message: 'Si el compte existeix i està actiu, rebràs un correu.' });
  }

  const token     = await randomHex(32);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO magic_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  const baseUrl = env.BASE_URL || 'https://malditasmaquinas.com';
  const link    = `${baseUrl}/app/?token=${token}`;

  await sendEmail(env, {
    to: email,
    subject: 'Accés a MalditasMaquinas',
    html: `
      <p>Hola ${user.nom},</p>
      <p>Aquí tens el teu link d'accés. Caduca en ${TOKEN_TTL_MIN} minuts i és d'un sol ús.</p>
      <br>
      <p><a href="${link}" style="background:#e04d10;color:#fff;padding:12px 24px;text-decoration:none;font-family:monospace;">Accedeix ara</a></p>
      <br>
      <p>Si no has sol·licitat aquest accés, ignora aquest correu.</p>
      <p>— MalditasMaquinas</p>
    `,
  });

  return json({ ok: true });
}

// ── GET /api/auth/verify?token=xxx ────────────────────────────────────────────

async function verifyToken(request, env) {
  const url   = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!token) return json({ error: 'token obligatori' }, 400);

  const row = await env.DB.prepare(
    'SELECT * FROM magic_tokens WHERE token = ? AND used = 0'
  ).bind(token).first();

  if (!row) return json({ error: 'token invàlid' }, 401);
  if (new Date(row.expires_at) < new Date()) {
    return json({ error: 'token_caducat', message: 'El link ha caducat. Sol·licita un de nou.' }, 401);
  }

  // Marca el token com a usat
  await env.DB.prepare('UPDATE magic_tokens SET used = 1 WHERE token = ?').bind(token).run();

  const user = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(row.user_id).first();
  if (!user || user.status !== 'active') return json({ error: 'compte no actiu' }, 403);

  const jwt = await signJWT(
    { sub: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + JWT_TTL_SEC },
    env.JWT_SECRET
  );

  return json({ ok: true, token: jwt, user: { id: user.id, email: user.email, nom: user.nom, role: user.role } });
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

async function me(request, env) {
  const payload = await verifyJWT(request, env);
  if (!payload) return unauthorized();

  const user = await env.DB.prepare(
    'SELECT id, email, nom, cognoms, nif, adreca, poblacio, cp, pais, telefon, role, status, created_at FROM profiles WHERE id = ?'
  ).bind(payload.sub).first();

  if (!user) return unauthorized();
  return json(user);
}
