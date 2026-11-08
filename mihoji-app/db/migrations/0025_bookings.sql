-- Phase Q, lot 7 (étape 4) : rendez-vous pris sur les sites, avec acompte Stripe Connect (paiement direct sur le compte du commerçant).
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "service" text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "duration_minutes" integer NOT NULL,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text NOT NULL DEFAULT '',
  "notes" text NOT NULL DEFAULT '',
  "total_cents" integer NOT NULL DEFAULT 0,
  "due_cents" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'confirmed' CHECK ("status" IN ('pending_payment', 'confirmed', 'cancelled', 'refunded')),
  "stripe_account_id" text,
  "stripe_session_id" text,
  "stripe_payment_intent_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "bookings_project_starts_idx" ON "bookings" ("project_id", "starts_at");
