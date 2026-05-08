-- v1.5 — Practice tier read access (file 49), applied after v1_5_features.
--
-- Consent-gated read paths for practice members. Diary, HealthKit, and
-- life-stage tables remain patient-only.

create policy "practice reads patient scans with face consent"
  on public.scan_results
  for select
  using (
    exists (
      select 1
      from public.patient_enrollments pe
      join public.practice_members pm on pm.practice_id = pe.practice_id
      where pe.patient_user_id = scan_results.user_id
        and pm.user_id = auth.uid()
        and pe.revoked_at is null
        and pe.accepted_at is not null
        and 'face-scans' = any (pe.consent_scopes)
    )
  );

create policy "practice reads patient hair with hair consent"
  on public.hair_scans
  for select
  using (
    exists (
      select 1
      from public.patient_enrollments pe
      join public.practice_members pm on pm.practice_id = pe.practice_id
      where pe.patient_user_id = hair_scans.user_id
        and pm.user_id = auth.uid()
        and pe.revoked_at is null
        and pe.accepted_at is not null
        and 'hair' = any (pe.consent_scopes)
    )
  );
