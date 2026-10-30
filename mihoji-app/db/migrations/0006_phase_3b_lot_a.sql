create table if not exists onboarding_states (
  workspace_id uuid primary key references workspaces(id),
  kind text check (kind in ('business', 'agency')),
  step text not null default 'kind',
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id),
  siret text not null unique,
  siren text not null,
  name text not null,
  legal_form text not null,
  address text not null,
  activity text not null,
  created_at timestamptz not null default now(),
  vat_number text not null,
  status text not null check (status in ('active', 'closed')),
  missing_fields jsonb not null default '{}'::jsonb
);

alter table onboarding_states enable row level security;
alter table companies enable row level security;
revoke all on onboarding_states, companies from anon, authenticated;
