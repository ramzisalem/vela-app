-- =====================================================================
-- Vela initial schema (file 03_BACKEND_SUPABASE.md).
--
-- Tables:
--   profiles, scan_results, routine_state, user_products
-- Plus the missing column reconciliation noted in the plan: profiles.scoring_framework.
--
-- All tables are protected by RLS. Auth tokens go through SecureStore in
-- the client (never AsyncStorage).
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- updated_at trigger fn
-- ---------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_version int not null default 1,

  -- Demographics
  gender text not null check (gender in ('man','woman','non_binary','prefer_not_to_say')),
  scoring_framework text not null check (scoring_framework in ('masculine','feminine','neutral')),
  age int,
  ethnicity text,
  skin_type text,
  country_code text,
  region text,
  climate text,

  -- Physical
  skin_conditions text[],
  hair_situation text,
  facial_hair text,
  face_shape text,
  self_perceived_age int,

  -- Goals
  appearance_goals text[],
  primary_goal text,
  ideal_outcomes text[],
  focus_regions text[],

  -- Routine
  routine_intensity text,
  time_available text,
  budget text,
  spf_habit text,
  active_treatments text[],

  -- Lifestyle
  exercise_frequency text,
  diet text,
  water_intake text,
  sleep_hours text,
  stress_level text,
  substance_habits text[],
  hormonal_factors text[],

  -- Self-perception
  self_perception_notes text,
  recent_procedures text[],

  -- Notifications
  notifications_enabled boolean default false,
  checkin_day int check (checkin_day between 0 and 6),
  checkin_hour int check (checkin_hour between 0 and 23),
  checkin_minute int check (checkin_minute in (0,15,30,45)),

  -- File 36 — aging band
  sex_at_birth_for_bands text check (sex_at_birth_for_bands in ('female','male','unspecified')),
  hide_aging_band boolean default false,

  -- File 41 — trial extension (one ever)
  trial_extended_at timestamptz,

  -- File 47 — cancel save offer used (one ever)
  cancel_save_offer_used text,

  -- File 46 — email digest opt-in (lapsed user lifecycle)
  email_digest_optin boolean default false,

  -- File 48 — life-stage modes (server replica; runtime source is the local store)
  life_stage_modes jsonb default '[]'::jsonb
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at();

alter table public.profiles enable row level security;

create policy "Users can read own profile"
on public.profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update using (auth.uid() = id);

create policy "Users can delete own profile"
on public.profiles for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- scan_results
-- ---------------------------------------------------------------------
create table if not exists public.scan_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  week_number int not null,
  is_baseline boolean not null default false,

  -- Scores (0..100 calibrated)
  score_overall int not null check (score_overall between 0 and 100),
  score_skin int not null check (score_skin between 0 and 100),
  score_symmetry int not null check (score_symmetry between 0 and 100),
  score_grooming int not null check (score_grooming between 0 and 100),
  score_lighting int not null check (score_lighting between 0 and 100),
  score_contour int not null check (score_contour between 0 and 100),
  perceived_age int,

  -- Raw metrics (numeric only; landmarks NEVER leave device)
  symmetry_score real,
  jaw_line_sharpness real,
  face_width_height_ratio real,
  under_eye_area_ratio real,
  redness real,
  blemish_count int,
  pore_visibility real,

  -- Context
  sleep_hours_last_night real,
  stress_note text,
  new_products jsonb default '[]'::jsonb,
  new_treatments jsonb default '[]'::jsonb,
  lighting_band text,

  -- 3D (file 32)
  capture_3d jsonb,
  canonical_pose jsonb,

  -- Quality / explanation
  alignment_summary text,
  pose_error_rad real,
  score_explanation text,
  qualitative_pending boolean default false
);

create index scan_results_user_week_idx on public.scan_results (user_id, week_number desc);

alter table public.scan_results enable row level security;

create policy "Users can read own scans"
on public.scan_results for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
on public.scan_results for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- routine_state
-- ---------------------------------------------------------------------
create table if not exists public.routine_state (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_number int not null,
  generated_at timestamptz not null default now(),
  tasks_json jsonb not null,
  completion_json jsonb not null default '{}'::jsonb,
  current_streak_days int default 0,
  longest_streak_days int default 0,
  last_completed_date date,
  personalization_note text,
  unique (user_id, week_number)
);

alter table public.routine_state enable row level security;

create policy "Users can manage own routine state"
on public.routine_state for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- user_products
-- ---------------------------------------------------------------------
create table if not exists public.user_products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  brand text,
  category text not null,
  started_at date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.user_products enable row level security;

create policy "Users can manage own products"
on public.user_products for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- app_config (for AI model versions, evidence database version, aging band version)
-- read-only to clients via Edge Function only
-- ---------------------------------------------------------------------
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('model.fast', '"gpt-4o-mini"'::jsonb),
  ('model.quality', '"gpt-4o"'::jsonb),
  ('evidence_database_version', '"1.0.0"'::jsonb),
  ('aging_band_version', '"1.0.0"'::jsonb)
on conflict (key) do nothing;

alter table public.app_config enable row level security;
-- No client policy: only the service role / Edge Functions read/write.

-- ---------------------------------------------------------------------
-- subscriptions (RC webhook target — file 03 + file 31)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  rc_app_user_id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  product_id text,
  is_active boolean default false,
  is_trialing boolean default false,
  will_renew boolean default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
on public.subscriptions for select using (auth.uid() = user_id);
