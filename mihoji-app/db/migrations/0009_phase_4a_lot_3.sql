CREATE TABLE IF NOT EXISTS "publications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "version_id" uuid NOT NULL REFERENCES "project_versions"("id"),
  "url" text NOT NULL,
  "status" text NOT NULL CHECK ("status" IN ('pending', 'published', 'failed')),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
