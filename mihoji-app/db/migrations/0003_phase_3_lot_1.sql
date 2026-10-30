alter table users
  add column if not exists ui_mode text not null default 'simple'
  check (ui_mode in ('simple', 'expert'));

alter table workspaces
  add column if not exists kind text not null default 'business'
  check (kind in ('business', 'agency'));
