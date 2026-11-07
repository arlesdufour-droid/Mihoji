-- Phase Q, lot Q3 : photos Pixabay hébergées par Mihoji.
-- Les conditions de l'API Pixabay interdisent d'afficher les images depuis leurs serveurs : les photos retenues sont téléchargées
-- puis servies par /api/hosted-photos/<id>. Une photo n'est téléchargée qu'une fois (clé : source + identifiant d'origine).
CREATE TABLE IF NOT EXISTS "hosted_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" text NOT NULL,
  "source_id" text NOT NULL,
  "mime" text NOT NULL,
  "data" bytea NOT NULL,
  "credit_name" text NOT NULL,
  "credit_url" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("source", "source_id")
);
