/**
 * admin.js — Panell d'administració (rol admin)
 *
 * GET /api/admin/users              → llista tots els usuaris
 * PUT /api/admin/users/:id/validate → activa un usuari (pending → active)
 * PUT /api/admin/users/:id/block    → bloqueja un usuari
 */

import { json, unauthorized, verifyJWT } from './index.js';

export async function handleAdmin(request, env, path) {
  const payload = await verifyJWT(request, env);
  if (!payload) return unauthorized();
  if (payload.role !== 'admin') return json({ error: 'forbidden' }, 403);

  const method = request.method;

  if (path === '/admin/users' && method === 'GET') return listUsers(env);

  const matchValidate = path.match(/^\/admin\/users\/([^/]+)\/validate$/);
  const matchBlock    = path.match(/^\/admin\/users\/([^/]+)\/block$/);

  if (matchValidate && method === 'PUT') return setStatus(env, matchValidate[1], 'active');
  if (matchBlock    && method === 'PUT') return setStatus(env, matchBlock[1], 'blocked');

  return json({ error: 'not found' }, 404);
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────

async function listUsers(env) {
  const rows = await env.DB.prepare(`
    SELECT
      p.id, p.email, p.nom, p.cognoms, p.role, p.status, p.created_at,
      COALESCE(hb.hores_disponibles, 0) AS hores_disponibles
    FROM profiles p
    LEFT JOIN hour_balance hb ON hb.user_id = p.id
    ORDER BY p.created_at DESC
  `).all();

  return json(rows.results ?? []);
}

// ── PUT /api/admin/users/:id/validate|block ───────────────────────────────────

async function setStatus(env, userId, status) {
  const user = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(userId).first();
  if (!user) return json({ error: 'not found' }, 404);

  await env.DB.prepare(
    "UPDATE profiles SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(status, userId).run();

  // Si s'activa, envia email de benvinguda amb magic link
  if (status === 'active' && env.RESEND_API_KEY) {
    const baseUrl = env.BASE_URL || 'https://malditasmaquinas.com';

    // Genera un magic link directe per a la primera entrada
    const token     = await randomHex(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    await env.DB.prepare(
      'INSERT INTO magic_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, userId, expiresAt).run();

    const link = `${baseUrl}/app/?token=${token}`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MalditasMaquinas <hola@malditasmaquinas.com>',
        to: [user.email],
        subject: 'Compte actiu · MalditasMaquinas',
        html: `
          <p>Hola ${user.nom},</p>
          <p>El teu compte ja està actiu. Pots accedir al teu panell i comprar hores.</p>
          <br>
          <p><a href="${link}" style="background:#e04d10;color:#fff;padding:12px 24px;text-decoration:none;font-family:monospace;">Accedeix ara</a></p>
          <p><em>Aquest link caduca en 24h.</em></p>
          <br>
          <p>— MalditasMaquinas</p>
        `,
      }),
    });
  }

  return json({ ok: true, status });
}

async function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}
