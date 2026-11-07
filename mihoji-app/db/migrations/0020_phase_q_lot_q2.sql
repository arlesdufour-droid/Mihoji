-- Phase Q, lot Q2 : réponses de l'onboarding (spécialités, ce qui distingue l'entreprise, horaires) et photos de l'utilisateur.
-- "profile" : informations réelles fournies par l'utilisateur, seules données autorisées pour les horaires et les chiffres du site.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "profile" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Photos envoyées par l'utilisateur (logo, boutique, réalisations) : prioritaires sur les photos Unsplash.
-- Images redimensionnées côté serveur (1600 px au plus), servies par /api/site-photos/<id>.
CREATE TABLE IF NOT EXISTS "site_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces" ("id"),
  "kind" text NOT NULL CHECK ("kind" IN ('logo', 'shop', 'work', 'other')),
  "alt" text NOT NULL DEFAULT '',
  "mime" text NOT NULL,
  "data" bytea NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "site_photos_workspace_idx" ON "site_photos" ("workspace_id", "created_at");
