CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "name" text NOT NULL,
  "current_version_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "file_blobs" ("hash" text PRIMARY KEY, "content" text NOT NULL);
CREATE TABLE IF NOT EXISTS "project_files" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "path" text NOT NULL,
  "hash" text NOT NULL REFERENCES "file_blobs"("hash"),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("project_id", "path")
);
CREATE TABLE IF NOT EXISTS "project_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "parent_version_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" text NOT NULL,
  "summary" text NOT NULL,
  "files_snapshot" jsonb NOT NULL,
  "status" text NOT NULL
);
