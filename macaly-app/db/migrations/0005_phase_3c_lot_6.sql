alter table subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists status text not null default 'active',
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz;

alter table subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'canceled', 'trialing'));

create table if not exists stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
