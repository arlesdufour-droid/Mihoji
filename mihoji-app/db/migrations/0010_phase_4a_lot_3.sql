CREATE TABLE IF NOT EXISTS "custom_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "hostname" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'active', 'failed')),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
