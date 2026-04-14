/**
 * hours.js — Gestió d'hores i compres
 *
 * GET /api/hours/balance    → saldo actual de l'usuari
 * GET /api/hours/purchases  → historial de compres
 */

import { json, unauthorized, verifyJWT } from './index.js';

export async function handleHours(request, env, path) {
  const payload = await verifyJWT(request, env);
  if (!payload) return unauthorized();

  if (path === '/hours/balance'   && request.method === 'GET') return balance(env, payload);
  if (path === '/hours/purchases' && request.method === 'GET') return purchases(env, payload);

  return json({ error: 'not found' }, 404);
}

// ── GET /api/hours/balance ────────────────────────────────────────────────────

async function balance(env, payload) {
  const row = await env.DB.prepare(
    'SELECT hores_disponibles FROM hour_balance WHERE user_id = ?'
  ).bind(payload.sub).first();

  return json({ hores_disponibles: row?.hores_disponibles ?? 0 });
}

// ── GET /api/hours/purchases ──────────────────────────────────────────────────

async function purchases(env, payload) {
  const rows = await env.DB.prepare(`
    SELECT
      pu.id, pu.status, pu.hores_comprades, pu.preu_pagat_eur,
      pu.expires_at, pu.created_at,
      hp.nom AS paquet_nom
    FROM purchases pu
    JOIN hour_packages hp ON hp.id = pu.package_id
    WHERE pu.user_id = ?
    ORDER BY pu.created_at DESC
  `).bind(payload.sub).all();

  return json(rows.results ?? []);
}
