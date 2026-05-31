-- LoanBook: single-user schema with Row Level Security (each user sees only their rows)

create table if not exists public.borrowers (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  joined_date text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.partners (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null default '',
  start_date text not null,
  status text not null check (status in ('Active', 'Inactive')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.loans (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  borrower_id text not null,
  principal numeric not null,
  principal_outstanding numeric not null,
  rate numeric not null,
  rate_period text not null check (rate_period in ('monthly', 'yearly')),
  start_date text not null,
  status text not null check (status in ('Active', 'Pending', 'Closed')),
  purpose text not null default '',
  accrued_interest numeric not null default 0,
  interest_collected numeric not null default 0,
  last_payment_date text,
  interest_log jsonb not null default '[]'::jsonb,
  partner_shares jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.payments (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  loan_id text not null,
  borrower_id text not null,
  date text not null,
  amount numeric not null,
  type text not null check (type in ('interest_only', 'full_settlement')),
  interest_amount numeric not null,
  principal_amount numeric not null,
  mode text not null,
  reference text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists borrowers_user_id_idx on public.borrowers (user_id);
create index if not exists partners_user_id_idx on public.partners (user_id);
create index if not exists loans_user_id_idx on public.loans (user_id);
create index if not exists payments_user_id_idx on public.payments (user_id);

alter table public.borrowers enable row level security;
alter table public.partners enable row level security;
alter table public.loans enable row level security;
alter table public.payments enable row level security;
alter table public.user_settings enable row level security;

create policy "borrowers_own" on public.borrowers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "partners_own" on public.partners
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "loans_own" on public.loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "payments_own" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings_own" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
