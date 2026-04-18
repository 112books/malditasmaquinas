/**
 * stats.js — Proxy GoatCounter API
 *
 * GET /api/stats/:metric?period=...
 * metric: total | hits | browsers | systems | sizes | locations
 */

import { json } from './index.js';

const GC_BASE = 'https://malditasmaquinas.goatcounter.com/api/v0';

// GoatCounter necessita start/end en ISO date, no un nom de període
function periodToRange(period) {
  const end   = new Date();
  const start = new Date();
  switch (period) {
    case 'week':      start.setDate(start.getDate() - 7);   break;
    case 'month':     start.setDate(start.getDate() - 30);  break;
    case 'quarter':   start.setDate(start.getDate() - 90);  break;
    case 'half-year': start.setDate(start.getDate() - 180); break;
    case 'year':      start.setDate(start.getDate() - 365); break;
    default:          start.setDate(start.getDate() - 7);
  }
  const fmt = d => d.toISOString().split('T')[0];
  return `start=${fmt(start)}&end=${fmt(end)}`;
}

export async function handleStats(request, env, path, url) {
  if (!env.GOATCOUNTER_TOKEN) return json({ error: 'no token' }, 500);

  // Extreu la mètrica del path: /stats/browsers → browsers
  const metric = path.replace('/stats/', '').split('/')[0];
  const allowed = ['total', 'hits', 'browsers', 'systems', 'sizes', 'locations'];
  if (!allowed.includes(metric)) return json({ error: 'mètrica no vàlida' }, 400);

  const period = url.searchParams.get('period') || 'week';
  const limit  = url.searchParams.get('limit')  || '20';
  const range  = periodToRange(period);

  const gcUrl = `${GC_BASE}/stats/${metric}?limit=${limit}&${range}`;

  let resp;
  try {
    resp = await fetch(gcUrl, {
      headers: { Authorization: `Bearer ${env.GOATCOUNTER_TOKEN}` },
    });
  } catch (err) {
    return json({ error: `fetch failed: ${err.message}` }, 502);
  }

  // Llegim sempre com a text primer per evitar crashes si no és JSON
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return json({
      error: `GoatCounter HTTP ${resp.status} — resposta no JSON`,
      raw: text.slice(0, 300),
    }, 502);
  }

  // GoatCounter retorna errors com { "error": "..." }
  if (!resp.ok) {
    return json({
      error: `GoatCounter HTTP ${resp.status}`,
      detail: data?.error || data,
    }, resp.status);
  }

  return json(data);
}
