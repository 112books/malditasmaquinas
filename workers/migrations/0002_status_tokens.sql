-- Migració 0002 — status d'usuari, magic tokens i preus actualitzats
-- Executar: wrangler d1 execute malditasmaquinas-db --file=migrations/0002_status_tokens.sql

-- ── Status a profiles ─────────────────────────────────────────────────────────
-- 'pending'  → registrat, pendent de validació per l'admin
-- 'active'   → validat, pot comprar i enviar consultes
-- 'blocked'  → bloquejat (spam, etc.)
ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'pending';

-- ── Magic link tokens ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS magic_tokens (
  token       TEXT PRIMARY KEY,          -- 32 bytes hex, únic
  user_id     TEXT NOT NULL REFERENCES profiles(id),
  expires_at  TEXT NOT NULL,             -- datetime ISO, 15 min
  used        INTEGER DEFAULT 0
);

-- Índex per netejar tokens caducats
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens(expires_at);

-- ── Actualització preus paquets ───────────────────────────────────────────────
UPDATE hour_packages SET preu_eur = 165 WHERE id = 'pkg_mitja';
UPDATE hour_packages SET preu_eur = 260 WHERE id = 'pkg_estandard';
UPDATE hour_packages SET preu_eur = 500 WHERE id = 'pkg_pro';
UPDATE hour_packages SET preu_eur = 900 WHERE id = 'pkg_avancat';
