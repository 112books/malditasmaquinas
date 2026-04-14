/**
 * consultations.js — Consultes tècniques
 *
 * GET  /api/consultations          → llista (client: les seves; admin: totes)
 * POST /api/consultations          → nova consulta (requereix ≥ 0.25h)
 * GET  /api/consultations/:id      → detall + respostes
 * POST /api/consultations/:id/respond → admin respon
 * PUT  /api/consultations/:id/close   → tanca consulta
 */

import { json, unauthorized, verifyJWT } from './index.js';

const HORES_MINIMES = 0.25;

export async function handleConsultations(request, env, path) {
  const payload = await verifyJWT(request, env);
  if (!payload) return unauthorized();

  const method = request.method;

  if (path === '/consultations' && method === 'GET')  return list(env, payload);
  if (path === '/consultations' && method === 'POST') return create(request, env, payload);

  const matchDetail  = path.match(/^\/consultations\/([^/]+)$/);
  const matchRespond = path.match(/^\/consultations\/([^/]+)\/respond$/);
  const matchClose   = path.match(/^\/consultations\/([^/]+)\/close$/);

  if (matchDetail  && method === 'GET')  return detail(env, payload, matchDetail[1]);
  if (matchRespond && method === 'POST') return respond(request, env, payload, matchRespond[1]);
  if (matchClose   && method === 'PUT')  return close(env, payload, matchClose[1]);

  return json({ error: 'not found' }, 404);
}

// ── GET /api/consultations ────────────────────────────────────────────────────

async function list(env, payload) {
  const isAdmin = payload.role === 'admin';

  const rows = isAdmin
    ? await env.DB.prepare(`
        SELECT c.*, p.email, p.nom
        FROM consultations c
        JOIN profiles p ON p.id = c.user_id
        ORDER BY c.created_at DESC
      `).all()
    : await env.DB.prepare(`
        SELECT * FROM consultations
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).bind(payload.sub).all();

  return json(rows.results ?? []);
}

// ── POST /api/consultations ───────────────────────────────────────────────────

async function create(request, env, payload) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'json invàlid' }, 400); }

  const titol    = (body.titol    || '').trim();
  const pregunta = (body.pregunta || '').trim();

  if (!pregunta) return json({ error: 'la pregunta és obligatòria' }, 400);

  // Comprova saldo
  const balance = await env.DB.prepare(
    'SELECT hores_disponibles FROM hour_balance WHERE user_id = ?'
  ).bind(payload.sub).first();

  const disponibles = balance?.hores_disponibles ?? 0;
  if (disponibles < HORES_MINIMES) {
    return json({
      error: 'sense_hores',
      message: `Cal tenir almenys ${HORES_MINIMES}h disponibles. Saldo actual: ${disponibles}h.`,
      hores_disponibles: disponibles,
    }, 402);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO consultations (id, user_id, titol, pregunta, hores_descomptades) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, payload.sub, titol, pregunta, HORES_MINIMES).run();

  // Notifica admin per Telegram
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const user = await env.DB.prepare('SELECT nom, email FROM profiles WHERE id = ?').bind(payload.sub).first();
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📩 <b>Nova consulta</b>\nDe: ${user?.nom} (${user?.email})\nTítol: ${titol || '(sense títol)'}\n\n${pregunta.slice(0, 200)}${pregunta.length > 200 ? '…' : ''}`,
        parse_mode: 'HTML',
      }),
    });
  }

  return json({ ok: true, id }, 201);
}

// ── GET /api/consultations/:id ────────────────────────────────────────────────

async function detail(env, payload, id) {
  const consultation = await env.DB.prepare(
    'SELECT * FROM consultations WHERE id = ?'
  ).bind(id).first();

  if (!consultation) return json({ error: 'not found' }, 404);
  if (payload.role !== 'admin' && consultation.user_id !== payload.sub) {
    return unauthorized();
  }

  const responses = await env.DB.prepare(
    'SELECT r.*, p.nom AS admin_nom FROM responses r JOIN profiles p ON p.id = r.admin_id WHERE r.consultation_id = ? ORDER BY r.created_at ASC'
  ).bind(id).all();

  return json({ ...consultation, respostes: responses.results ?? [] });
}

// ── POST /api/consultations/:id/respond ──────────────────────────────────────

async function respond(request, env, payload, id) {
  if (payload.role !== 'admin') return unauthorized();

  let body;
  try { body = await request.json(); } catch { return json({ error: 'json invàlid' }, 400); }

  const text = (body.text || '').trim();
  if (!text) return json({ error: 'la resposta no pot ser buida' }, 400);

  const consultation = await env.DB.prepare('SELECT * FROM consultations WHERE id = ?').bind(id).first();
  if (!consultation) return json({ error: 'not found' }, 404);

  const rid = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO responses (id, consultation_id, admin_id, text) VALUES (?, ?, ?, ?)'
  ).bind(rid, id, payload.sub, text).run();

  await env.DB.prepare(
    "UPDATE consultations SET estat = 'resposta', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  // Notifica el client per email
  const client = await env.DB.prepare('SELECT email, nom FROM profiles WHERE id = ?').bind(consultation.user_id).first();
  if (client && env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MalditasMaquinas <hola@malditasmaquinas.com>',
        to: [client.email],
        subject: `Resposta a la teva consulta · MalditasMaquinas`,
        html: `
          <p>Hola ${client.nom},</p>
          <p>Hem respost a la teva consulta: <strong>${consultation.titol || 'Consulta'}</strong></p>
          <blockquote style="border-left:3px solid #e04d10;padding:1rem;background:#181714;color:#e2ddd6;">${text.replace(/\n/g, '<br>')}</blockquote>
          <p><a href="${env.BASE_URL || 'https://malditasmaquinas.com'}/app/">Veure al panell</a></p>
          <p>— MalditasMaquinas</p>
        `,
      }),
    });
  }

  return json({ ok: true });
}

// ── PUT /api/consultations/:id/close ─────────────────────────────────────────

async function close(env, payload, id) {
  const consultation = await env.DB.prepare('SELECT * FROM consultations WHERE id = ?').bind(id).first();
  if (!consultation) return json({ error: 'not found' }, 404);
  if (payload.role !== 'admin' && consultation.user_id !== payload.sub) return unauthorized();

  await env.DB.prepare(
    "UPDATE consultations SET estat = 'tancat', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  return json({ ok: true });
}
