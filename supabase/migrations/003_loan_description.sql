alter table public.loans
  add column if not exists description text not null default '';
