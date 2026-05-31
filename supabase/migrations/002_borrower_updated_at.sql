-- Track when a borrower profile was last edited (display date string, same format as joined_date)
alter table public.borrowers
  add column if not exists updated_at text;

update public.borrowers
set updated_at = joined_date
where updated_at is null;
