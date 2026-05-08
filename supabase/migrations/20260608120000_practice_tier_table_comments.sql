-- Document practice-tier tables (file 49) for operators. There is no clinician
-- web app; these tables remain for optional B2B enrollment, consented reads
-- (see 20260601100000_practice_consented_reads.sql), and any future API use.
-- This migration does not drop schema or change RLS.

comment on table public.practices is
  'Optional practice org (file 49). Patient data access is scoped by patient_enrollments consent; no staff dashboard ships in-app.';

comment on table public.practice_members is
  'Staff linked to a practice. RLS: users read their own membership row; owners may manage members.';

comment on table public.patient_enrollments is
  'Patient-to-practice consent and scopes (face-scans, hair, etc.). Used by practice consented-read RLS on scan_results and hair_scans.';

comment on table public.patient_notes is
  'Practice-authored notes per enrollment. Not used by the consumer mobile product surface today.';

comment on table public.practice_audit_log is
  'Append-only HIPAA-oriented audit trail; client apps typically have no select policy (service role).';
