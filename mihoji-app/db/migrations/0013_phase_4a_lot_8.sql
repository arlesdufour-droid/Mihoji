CREATE TABLE IF NOT EXISTS "support_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid REFERENCES "workspaces"("id"),
  "email" text NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'closed')),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_requests_status_idx"
  ON "support_requests" ("status", "created_at");
