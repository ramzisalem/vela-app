-- Trial extension columns (file 41) and minimal helpers.
-- Adds trial_extended_at + trial_extension_ends_at + has_ever_paid +
-- is_in_trial flags used by the extend-trial Edge Function.

alter table public.profiles
  add column if not exists trial_extended_at timestamptz,
  add column if not exists trial_extension_ends_at timestamptz,
  add column if not exists has_ever_paid boolean not null default false,
  add column if not exists is_in_trial boolean not null default false,
  add column if not exists email_digest_optin boolean not null default false,
  add column if not exists last_digest_sent_at timestamptz,
  add column if not exists cancellation_pending boolean not null default false,
  add column if not exists cancellation_method text;

-- Aging-band sex_at_birth column (file 36 privacy floor).
alter table public.profiles
  add column if not exists sex_at_birth_for_bands text
    check (sex_at_birth_for_bands in ('female','male'));
comment on column public.profiles.sex_at_birth_for_bands is
  'Used only for natural-aging band rendering. Not shared with AI proxy unless aggregated to decade. Not exported in user data exports unless user opts in.';

-- Streaks.
create table if not exists public.streak_day_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  consistency_pct smallint not null,
  consistent boolean not null,
  freeze_applied text not null default 'none',
  freeze_reason text,
  primary key (user_id, date)
);
alter table public.streak_day_records enable row level security;
drop policy if exists "users own streak days" on public.streak_day_records;
create policy "users own streak days" on public.streak_day_records
  for all using (auth.uid() = user_id);

-- Cancel-save attempts (auditable).
create table if not exists public.cancel_save_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_kind text not null,
  reason text not null,
  attempted_at timestamptz not null default now(),
  accepted_at timestamptz
);
alter table public.cancel_save_attempts enable row level security;
drop policy if exists "users own save attempts" on public.cancel_save_attempts;
create policy "users own save attempts" on public.cancel_save_attempts
  for all using (auth.uid() = user_id);

-- Cancel exit-interview responses. PII redacted at write time.
create table if not exists public.cancel_exit_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  free_text text,
  submitted_at timestamptz not null default now(),
  can_be_deleted_at timestamptz not null default (now() + interval '365 days')
);
alter table public.cancel_exit_responses enable row level security;
drop policy if exists "users own exit responses" on public.cancel_exit_responses;
create policy "users own exit responses" on public.cancel_exit_responses
  for all using (auth.uid() = user_id);

-- Scan anchor.
create table if not exists public.scan_anchors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kind text not null default 'none',
  custom_label text,
  day_of_week smallint,
  hour smallint,
  minute smallint,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scan_anchors enable row level security;
drop policy if exists "users own scan anchor" on public.scan_anchors;
create policy "users own scan anchor" on public.scan_anchors
  for all using (auth.uid() = user_id);

-- Feature reveals.
create table if not exists public.feature_reveals (
  user_id uuid not null references auth.users(id) on delete cascade,
  reveal_id text not null,
  status text not null default 'pending',
  shown_at timestamptz,
  engaged_at timestamptz,
  dismissed_at timestamptz,
  re_shown_after timestamptz,
  last_evaluated_at timestamptz not null default now(),
  primary key (user_id, reveal_id)
);
alter table public.feature_reveals enable row level security;
drop policy if exists "users own reveals" on public.feature_reveals;
create policy "users own reveals" on public.feature_reveals
  for all using (auth.uid() = user_id);

-- Life-stage modes.
create table if not exists public.life_stage_modes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  enabled_at timestamptz not null default now(),
  expected_end_date timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  ai_opt_in boolean not null default false,
  clinic_opt_in boolean not null default false,
  acknowledged_at timestamptz not null default now(),
  pause_notifications boolean not null default false,
  pause_streaks boolean not null default false,
  primary key (user_id, id)
);
alter table public.life_stage_modes enable row level security;
drop policy if exists "users own life stages" on public.life_stage_modes;
create policy "users own life stages" on public.life_stage_modes
  for all using (auth.uid() = user_id);
