alter table public.loans
  add column if not exists value_limit numeric not null default 0;
