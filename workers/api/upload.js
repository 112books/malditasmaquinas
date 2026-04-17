/**
 * upload.js — Adjunts a consultes via Cloudflare R2
 *
 * POST /api/upload       → puja un fitxer, retorna { key, nom, mida, tipus }
 * GET  /api/files/:key   → serveix el fitxer (autenticat)
 *
 * Keys: {userId}/{uuid}.{ext}
 * Un client només pot accedir als seus propis fitxers (prefix userId).
 * L'admin pot accedir a qualsevol fitxer.
 */

import { json, unauthorized, verifyJWT } from './index.js';

const MAX_MIDA   = 10 * 1024 * 1024; // 10 MB
const TIPUS_PERMESOS = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

export async function handleUpload(request, env, path) {
  const payload = await verifyJWT(request, env);
  if (!payload) return unauthorized();

  if (!env.R2) return json({ error: 'R2 no configurat al Worker' }, 503);

  if (path === '/upload' && request.method === 'POST') return upload(request, env, payload);

  const matchFile = path.match(/^\/files\/(.+)$/);
  if (matchFile && request.method === 'GET') return serveFile(env, payload, decodeURIComponent(matchFile[1]));

  return json({ error: 'not found' }, 404);
}

// ── POST /api/upload ──────────────────────────────────────────────────────────

async function upload(request, env, payload) {
  let formData;
  try { formData = await request.formData(); }
  catch { return json({ error: 'format multipart invàlid' }, 400); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') return json({ error: 'cap fitxer rebut (camp: file)' }, 400);

  if (file.size > MAX_MIDA) return json({ error: 'fitxer massa gran — màxim 10 MB' }, 413);
  if (file.size === 0)      return json({ error: 'el fitxer és buit' }, 400);
  if (!TIPUS_PERMESOS.has(file.type)) {
    return json({ error: `tipus no permès: ${file.type}` }, 415);
  }

  const nomOriginal = file.name.replace(/[^\w.\-]/g, '_'); // sanitize
  const ext = (nomOriginal.split('.').pop() || 'bin').toLowerCase();
  const key = `${payload.sub}/${crypto.randomUUID()}.${ext}`;

  await env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    },
    customMetadata: {
      originalName: file.name,
      userId: payload.sub,
    },
  });

  return json({ key, nom: file.name, mida: file.size, tipus: file.type }, 201);
}

// ── GET /api/files/:key ───────────────────────────────────────────────────────

async function serveFile(env, payload, key) {
  // Clients només veuen els seus fitxers; admin veu tots
  if (payload.role !== 'admin' && !key.startsWith(`${payload.sub}/`)) {
    return unauthorized();
  }

  const object = await env.R2.get(key);
  if (!object) return json({ error: 'fitxer no trobat' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=3600');
  headers.set('ETag', object.httpEtag);

  return new Response(object.body, { headers });
}
