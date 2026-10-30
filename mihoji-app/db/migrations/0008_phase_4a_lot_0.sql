CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chat_messages_role_check" CHECK ("role" IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS "chat_messages_project_created_idx"
  ON "chat_messages" ("project_id", "created_at");
