-- Run this in Supabase SQL Editor if sync fails with missing column errors
-- (safe to run more than once)

-- 002: borrower last-edited date (display string, same format as joined_date)
alter table public.borrowers
  add column if not exists updated_at text;

update public.borrowers
set updated_at = joined_date
where updated_at is null;

-- 003: optional loan description
alter table public.loans
  add column if not exists description text not null default '';
