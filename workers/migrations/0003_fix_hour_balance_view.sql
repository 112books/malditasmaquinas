-- Migració 0003 — corregeix hour_balance view (p.user_id → p.id AS user_id)
-- Executar: Cloudflare → D1 → malditasmaquinas-db → Console

DROP VIEW IF EXISTS hour_balance;

CREATE VIEW hour_balance AS
SELECT
  p.id AS user_id,
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
    WHERE c.user_id = p.id AND c.estat != 'tancat'
  ), 0)
  AS hores_disponibles
FROM profiles p
LEFT JOIN purchases pu ON pu.user_id = p.id
GROUP BY p.id;
