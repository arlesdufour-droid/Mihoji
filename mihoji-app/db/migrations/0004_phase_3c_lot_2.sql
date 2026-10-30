alter table users enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table subscriptions enable row level security;
alter table projects enable row level security;
alter table file_blobs enable row level security;
alter table project_files enable row level security;
alter table project_versions enable row level security;
alter table credit_ledger enable row level security;

revoke all on all tables in schema public from anon, authenticated;
