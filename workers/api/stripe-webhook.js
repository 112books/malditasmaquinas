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
import { emailHtml, emailAdminHtml, sendEmail } from './email.js';

// Mapa amount_subtotal (cèntims, preu base sense IVA) → package_id de D1
const AMOUNT_TO_PACKAGE = {
  4235:   'pkg_minim',     // 42,35 € (35 € + 21% IVA)
  7260:   'pkg_basic',     // 72,60 € (60 € + 21% IVA)
  19965:  'pkg_mitja',     // 199,65 € (165 € + 21% IVA)
  31460:  'pkg_estandard', // 314,60 € (260 € + 21% IVA)
  60500:  'pkg_pro',       // 605,00 € (500 € + 21% IVA)
  108900: 'pkg_avancat',   // 1.089,00 € (900 € + 21% IVA)
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

  const baseUrl = 'https://malditasmaquinas.com';
  const importEur = (session.amount_total / 100).toFixed(2);

  // ── Email a l'admin ──────────────────────────────────────────────────────────
  await sendEmail(env, {
    to: 'hola@malditasmaquinas.com',
    subject: `💳 Pagament rebut: ${pkg.nom} — ${user.nom}`,
    html: emailAdminHtml({
      titol: 'Pagament rebut',
      contingut: `
        <p style="margin:0 0 .5rem;font-size:.8rem;color:#7a7570;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:.08em;">pagament confirmat</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:1.25rem;">
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;width:120px;">Client</td>
              <td style="padding:.35rem 0;"><strong>${esc(user.nom)}</strong> · ${esc(user.email)}</td></tr>
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;">Paquet</td>
              <td style="padding:.35rem 0;"><strong>${esc(pkg.nom)}</strong> · ${pkg.hores}h</td></tr>
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;">Import</td>
              <td style="padding:.35rem 0;color:#e04d10;font-size:1.1rem;font-weight:700;">${importEur} €</td></tr>
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;">Caduca</td>
              <td style="padding:.35rem 0;">${expiresAt.slice(0, 10)}</td></tr>
        </table>
      `,
      cta_text: 'Veure panell admin',
      cta_url: `${baseUrl}/app/`,
    }),
  });

  // ── Email al client ──────────────────────────────────────────────────────────
  await sendEmail(env, {
    to: user.email,
    subject: `Compra confirmada: paquet ${pkg.nom} · MalditasMaquinas`,
    html: emailHtml({
      titol: 'Compra confirmada',
      contingut: `
        <p style="margin:0 0 1.25rem;">Hola <strong>${esc(user.nom)}</strong>,</p>
        <p style="margin:0 0 1rem;">Hem rebut el teu pagament. Ja pots enviar consultes.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:1.5rem;background:#0d0c0b;padding:1rem;">
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;width:100px;">Paquet</td>
              <td style="padding:.35rem 0;"><strong>${esc(pkg.nom)}</strong> · ${pkg.hores}h</td></tr>
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;">Import</td>
              <td style="padding:.35rem 0;color:#e04d10;font-weight:700;">${importEur} € (IVA inclòs)</td></tr>
          <tr><td style="padding:.35rem 0;color:#9a958e;font-size:.85rem;">Caduca</td>
              <td style="padding:.35rem 0;">${expiresAt.slice(0, 10)}</td></tr>
        </table>
        <p style="margin:0;font-size:.85rem;color:#9a958e;">Accedeix al teu panell per enviar la primera consulta. Et responem en menys de 24h en dies laborables.</p>
      `,
      cta_text: 'Envia la primera consulta',
      cta_url: `${baseUrl}/app/`,
    }),
  });

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
