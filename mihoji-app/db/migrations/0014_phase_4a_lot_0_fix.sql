-- Phase 4a, correctif lot 0 : injection des données entreprise et noms d'espaces lisibles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Normaliser les codes NAF et juridiques stockés en base.
UPDATE companies SET activity = 'Boulangerie et boulangerie-pâtisserie' WHERE activity = '10.71C';
UPDATE companies SET activity = 'Restauration de type rapide' WHERE activity = '56.10C';
UPDATE companies SET activity = 'Programmation informatique' WHERE activity = '62.01Z';
UPDATE companies SET activity = 'Travaux d’installation électrique dans tous locaux' WHERE activity = '43.21A';
UPDATE companies SET legal_form = 'SAS, société par actions simplifiée' WHERE legal_form = '5710';
UPDATE companies SET legal_form = 'SARL, société à responsabilité limitée' WHERE legal_form = '5499';
UPDATE companies SET legal_form = 'Entrepreneur individuel' WHERE legal_form = '1000';
UPDATE companies SET legal_form = 'SA à conseil d’administration' WHERE legal_form = '5306';
UPDATE companies SET legal_form = 'Entreprise individuelle' WHERE legal_form = 'Entreprise enregistrée';

-- 2. Remplacer les données figées dans les fichiers générés par des jetons {{company.*}}.
CREATE TEMP TABLE mihoji_company_tokens AS
SELECT
  pf.project_id,
  pf.path,
  fb.hash AS old_hash,
  fb.content AS old_content,
  regexp_replace(
    replace(replace(replace(fb.content,
      CASE WHEN length(c.activity) > 0 THEN c.activity ELSE chr(1) END, '{{company.activity}}'),
      CASE WHEN length(c.name) > 0 THEN c.name ELSE chr(1) END, '{{company.name}}'),
      CASE WHEN length(c.address) > 0 THEN c.address ELSE chr(1) END, '{{company.address}}'),
    '\m\d{2}\.\d{2}[A-Z]\M', '{{company.activity}}', 'g') AS new_content
FROM project_files pf
JOIN file_blobs fb ON fb.hash = pf.hash
JOIN projects p ON p.id = pf.project_id
JOIN companies c ON c.workspace_id = p.workspace_id;

ALTER TABLE mihoji_company_tokens ADD COLUMN new_hash text;
UPDATE mihoji_company_tokens SET new_hash = encode(digest(new_content, 'sha256'), 'hex') WHERE new_content <> old_content;

INSERT INTO file_blobs (hash, content)
SELECT DISTINCT new_hash, new_content FROM mihoji_company_tokens WHERE new_hash IS NOT NULL
ON CONFLICT (hash) DO NOTHING;

UPDATE project_files pf SET hash = r.new_hash, updated_at = now()
FROM mihoji_company_tokens r
WHERE pf.project_id = r.project_id AND pf.path = r.path AND r.new_hash IS NOT NULL;

UPDATE project_versions pv SET files_snapshot = jsonb_set(pv.files_snapshot, ARRAY[r.path], to_jsonb(r.new_hash))
FROM mihoji_company_tokens r
JOIN projects p ON p.id = r.project_id
WHERE pv.id = p.current_version_id AND r.new_hash IS NOT NULL AND jsonb_typeof(pv.files_snapshot) = 'object';

DROP TABLE mihoji_company_tokens;

-- 3. Rendre les noms d'espaces lisibles (nom de l'entreprise à la place de « email workspace »).
UPDATE workspaces w SET name = c.name
FROM companies c
WHERE c.workspace_id = w.id AND w.name LIKE '% workspace';
