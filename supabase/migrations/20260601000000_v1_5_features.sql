-- v1.5 schema additions (files 34, 35, 49).
--
-- Tables:
--   user_treatments              — treatment-tracking journeys (file 34)
--   user_treatment_side_effects  — side-effect log (file 34)
--   doctor_export_requests       — PDF export job records (file 34)
--   hair_scans                   — hair-tracking sessions (file 35), aggregated only
--   practices                    — Practice tier orgs (file 49)
--   practice_members             — clinicians/staff per practice
--   patient_enrollments          — patient↔practice consent
--   patient_notes                — clinician notes (encrypted at rest)
--   practice_audit_log           — required HIPAA audit trail
--
-- IMPORTANT (file 49): the practice tier NEVER reads diary, HealthKit, or
-- life-stage rows — RLS policies on those tables already restrict to the
-- subject user; we never grant practice members select on them.

-- =============================================================================
-- Treatment tracking (file 34)
-- =============================================================================

create table public.user_treatments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  definition_id text not null,
  custom_name text,
  start_date date not null,
  end_date date,
  status text not null default 'active'
    check (status in ('planning', 'active', 'paused', 'completed', 'abandoned')),
  prescriber_label text,
  notes text,
  has_informed_consent boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_treatments enable row level security;
create policy "users own treatments" on public.user_treatments
  for all using (auth.uid() = user_id);

create index user_treatments_user_status_idx
  on public.user_treatments (user_id, status);

create table public.user_treatment_side_effects (
  id uuid primary key default gen_random_uuid(),
  user_treatment_id uuid not null references public.user_treatments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side_effect_id text not null,
  logged_on date not null,
  severity smallint not null check (severity between 1 and 5),
  notes text,
  resolved boolean not null default false,
  resolved_on date,
  created_at timestamptz not null default now()
);

alter table public.user_treatment_side_effects enable row level security;
create policy "users own side effects" on public.user_treatment_side_effects
  for all using (auth.uid() = user_id);

create table public.doctor_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_treatment_id uuid not null references public.user_treatments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pages_generated_at timestamptz not null default now(),
  pdf_url text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.doctor_export_requests enable row level security;
create policy "users own export requests" on public.doctor_export_requests
  for all using (auth.uid() = user_id);

-- =============================================================================
-- Hair tracking (file 35)
-- =============================================================================
--
-- Photos remain on-device. Server only stores aggregate density scores.

create table public.hair_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_at timestamptz not null,
  density_overall smallint not null check (density_overall between 0 and 100),
  density_crown smallint not null check (density_crown between 0 and 100),
  density_hairline smallint not null check (density_hairline between 0 and 100),
  density_temple_left smallint not null check (density_temple_left between 0 and 100),
  density_temple_right smallint not null check (density_temple_right between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.hair_scans enable row level security;
create policy "users own hair scans" on public.hair_scans
  for all using (auth.uid() = user_id);

create index hair_scans_user_captured_idx
  on public.hair_scans (user_id, captured_at desc);

-- =============================================================================
-- Practice tier (file 49)
-- =============================================================================

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_label text,
  created_at timestamptz not null default now()
);

alter table public.practices enable row level security;
-- Members can read their own practice rows.
create policy "members read own practice" on public.practices
  for select using (
    id in (select practice_id from public.practice_members where user_id = auth.uid())
  );

create table public.practice_members (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'clinician', 'staff')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (practice_id, user_id)
);

alter table public.practice_members enable row level security;
create policy "user reads own membership" on public.practice_members
  for select using (auth.uid() = user_id);
create policy "owner manages members" on public.practice_members
  for all using (
    practice_id in (
      select practice_id from public.practice_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

create table public.patient_enrollments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  patient_label text,
  consent_scopes text[] not null default '{}',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users(id),
  unique (practice_id, patient_user_id)
);

alter table public.patient_enrollments enable row level security;

-- The patient sees their own enrollment and may revoke it.
create policy "patient reads own enrollment" on public.patient_enrollments
  for select using (auth.uid() = patient_user_id);
create policy "patient revokes own enrollment" on public.patient_enrollments
  for update using (auth.uid() = patient_user_id);

-- Practice members read enrollments for their practice; only owners/clinicians
-- can invite or update.
create policy "practice reads enrollments" on public.patient_enrollments
  for select using (
    practice_id in (
      select practice_id from public.practice_members where user_id = auth.uid()
    )
  );
create policy "practice writes enrollments" on public.patient_enrollments
  for all using (
    practice_id in (
      select practice_id from public.practice_members
      where user_id = auth.uid() and role in ('owner', 'clinician')
    )
  );

create table public.patient_notes (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.patient_enrollments(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patient_notes enable row level security;
-- Practice members can read/write notes for their practice's patients.
create policy "practice reads notes" on public.patient_notes
  for select using (
    enrollment_id in (
      select pe.id from public.patient_enrollments pe
      join public.practice_members pm on pm.practice_id = pe.practice_id
      where pm.user_id = auth.uid()
    )
  );
create policy "practice writes notes" on public.patient_notes
  for all using (
    enrollment_id in (
      select pe.id from public.patient_enrollments pe
      join public.practice_members pm on pm.practice_id = pe.practice_id
      where pm.user_id = auth.uid() and pm.role in ('owner', 'clinician')
    )
  );

-- Audit log. Append-only; no select policy for clients (service role reads
-- only). Trigger-based inserts wired in app code.
create table public.practice_audit_log (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  subject_user_id uuid not null references auth.users(id),
  action text not null check (action in (
    'view-scans', 'view-notes', 'add-note', 'export-pdf',
    'invite-patient', 'revoke-patient'
  )),
  occurred_at timestamptz not null default now(),
  metadata jsonb
);

alter table public.practice_audit_log enable row level security;
-- No client-side select. Inserts go through service role only.
