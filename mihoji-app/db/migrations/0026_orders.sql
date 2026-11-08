-- Phase Q, lot 7 (étape 5) : commandes click & collect passées sur les sites, avec paiement Stripe Connect (direct sur le compte du commerçant) ou au retrait.
CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text NOT NULL DEFAULT '',
  "notes" text NOT NULL DEFAULT '',
  "lines" jsonb NOT NULL,
  "total_cents" integer NOT NULL,
  "pickup_at" timestamptz NOT NULL,
  "payment_mode" text NOT NULL CHECK ("payment_mode" IN ('online', 'on_pickup')),
  "status" text NOT NULL DEFAULT 'confirmed' CHECK ("status" IN ('pending_payment', 'confirmed', 'collected', 'cancelled', 'refunded')),
  "stripe_account_id" text,
  "stripe_session_id" text,
  "stripe_payment_intent_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "orders_project_pickup_idx" ON "orders" ("project_id", "pickup_at");
