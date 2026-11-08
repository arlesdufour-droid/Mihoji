-- Phase Q, lot 7 (étape 3) : demandes reçues par les formulaires des sites (devis, contact).
CREATE TABLE IF NOT EXISTS "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "kind" text NOT NULL CHECK ("kind" IN ('quote', 'contact')),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL DEFAULT '',
  "service" text NOT NULL DEFAULT '',
  "message" text NOT NULL,
  "extra" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'new' CHECK ("status" IN ('new', 'handled')),
  "notification" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "leads_project_created_idx" ON "leads" ("project_id", "created_at" DESC);
