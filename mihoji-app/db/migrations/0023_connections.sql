-- Phase Q, lot 7 (étape 2) : connexions du commerçant à ses outils (Brevo, Stripe, agendas…).
-- Les jetons sont chiffrés (AES-256-GCM) avant d'arriver ici ; jamais lisibles côté navigateur.
CREATE TABLE IF NOT EXISTS "connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "provider" text NOT NULL CHECK ("provider" IN ('stripe', 'brevo', 'google-calendar', 'calendly', 'shop-sync', 'google-business')),
  "account_label" text NOT NULL DEFAULT '',
  "credentials" text NOT NULL,
  "scopes" text[] NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("workspace_id", "provider")
);
