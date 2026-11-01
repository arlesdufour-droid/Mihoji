-- Phase Q, lot 2 : journal des générations de sites par le modèle de design (création, changement de style), avec leur coût réel.

CREATE TABLE IF NOT EXISTS "site_generations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid,
  "task" text NOT NULL CHECK ("task" IN ('create', 'restyle')),
  "request" text NOT NULL,
  "company" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "status" text NOT NULL CHECK ("status" IN ('succeeded', 'failed')),
  "attempts" integer NOT NULL DEFAULT 1,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "cache_read_tokens" integer NOT NULL DEFAULT 0,
  "cache_write_tokens" integer NOT NULL DEFAULT 0,
  "duration_ms" integer NOT NULL DEFAULT 0,
  -- Coût réel estimé de l'appel, en euros (« shadow cost »).
  "shadow_cost_eur" numeric(10, 6) NOT NULL DEFAULT 0,
  "site" jsonb,
  "error" text,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "site_generations_created_idx" ON "site_generations" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "site_generations_workspace_idx" ON "site_generations" ("workspace_id", "created_at" DESC);
