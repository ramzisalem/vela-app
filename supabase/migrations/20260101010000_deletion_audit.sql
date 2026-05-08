-- Account deletion two-step infrastructure (file 14 + file 03).

create table if not exists public.account_deletion_requests (
  token uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.account_deletion_audit (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  deleted_at timestamptz not null default now()
);

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_audit enable row level security;
-- No client policy: only service role / Edge Functions touch these.
