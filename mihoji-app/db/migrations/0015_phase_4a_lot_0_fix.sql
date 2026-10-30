-- Phase 4a, correctif lot 0 : jetons {{company.email}} et {{company.phone}} dans les blocs Contact figés.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE mihoji_contact_tokens AS
SELECT
  pf.project_id,
  pf.path,
  fb.hash AS old_hash,
  fb.content AS old_content,
  regexp_replace(fb.content, '>[^<>]*@[^<>]*<br\s*/?>\s*0\d{9}<', '>{{company.email}}<br />{{company.phone}}<', 'g') AS new_content
FROM project_files pf
JOIN file_blobs fb ON fb.hash = pf.hash
WHERE fb.content ~ '>[^<>]*@[^<>]*<br\s*/?>\s*0\d{9}<';

ALTER TABLE mihoji_contact_tokens ADD COLUMN new_hash text;
UPDATE mihoji_contact_tokens SET new_hash = encode(digest(new_content, 'sha256'), 'hex') WHERE new_content <> old_content;

INSERT INTO file_blobs (hash, content)
SELECT DISTINCT new_hash, new_content FROM mihoji_contact_tokens WHERE new_hash IS NOT NULL
ON CONFLICT (hash) DO NOTHING;

UPDATE project_files pf SET hash = r.new_hash, updated_at = now()
FROM mihoji_contact_tokens r
WHERE pf.project_id = r.project_id AND pf.path = r.path AND r.new_hash IS NOT NULL;

UPDATE project_versions pv SET files_snapshot = jsonb_set(pv.files_snapshot, ARRAY[r.path], to_jsonb(r.new_hash))
FROM mihoji_contact_tokens r
JOIN projects p ON p.id = r.project_id
WHERE pv.id = p.current_version_id AND r.new_hash IS NOT NULL AND jsonb_typeof(pv.files_snapshot) = 'object';

DROP TABLE mihoji_contact_tokens;
