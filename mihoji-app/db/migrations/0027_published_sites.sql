-- Publication multi-tenant : une seule application sert tous les sites publiés selon le nom d'hôte.
-- Chaque site publié a un sous-domaine unique et une copie figée (« snapshot ») de la version publiée : description structurée + coordonnées de l'entreprise.
CREATE TABLE IF NOT EXISTS "published_sites" (
  "project_id" uuid PRIMARY KEY REFERENCES "projects"("id") ON DELETE CASCADE,
  "subdomain" text NOT NULL UNIQUE CHECK ("subdomain" ~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$' AND "subdomain" !~ '--'),
  "version_id" uuid REFERENCES "project_versions"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'live' CHECK ("status" IN ('live', 'unpublished', 'blocked')),
  "snapshot" jsonb NOT NULL,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Domaines personnalisés : statut en attente / vérifié / erreur, enregistrements DNS à créer, redirection du domaine nu vers www.
ALTER TABLE "custom_domains" DROP CONSTRAINT IF EXISTS "custom_domains_status_check";
UPDATE "custom_domains" SET "status" = 'verified' WHERE "status" = 'active';
UPDATE "custom_domains" SET "status" = 'error' WHERE "status" = 'failed';
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_status_check" CHECK ("status" IN ('pending', 'verified', 'error'));
ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "records" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "redirect_to" text;
ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "checked_at" timestamptz;
ALTER TABLE "custom_domains" ADD COLUMN IF NOT EXISTS "verified_at" timestamptz;
CREATE INDEX IF NOT EXISTS "custom_domains_project_idx" ON "custom_domains" ("project_id");
