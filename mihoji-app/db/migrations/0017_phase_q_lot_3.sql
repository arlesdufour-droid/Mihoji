-- Phase Q, lot 3 : cache des recherches de photos (une recherche Unsplash par requête, quota de 50 par heure en mode démonstration).
-- Chaque ligne correspond à une requête normalisée ; "candidates" contient les meilleures photos classées par pertinence.
-- Les lignes de source « unsplash » servent aussi à compter les appels de la dernière heure.

CREATE TABLE IF NOT EXISTS "photo_cache" (
  "query" text PRIMARY KEY,
  "source" text NOT NULL CHECK ("source" IN ('unsplash', 'local')),
  "candidates" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "fetched_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "photo_cache_source_fetched_idx" ON "photo_cache" ("source", "fetched_at" DESC);
