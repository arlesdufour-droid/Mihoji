create table if not exists company_lookup_cache (
  query text primary key,
  payload jsonb not null,
  expires_at timestamptz not null
);

alter table company_lookup_cache enable row level security;
revoke all on company_lookup_cache from anon, authenticated;
