CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "display_name" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "workspace_members" (
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "role" text NOT NULL DEFAULT 'member',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("workspace_id", "user_id")
);
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL UNIQUE REFERENCES "workspaces"("id"),
  "plan_id" text NOT NULL DEFAULT 'starter',
  "credits_remaining" integer NOT NULL DEFAULT 136400,
  "credits_used" integer NOT NULL DEFAULT 2500000,
  "monthly_allowance" integer NOT NULL DEFAULT 1000000,
  "period_end" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
