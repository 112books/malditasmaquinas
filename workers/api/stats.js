/**
 * stats.js — Proxy GoatCounter API
 *
 * GET /api/stats/:metric?period=...
 * metric: hits | browsers | systems | sizes | locations
 */

import { json } from './index.js';

const GC_BASE = 'https://malditasmaquinas.goatcounter.com/api/v0';

export async function handleStats(request, env, path, url) {
  if (!env.GOATCOUNTER_TOKEN) return json({ error: 'no token' }, 500);

  // Extreu la mètrica del path: /stats/browsers → browsers
  const metric = path.replace('/stats/', '').split('/')[0];
  const allowed = ['hits', 'browsers', 'systems', 'sizes', 'locations'];
  if (!allowed.includes(metric)) return json({ error: 'mètrica no vàlida' }, 400);

  const period = url.searchParams.get('period') || 'week';
  const limit  = url.searchParams.get('limit')  || '20';

  const gcUrl = `${GC_BASE}/stats/${metric}?limit=${limit}&period=${period}`;

  const resp = await fetch(gcUrl, {
    headers: { Authorization: `Bearer ${env.GOATCOUNTER_TOKEN}` },
  });

  const data = await resp.json();
  return json(data, resp.status);
}
