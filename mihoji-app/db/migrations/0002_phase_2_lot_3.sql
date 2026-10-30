CREATE TABLE IF NOT EXISTS "credit_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "project_id" uuid,
  "version_id" uuid,
  "task" text NOT NULL,
  "model" text NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "amount" integer NOT NULL,
  "shadow_cost" integer NOT NULL DEFAULT 0,
  "reason" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
