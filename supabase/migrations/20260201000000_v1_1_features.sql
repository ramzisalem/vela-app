-- v1.1 schema additions (files 33, 37, 38, 44, 45).
--
-- Tables:
--   monthly_wrapped         — generated monthly recap payload (file 38)
--   experiments             — N-of-1 experiments (file 44)
--   yoy_insights_cache      — cached AI YoY chip copy (file 45)
--
-- Diary is local-only (encrypted on-device WatermelonDB), so no server table.
-- HealthKit snapshots are local-only (file 33 "On-device first").
-- Correlations are local-only; only aggregated (r, p, n) numbers ever leave.

create table public.monthly_wrapped (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,         -- YYYY-MM
  payload jsonb not null,      -- the WrappedCard[] array
  generated_at timestamptz not null default now(),
  ai_cards_ready boolean not null default false,
  color_seed text,
  unique (user_id, month)
);

alter table public.monthly_wrapped enable row level security;
create policy "users own wrapped" on public.monthly_wrapped
  for all using (auth.uid() = user_id);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hypothesis jsonb not null,
  primary_metric text not null,
  secondary_metrics text[],
  duration_weeks int not null check (duration_weeks in (4, 6, 8)),
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('planning', 'active', 'completed', 'aborted')),
  baseline_routine_snapshot jsonb not null,
  user_prediction jsonb,
  compliance_log jsonb not null default '[]'::jsonb,
  verdict jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.experiments enable row level security;
create policy "users own experiments" on public.experiments
  for all using (auth.uid() = user_id);

create index experiments_user_status_idx on public.experiments (user_id, status);

create table public.yoy_insights_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  generated_at timestamptz not null default now(),
  insight text not null,
  should_show boolean not null default true,
  unique (user_id, metric)
);

alter table public.yoy_insights_cache enable row level security;
create policy "users own yoy cache" on public.yoy_insights_cache
  for all using (auth.uid() = user_id);

-- Family Sharing scaffolding (file 45). The organizer toggles enable;
-- members must accept invites individually. iOS Family Sharing handles the
-- billing relationship; this table records the in-app relationship.
create table public.family_sharing (
  id uuid primary key default gen_random_uuid(),
  organizer_user_id uuid not null references auth.users(id) on delete cascade,
  enabled_at timestamptz not null default now(),
  unique (organizer_user_id)
);

create table public.family_sharing_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_sharing(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  invite_accepted_at timestamptz,
  share_data_with_organizer boolean not null default false,
  unique (family_id, member_user_id)
);

alter table public.family_sharing enable row level security;
alter table public.family_sharing_members enable row level security;

create policy "organizer reads own family" on public.family_sharing
  for select using (auth.uid() = organizer_user_id);
create policy "organizer writes own family" on public.family_sharing
  for all using (auth.uid() = organizer_user_id);

create policy "member reads own row" on public.family_sharing_members
  for select using (auth.uid() = member_user_id);
create policy "member updates own row" on public.family_sharing_members
  for update using (auth.uid() = member_user_id);
create policy "organizer reads members" on public.family_sharing_members
  for select using (
    family_id in (select id from public.family_sharing where organizer_user_id = auth.uid())
  );

-- Anniversary cards (file 45).
create table public.anniversary_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('one-year', 'two-year', 'three-year', 'five-year')),
  hit_on date not null,
  stats jsonb not null,
  tribute text not null,
  shown_at timestamptz,
  unique (user_id, kind)
);

alter table public.anniversary_cards enable row level security;
create policy "users own anniversaries" on public.anniversary_cards
  for all using (auth.uid() = user_id);
