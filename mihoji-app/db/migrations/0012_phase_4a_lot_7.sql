ALTER TABLE "publications" DROP CONSTRAINT IF EXISTS "publications_status_check";
ALTER TABLE "publications" ADD CONSTRAINT "publications_status_check"
  CHECK ("status" IN ('pending', 'published', 'suspended', 'failed'));

CREATE TABLE IF NOT EXISTS "abuse_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "publication_id" uuid NOT NULL REFERENCES "publications"("id"),
  "reason" text NOT NULL,
  "reporter_email" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "abuse_reports_publication_idx"
  ON "abuse_reports" ("publication_id", "created_at");
