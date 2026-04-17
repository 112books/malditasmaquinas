/**
 * consultations.js — Consultes tècniques
 *
 * GET  /api/consultations              → llista
 * POST /api/consultations              → nova consulta (requereix ≥ 0.25h)
 * GET  /api/consultations/:id          → detall + respostes + adjunts
 * POST /api/consultations/:id/respond  → admin respon (notifica client per correu)
 * PUT  /api/consultations/:id/close    → tanca consulta
 */

import { json, unauthorized, verifyJWT } from './index.js';
import { emailHtml, emailAdminHtml, sendEmail } from './email.js';

const HORES_MINIMES = 0.25;
const BASE_URL      = 'https://malditasmaquinas.com';

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
  const adjunts  = Array.isArray(body.adjunts) ? body.adjunts.slice(0, 5) : [];

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
  const adjuntsJson = adjunts.length ? JSON.stringify(adjunts) : null;

  await env.DB.prepare(
    'INSERT INTO consultations (id, user_id, titol, pregunta, adjunts_r2_keys, hores_descomptades) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, payload.sub, titol, pregunta, adjuntsJson, HORES_MINIMES).run();

  const user = await env.DB.prepare('SELECT nom, email FROM profiles WHERE id = ?').bind(payload.sub).first();

  // ── Telegram a l'admin ───────────────────────────────────────────────────────
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const adjTxt = adjunts.length ? `\n📎 ${adjunts.length} adjunt${adjunts.length > 1 ? 's' : ''}: ${adjunts.map(a => a.nom).join(', ')}` : '';
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📩 <b>Nova consulta</b>\nDe: ${user?.nom} (${user?.email})\nTítol: ${titol || '(sense títol)'}${adjTxt}\n\n${pregunta.slice(0, 300)}${pregunta.length > 300 ? '…' : ''}`,
        parse_mode: 'HTML',
      }),
    });
  }

  // ── Email a l'admin ──────────────────────────────────────────────────────────
  if (env.RESEND_API_KEY) {
    const adjHtml = adjunts.length
      ? `<p style="margin:.75rem 0 0;font-size:.8rem;color:#9a958e;">
           📎 ${adjunts.length} adjunt${adjunts.length > 1 ? 's' : ''}:
           ${adjunts.map(a => `<span style="color:#e04d10;">${esc(a.nom)}</span>`).join(', ')}
         </p>`
      : '';

    await sendEmail(env, {
      to: 'hola@malditasmaquinas.com',
      subject: `Nova consulta de ${user?.nom || user?.email}: ${titol || '(sense títol)'}`,
      html: emailAdminHtml({
        titol: 'Nova consulta',
        contingut: `
          <p style="margin:0 0 .5rem;font-size:.8rem;color:#7a7570;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:.08em;">nova consulta</p>
          <p style="margin:0 0 1.25rem;"><strong>${esc(user?.nom)}</strong> · <a href="mailto:${esc(user?.email)}" style="color:#e04d10;text-decoration:none;">${esc(user?.email)}</a></p>
          ${titol ? `<p style="margin:0 0 1rem;font-size:1.05rem;font-weight:600;">${esc(titol)}</p>` : ''}
          <blockquote style="margin:0 0 1rem;padding:1rem 1.25rem;background:#0d0c0b;border-left:3px solid #e04d10;color:#9a958e;font-size:.9rem;line-height:1.7;">
            ${esc(pregunta).replace(/\n/g, '<br>')}
          </blockquote>
          ${adjHtml}
        `,
        cta_text: 'Respon al panell',
        cta_url: `${BASE_URL}/app/`,
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
  if (payload.role !== 'admin' && consultation.user_id !== payload.sub) return unauthorized();

  const responses = await env.DB.prepare(
    'SELECT r.*, p.nom AS admin_nom FROM responses r JOIN profiles p ON p.id = r.admin_id WHERE r.consultation_id = ? ORDER BY r.created_at ASC'
  ).bind(id).all();

  // Parseja adjunts
  let adjunts = [];
  try { adjunts = consultation.adjunts_r2_keys ? JSON.parse(consultation.adjunts_r2_keys) : []; }
  catch { adjunts = []; }

  return json({ ...consultation, adjunts, respostes: responses.results ?? [] });
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

  // ── Email al client ──────────────────────────────────────────────────────────
  const client = await env.DB.prepare('SELECT email, nom FROM profiles WHERE id = ?').bind(consultation.user_id).first();
  if (client && env.RESEND_API_KEY) {
    await sendEmail(env, {
      to: client.email,
      subject: `Resposta a la teva consulta · MalditasMaquinas`,
      html: emailHtml({
        titol: 'Resposta a la teva consulta',
        contingut: `
          <p style="margin:0 0 1.25rem;">Hola <strong>${esc(client.nom)}</strong>,</p>
          <p style="margin:0 0 1rem;">Hem respost a la teva consulta: <strong>${esc(consultation.titol || 'Consulta')}</strong></p>
          <blockquote style="margin:0 0 1.25rem;padding:1rem 1.25rem;background:#0d0c0b;border-left:3px solid #e04d10;color:#9a958e;font-size:.9rem;line-height:1.7;">
            ${esc(text).replace(/\n/g, '<br>')}
          </blockquote>
          <p style="margin:0;font-size:.85rem;color:#9a958e;">Accedeix al teu panell per veure la consulta completa i el teu saldo d'hores.</p>
        `,
        cta_text: 'Veure al panell',
        cta_url: `${BASE_URL}/app/`,
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

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
