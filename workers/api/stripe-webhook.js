/**
 * stripe-webhook.js — Confirma pagaments de Stripe
 *
 * POST /api/stripe-webhook
 *
 * Flux esperat:
 * 1. Stripe envia checkout.session.completed
 * 2. Verifiquem signatura HMAC-SHA256
 * 3. Creem/actualitzem purchases → status: paid
 * 4. Notifiquem per Telegram + email al client
 */

import { json } from './index.js';

// Mapa amount_total (cèntims) → package_id de D1
// Nota: amount_total és sense IVA quan automatic_tax està desactivat
const AMOUNT_TO_PACKAGE = {
  3500:  'pkg_minim',     // 35 €
  6000:  'pkg_basic',     // 60 €
  16500: 'pkg_mitja',     // 165 €
  26000: 'pkg_estandard', // 260 €
  50000: 'pkg_pro',       // 500 €
  90000: 'pkg_avancat',   // 900 €
};

export async function handleStripeWebhook(request, env) {
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  // ── Verificació signatura Stripe (HMAC-SHA256) ─────────────────────────────
  const valid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error('Stripe: signatura invàlida');
    return json({ error: 'signatura invàlida' }, 400);
  }

  let event;
  try { event = JSON.parse(body); } catch { return json({ error: 'json invàlid' }, 400); }

  if (event.type !== 'checkout.session.completed') {
    return json({ ok: true, ignored: true });
  }

  const session = event.data.object;

  // Identifica el paquet per amount_subtotal (sense IVA, present al payload)
  const amountSubtotal = session.amount_subtotal;
  const packageId      = AMOUNT_TO_PACKAGE[amountSubtotal];

  if (!packageId) {
    console.error('Stripe: amount_subtotal no mapejat:', amountSubtotal);
    return json({ ok: true, warning: 'amount no mapejat', amount_subtotal: amountSubtotal });
  }

  const pkg = await env.DB.prepare('SELECT * FROM hour_packages WHERE id = ?').bind(packageId).first();
  if (!pkg) return json({ error: 'paquet no trobat' }, 500);

  // Troba l'usuari pel correu de Stripe
  const email  = session.customer_details?.email || session.customer_email || '';
  const user   = email ? await env.DB.prepare('SELECT * FROM profiles WHERE email = ?').bind(email.toLowerCase()).first() : null;

  if (!user) {
    console.error('Stripe: usuari no trobat per email:', email);
    // Guardem igualment la compra amb user_id null per no perdre el pagament
    await savePurchase(env, { session, packageId, pkg, userId: null });
    return json({ ok: true, warning: 'usuari no trobat, compra guardada sense vincular' });
  }

  const caducitatMs = pkg.caducitat_dies * 24 * 60 * 60 * 1000;
  const expiresAt   = new Date(Date.now() + caducitatMs).toISOString();
  const purchaseId  = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT OR REPLACE INTO purchases
      (id, user_id, package_id, stripe_session_id, stripe_payment_intent, preu_pagat_eur, status, hores_comprades, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?)
  `).bind(
    purchaseId,
    user.id,
    packageId,
    session.id,
    session.payment_intent,
    (session.amount_total || 0) / 100,
    pkg.hores,
    expiresAt
  ).run();

  // Telegram
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `💳 <b>Pagament rebut</b>\nClient: ${user.nom} (${user.email})\nPaquet: ${pkg.nom} (${pkg.hores}h)\nImport: ${(session.amount_total / 100).toFixed(2)} €\nCaduca: ${expiresAt.slice(0, 10)}`,
        parse_mode: 'HTML',
      }),
    });
  }

  // Email al client
  if (env.RESEND_API_KEY) {
    const baseUrl = env.BASE_URL || 'https://malditasmaquinas.com';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MalditasMaquinas <hola@malditasmaquinas.com>',
        to: [user.email],
        subject: `Compra confirmada: paquet ${pkg.nom} · MalditasMaquinas`,
        html: `
          <p>Hola ${user.nom},</p>
          <p>Hem rebut el teu pagament. Ja tens <strong>${pkg.hores}h</strong> disponibles (paquet <em>${pkg.nom}</em>).</p>
          <p>Caduca: ${expiresAt.slice(0, 10)}</p>
          <br>
          <p><a href="${baseUrl}/app/">Accedeix al teu panell i envia la primera consulta</a></p>
          <p>— MalditasMaquinas</p>
        `,
      }),
    });
  }

  return json({ ok: true });
}

// ── Verificació signatura Stripe ──────────────────────────────────────────────
// Stripe usa t=timestamp,v1=hmac en la capçalera stripe-signature

async function verifyStripeSignature(body, header, secret) {
  if (!secret) return false;
  try {
    const parts    = Object.fromEntries(header.split(',').map(p => p.split('=')));
    const t        = parts['t'];
    const v1       = parts['v1'];
    if (!t || !v1) return false;

    const payload  = `${t}.${body}`;
    const key      = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const sigHex   = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Comparació constant-time
    if (sigHex.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < sigHex.length; i++) diff |= sigHex.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error('verifyStripeSignature error:', e);
    return false;
  }
}
