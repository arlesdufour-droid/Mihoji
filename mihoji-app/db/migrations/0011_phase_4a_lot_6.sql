CREATE TABLE IF NOT EXISTS "rate_limit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rate_limit_events_key_created_idx"
  ON "rate_limit_events" ("key", "created_at");
