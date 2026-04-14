-- Actualització de preus (abril 2026)
UPDATE hour_packages SET preu_eur = 150 WHERE id = 'pkg_mitja';
UPDATE hour_packages SET preu_eur = 225 WHERE id = 'pkg_estandard';
UPDATE hour_packages SET preu_eur = 380 WHERE id = 'pkg_pro';
UPDATE hour_packages SET preu_eur = 600 WHERE id = 'pkg_avancat';
