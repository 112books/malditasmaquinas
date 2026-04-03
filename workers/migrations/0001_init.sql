-- Migració 0001 — estructura inicial
-- Executar: wrangler d1 execute malditasmaquinas-db --file=migrations/0001_init.sql

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,          -- uuid, = user JWT sub
  email       TEXT UNIQUE NOT NULL,
  nom         TEXT,
  cognoms     TEXT,
  nif         TEXT,
  adreca      TEXT,
  poblacio    TEXT,
  cp          TEXT,
  pais        TEXT DEFAULT 'ES',
  telefon     TEXT,
  role        TEXT DEFAULT 'client',     -- 'client' | 'admin'
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ── hour_packages (catàleg) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hour_packages (
  id              TEXT PRIMARY KEY,
  nom             TEXT NOT NULL,
  hores           REAL NOT NULL,
  preu_eur        REAL NOT NULL,         -- sense IVA
  caducitat_dies  INTEGER NOT NULL,
  stripe_price_id TEXT,
  actiu           INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO hour_packages (id, nom, hores, preu_eur, caducitat_dies) VALUES
  ('pkg_minim',    'mínim',     0.5,  35,  30),
  ('pkg_basic',    'bàsic',     1,    60,  90),
  ('pkg_mitja',    'mitjà',     3,   150, 150),
  ('pkg_estandard','estàndard', 5,   225, 210),
  ('pkg_pro',      'pro',      10,   380, 300),
  ('pkg_avancat',  'avançat',  20,   600, 365);

-- ── purchases ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES profiles(id),
  package_id          TEXT NOT NULL REFERENCES hour_packages(id),
  stripe_session_id   TEXT UNIQUE,
  stripe_payment_intent TEXT,
  preu_pagat_eur      REAL,
  status              TEXT DEFAULT 'pending',  -- 'pending' | 'paid' | 'refunded'
  hores_comprades     REAL,
  expires_at          TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- ── consultations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES profiles(id),
  titol               TEXT,
  pregunta            TEXT NOT NULL,
  adjunts_r2_keys     TEXT,              -- JSON array de keys a R2
  hores_descomptades  REAL DEFAULT 0.25,
  estat               TEXT DEFAULT 'pendent',  -- 'pendent' | 'resposta' | 'tancat'
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

-- ── responses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS responses (
  id                TEXT PRIMARY KEY,
  consultation_id   TEXT NOT NULL REFERENCES consultations(id),
  admin_id          TEXT NOT NULL REFERENCES profiles(id),
  text              TEXT NOT NULL,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ── Vista: hour_balance ───────────────────────────────────────────────────────
CREATE VIEW IF NOT EXISTS hour_balance AS
SELECT
  p.user_id,
  COALESCE(SUM(
    CASE
      WHEN pu.status = 'paid' AND (pu.expires_at IS NULL OR pu.expires_at > datetime('now'))
      THEN pu.hores_comprades
      ELSE 0
    END
  ), 0)
  -
  COALESCE((
    SELECT SUM(c.hores_descomptades)
    FROM consultations c
    WHERE c.user_id = p.user_id AND c.estat != 'tancat'
  ), 0)
  AS hores_disponibles
FROM profiles p
LEFT JOIN purchases pu ON pu.user_id = p.id
GROUP BY p.user_id;
