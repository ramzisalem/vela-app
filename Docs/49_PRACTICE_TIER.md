# 49 — Aesthetic Medicine Practice Tier (B2B)

## Why this exists

Aesthetic medicine practices — Botox, filler, laser, microneedling clinics — have a recurring problem: their patients want to see results, but the photos taken in the clinic with phone cameras under fluorescent lights aren't comparable enough to actually show change. Practices end up with patient testimonials that feel anecdotal, before/afters that look unconvincing, and follow-up appointments where they spend half the visit answering "did the treatment work?"

Vela already has the only consumer-grade infrastructure that fixes this: clinically comparable longitudinal capture (file 32). The Practice Tier turns that infrastructure into a B2B product. Practices subscribe; their patients capture at home using the consumer Vela app; the practice gets a dashboard that shows per-patient progress and aggregate practice-wide outcomes.

The strategic value:
- **A separate revenue stream** with much higher per-account margins than consumer subs.
- **Distribution multiplier** — every clinic that adopts Vela becomes a referral source to its patient base. Patients hear about Vela from their doctor, which is the strongest possible context.
- **Validates the data thesis** to investors: "we sell to clinics" is a different conversation than "we have a $79/year app."
- **Defensive moat** — once a clinic has 200 patients tracking on Vela, switching costs are real.

This file specifies the practice tier as a focused, conservative v1 product. We do **not** claim HIPAA compliance at launch (that requires a Business Associate Agreement and significant compliance work); we ship with strong privacy practices framed honestly as "informed consent for outcome research" rather than as a covered medical record system. HIPAA compliance is a v2 milestone.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `08_PAYWALL.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `21_BRAND_SYSTEM.md`, `25_ANALYTICS.md`, `27_CICD.md`, `30_DEEP_LINKING.md`, `34_TREATMENT_TRACKING.md`, `45_LONG_TERM_RETENTION.md`, and `48_LIFE_STAGE_MODES.md`.

---

## Product principles

1. **The patient experience is unchanged.** A patient enrolled with a clinic uses the same Vela app, sees the same data, has the same controls. The clinic relationship is overlay, not replacement.
2. **The patient owns their data, always.** Consent is per-patient, scoped, time-limited, and revocable in two taps from the patient's app.
3. **The clinic sees only what the patient shared.** Default scope is narrow; broader scopes require explicit additional consent.
4. **No medical claims.** The practice tier produces tracking and outcomes data; it does not diagnose, prescribe, or replace clinical judgment.
5. **One vertical at a time.** v1 is aesthetic medicine specifically (injectables, energy-based devices, microneedling). Dermatology, plastic surgery, and other verticals are out of scope until the aesthetic vertical is proven.

---

## What the practice tier is

A web-based dashboard for clinic staff (no mobile app for the clinic side) plus a consent and capture layer in the existing patient mobile app. Two surfaces, two distinct user types:

| Surface | Who uses it | Where it runs |
|---|---|---|
| Practice Dashboard | Clinic staff (owners, providers, MAs) | Web — `practice.getvela.com` |
| Patient mobile app | Patients (the existing Vela consumer app, with new consent flows) | iOS — same app as today |

Patients **don't pay for the consumer subscription** while enrolled with a participating clinic — the clinic's subscription covers the patient's Vela access for the enrollment period. This is a meaningful patient-facing benefit that practices can market as included with treatments.

---

## The practice dashboard

Web-only, responsive, Tailwind-styled to match Vela's design system (file 15). Built as a separate SPA in the same monorepo; deployed to its own subdomain.

### Top-level navigation

```
practice.getvela.com

┌─────────────────────────────────────────────┐
│   ✿ Vela Practice         Dr. Patel     ▼   │
├─────────────────────────────────────────────┤
│                                             │
│   Patients          ●                       │
│   Outcomes                                  │
│   Practice settings                         │
│                                             │
└─────────────────────────────────────────────┘
```

Three sections: Patients, Outcomes, Practice settings.

### Patients section

A searchable list of enrolled patients. Each row:

```
┌─────────────────────────────────────────────────────────────────┐
│  Sarah K.                                                       │
│  Enrolled Jan 12 · Botox glabella · Last scan 4 days ago        │
│  Score trend: ━━╱━━━╱━━╱━━━╱━━╱━╱━━  +3.2 since enrollment      │
└─────────────────────────────────────────────────────────────────┘
```

Tap a row → patient detail screen:

- The patient's first name + last initial only (full name behind a "show full name" tap-target gated on the patient's "share full name with clinic" consent).
- Treatment history (the patient's logged treatments at the clinic, e.g., "Botox glabella, Jan 12, 20 units").
- Per-treatment timeline with pose-corrected scans, charted alongside the expected progression curve from file 34.
- Side-effect log entries the patient marked as "share with my clinic" (default off; per-entry opt-in).
- The patient's in-app diary entries: **never** visible to the clinic, regardless of consent. Privacy floor.
- A "send a note" feature: clinic can send a text note that appears in the patient's app inbox. Patient response is opt-in.

### Outcomes section

Aggregate practice-level analytics — anonymized by default, identifiable only when patients have opted in to identified outcome research:

```
Outcomes — Last 90 days

  Botox glabella (n=47 patients)
    Average score change at week 4:  +2.8
    Average satisfaction (patient-reported): 4.6 / 5
    Side effects logged: 12 of 47 (mild)

  Filler — cheek (n=22 patients)
    [...]

  [Download outcomes report PDF]
```

The download generates a clinic-branded PDF for marketing or regulatory use. Patients who opted in to identified outcome research are individually citable; those who didn't contribute only to aggregates.

### Practice settings

- Clinic name, address, primary contact.
- Provider list (multiple providers per clinic; each gets their own login).
- Treatment offering list (which treatments this clinic offers; controls patient enrollment options).
- Branding — uploaded logo, accent color (used in patient-facing communications).
- Subscription / billing.
- Patient consent template — the clinic uploads their own informed-consent text that patients see at enrollment.

---

## Patient enrollment flow

A patient walks into the clinic for a consult or treatment. The practice provides them a unique enrollment code or QR code on a printed card or via email.

The patient opens (or installs) Vela on their phone, taps a *"Enroll with my clinic"* link in Settings → Connections, scans the QR or types the code. This deep-links to:

```
vela://practice/enroll?code=ABC123
```

Which opens the consent screen.

### Patient consent screen

A multi-step sheet — explicit, friendly, never feels like a EULA wall:

#### Step 1 — Who's enrolling

```
┌──────────────────────────────────────────┐
│   Skin & Co Aesthetics                   │
│   Brooklyn, NY                           │
│                                          │
│   They've invited you to track your      │
│   treatments here in Vela. You'll get a  │
│   free Vela subscription as long as      │
│   you're a patient.                      │
│                                          │
│   What you'll share:                     │
│                                          │
│   ✓ Your scans (face only — never        │
│     photos)                              │
│   ✓ Your treatments at this clinic       │
│   ✓ Side-effect entries (only if you     │
│     mark them shareable)                 │
│                                          │
│   What stays private:                    │
│                                          │
│   ✓ Your diary                           │
│   ✓ Treatments at other clinics          │
│   ✓ Health data from Apple Health        │
│   ✓ Your full name (unless you turn      │
│     this on later)                       │
│                                          │
│   [ Continue ]                           │
└──────────────────────────────────────────┘
```

#### Step 2 — The clinic's consent text

The clinic's own informed-consent text is shown — uploaded by the clinic, formatted by Vela. Required scroll-to-bottom before the *I agree* button is enabled.

#### Step 3 — Confirm scope

```
┌──────────────────────────────────────────┐
│   Final scope                            │
│                                          │
│   The clinic will see:                   │
│                                          │
│   ☑ Scans (numbers and trends)           │
│   ☑ Treatments at Skin & Co              │
│   ☑ Side-effects (per-entry opt-in)      │
│                                          │
│   ☐ My full name                         │
│      (you can turn this on later)        │
│                                          │
│   ☐ My identified outcomes for           │
│      research and marketing materials    │
│      (you can turn this on later)        │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Enroll with Skin & Co         │     │
│   └────────────────────────────────┘     │
│                                          │
│   You can leave anytime in Settings.     │
└──────────────────────────────────────────┘
```

After tap:
1. Patient is enrolled. RevenueCat grants a `practice-enrolled` entitlement covering full Vela Premium for the enrollment duration.
2. The patient's profile is linked to the clinic's `practice_id`.
3. The clinic receives an email + dashboard notification: *"Sarah K. just enrolled."*
4. The clinic's offered treatments now appear as one-tap shortcuts in the patient's treatment-tracking flow (file 34).

### Patient post-enrollment experience

The patient's app gains a small *Enrolled with Skin & Co* chip in Settings → Connections. Otherwise the consumer experience is identical. The patient:

- Captures scans normally.
- Logs treatments via the same flow (with their clinic's offerings prioritized).
- Can adjust consent scope in Settings → Connections → Skin & Co at any time.
- Can leave the clinic in two taps. Leaving immediately revokes all data sharing; the patient retains all their Vela data; the clinic loses access to anything past the leave date.

---

## Consent model in detail

```ts
// src/types/practice.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface PracticeEnrollment {
  id: string;
  patientUserId: string;
  practiceId: string;
  enrolledAt: string;
  endedAt?: string;             // when patient or practice terminates
  scopes: ConsentScope[];
  consentRecordedAt: string;
  consentTextHash: string;      // hash of the consent text the patient saw
  practiceConsentTextVersion: string;
}

export type ConsentScope =
  | 'scans-summary'          // numbers + trends, no photos (default)
  | 'scans-photos'           // photos visible in clinic dashboard (opt-in)
  | 'treatments-at-clinic'   // default
  | 'side-effects-opt-in'    // per-entry; default
  | 'full-name'              // opt-in
  | 'identified-outcomes';   // opt-in for marketing / research

// Default scopes at enrollment: scans-summary + treatments-at-clinic + side-effects-opt-in.
// Everything else requires explicit toggle.
```

### Default scope at enrollment

- ✓ Scans summary (numbers + trend charts; **no photos** by default)
- ✓ Treatments logged at the clinic
- ✓ Side-effects (per-entry opt-in: when logging a side-effect, patient gets a "share with my clinic" toggle)

### Opt-in scopes

- ☐ Photos visible in clinic dashboard (off by default; some patients are fine with this; many aren't)
- ☐ Full name visible (off by default; first name + last initial otherwise)
- ☐ Identified outcomes for research / marketing materials (off by default; required for individual citability in clinic outcome reports)

The patient can toggle any scope at any time. Toggling off is immediate; the clinic dashboard reflects it on next refresh.

### Hard scope floors (never overrideable)

- Diary entries — never visible to the clinic.
- Treatments at other clinics — never visible.
- HealthKit-derived data (sleep, HRV, cycle) — never visible.
- Life-stage mode status (file 48) — never visible. Even if the patient is on HRT or in cancer recovery, the clinic does not see this.

These are non-negotiable, marked in code as floors, lint-enforced.

---

## Treatment data through life-stage mode windows (canonical, resolves SPEC_REVIEW_3 HIGH)

A patient on tretinoin who enables pregnancy mode has her tretinoin treatment **paused** in Vela (file 34's mode-aware contraindication tightening). The clinic side must reflect this honestly without leaking mode state:

- The patient's treatment timeline in the practice dashboard shows tretinoin's full history.
- Sessions during the pregnancy window are **annotated** with a non-specific badge: *"Treatment paused by user setting. Vela hasn't logged tretinoin doses for this period."*
- The badge does NOT reveal pregnancy mode specifically. It reveals that the user has paused logging — which is true and clinically actionable (the clinician can ask the patient about it during their next visit).
- When the mode ends and the user resumes logging, the timeline picks back up. The gap is visible; the reason for the gap stays private to the patient.

This balances medical-safety (clinician knows the data has a gap they should ask about) with privacy (mode itself is never disclosed without the patient's explicit opt-in via Settings → Connections → [Clinic] → "Share my life-stage mode").

### Retroactive consent on mode enable

When a patient enrolled with a clinic enables a new life-stage mode (file 48), the clinic's existing consent scope STANDS. The mode itself isn't shared (per the floor); but data within the patient's existing scopes continues flowing. The patient receives a one-time clarification card on enable:

> *"You're enrolled with Skin & Co. Your treatments and scans during this mode will continue to flow to them under your existing settings. The mode itself stays private. Adjust if you want."*
>
> *[ Adjust sharing ]   [ Got it ]*

Adjusting sharing opens the per-clinic consent screen where the patient can narrow scope or share the mode explicitly.

### Doctor-friendly PDF gets mode context (when patient opts in)

When the patient generates the doctor-friendly PDF (file 34) AND has opted in to share their life-stage mode with the clinic:

- Page 4 of the PDF gets a "Context" section: *"This timeline includes weeks during pregnancy mode (Jan 12 – Sep 1). Some treatments were paused during that window."*
- Without the opt-in, the PDF shows the gap without naming the reason — same behavior as the clinic dashboard.

The patient sees a checkbox before generating: *"Include life-stage mode context in this PDF?"* — default off (privacy-first; user must actively opt in).

---

## What the clinic CAN see by default

```
For each patient, the practice dashboard shows:
  - First name + last initial
  - Enrollment date
  - List of treatments logged at this clinic
  - For each treatment: pose-corrected scan thumbnails (default OFF — only if photo scope opted in), trend chart of scores during treatment window, side-effect entries marked shareable
  - Last scan date
  - Treatment-relevant aggregate score deltas
```

## What the clinic CANNOT see

```
  - Photos of the patient (unless explicit opt-in)
  - Diary entries
  - Treatments at other clinics
  - Apple Health data
  - Life-stage mode status
  - Wrapped retrospectives
  - Routine details
  - Patient's other Vela settings or preferences
  - Patient's full name (unless explicit opt-in)
```

The clinic dashboard is honest about what's hidden:

```
What you can see                    What's hidden by default
✓ Trend charts                      ✗ Photos
✓ Treatments here                   ✗ Diary
✓ Shared side-effects               ✗ Other clinic data
✓ First name, last initial          ✗ Full name
                                    ✗ Health data
```

---

## Schema additions (Supabase)

```sql
-- Practices (the clinic accounts)
create table public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  region text,                     -- ISO country code
  primary_contact_email text not null,
  branding jsonb,                  -- logo URL, accent color
  consent_text text,               -- the clinic's informed-consent text
  consent_text_version text not null default 'v1',
  treatment_offerings text[] not null default '{}', -- TreatmentDefinition IDs
  subscription_status text not null default 'trial',
  created_at timestamptz not null default now()
);

-- Practice users (the clinic staff with access)
create table public.practice_users (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'provider', 'staff')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (practice_id, user_id)
);

-- Patient enrollments
create table public.practice_enrollments (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  ended_at timestamptz,
  scopes text[] not null default array['scans-summary','treatments-at-clinic','side-effects-opt-in'],
  consent_recorded_at timestamptz not null default now(),
  consent_text_hash text not null,
  practice_consent_text_version text not null,
  unique (patient_user_id, practice_id)
);

-- Practice notes sent to patients (the "send a note" feature)
create table public.practice_notes (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  sender_practice_user_id uuid not null references public.practice_users(id),
  body text not null,              -- ≤500 chars
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

-- All tables RLS enabled.
alter table public.practices enable row level security;
alter table public.practice_users enable row level security;
alter table public.practice_enrollments enable row level security;
alter table public.practice_notes enable row level security;
```

### RLS policies — the privacy-floor

Two distinct policy patterns:

**For practice users querying patient data** — only see data scoped via consent:

```sql
create policy "practice users see only consented patient data"
  on public.scan_sessions for select
  using (
    exists (
      select 1 from public.practice_enrollments pe
      join public.practice_users pu on pu.practice_id = pe.practice_id
      where pe.patient_user_id = scan_sessions.user_id
        and pu.user_id = auth.uid()
        and pe.ended_at is null
        and 'scans-summary' = any(pe.scopes)
    )
  );
```

Similar policies for treatment data, side-effect data, etc., each gated on the relevant scope.

**For diary, HealthKit, life-stage data** — explicit *deny* policies for practice users:

```sql
create policy "practice users never see diary"
  on public.diary_entries for select
  using (
    auth.uid() = user_id  -- patient sees their own diary
    -- explicitly NO branch for practice users
  );
```

The diary and life-stage tables have **no select policy that grants access to practice users**, ever. Floor.

---

## Pricing

The practice tier ships with two pricing models:

### Per-patient
$8/month per actively-enrolled patient. Practice pays only for currently enrolled patients (terminated enrollments stop billing the next cycle).

Patients on per-patient plans get full Vela Premium for free during enrollment.

### Flat per-practice
$299/month for unlimited patients, capped at 500 enrollments. Suitable for high-volume practices.

Practice pays a flat fee; all enrolled patients get full Vela Premium for free.

The decision logic — which model fits — is made during onboarding. A clinic with <40 expected patients chooses per-patient; >40 chooses flat. Vela's sales motion makes the recommendation.

---

## Practice onboarding (clinic side)

A clinic doesn't sign up self-serve — there's a sales motion at v1 because each onboarding requires:
1. Verifying the clinic is real (license check, business address).
2. Reviewing and importing their consent text.
3. Configuring their treatment offerings.
4. Training the staff on the dashboard.

A typical onboarding takes ~45 minutes via a video call with Vela's success team. Self-serve onboarding is a v2 feature once the playbook is repeatable.

The clinic gets:
- Branded enrollment cards (PDFs for printing) with QR codes.
- Email templates they can customize for inviting patients.
- A starter outcome report PDF template.

---

## Patient leaves the clinic

Two paths:

1. **Patient initiates leave** — Settings → Connections → Skin & Co → "Leave this clinic." Confirmation: *"Skin & Co will stop seeing your scans, treatments, and notes. Your Vela subscription will continue free for 30 days, then resumes at standard pricing if you want to continue."*
2. **Practice removes patient** — clinic dashboard → patient detail → "End enrollment." Patient gets a notification.

In either case:
- Enrollment row's `ended_at` is set.
- All RLS-gated data immediately invisible to the clinic.
- Patient retains all data they accumulated during enrollment (treatments tracked, scans, etc.).
- Patient gets a 30-day grace window of free Vela Premium (file 46 reactivation rules apply after).

The clinic can re-invite a former patient; the patient must consent again — there's no implicit re-enrollment.

---

## White-label & co-branding

By default, the patient's app shows the clinic's name and logo in:
- Settings → Connections → [Clinic name]
- The treatment-tracking flow when picking a clinic-offered treatment
- The consent screens at enrollment

The patient app does NOT white-label completely — Vela's brand remains primary. Some clinics will ask for full white-label; that's a v2 conversation with significantly higher pricing tier.

A separate "Vela for Practitioners" white-label model is out of scope for v1. The brand calculus: Vela's reputation is the patient's trust signal. If we white-label fully, the patient sees a no-name app that has access to their face data. Patients are more likely to consent if they recognize Vela.

---

## Practice tier security & compliance

This is the most legally-sensitive surface in the spec. Conservative posture:

- **Not HIPAA-compliant at v1.** We do not market as a covered medical record system. The product is framed as "informed-consent outcome tracking," with consent text that explicitly says: *"Vela is not a medical record. Information shared here is not subject to HIPAA-style protections by Vela. You can revoke consent at any time."*
- **HIPAA at v2.** Once we have repeatable demand, sign Business Associate Agreements with practices, conduct a compliance audit, document data flows, and switch on HIPAA-grade encryption + access controls.
- **GDPR-compliant by default.** All data is encrypted at rest, deletable on request, exportable on request, scoped by consent.
- **Audit log per practice user.** Every dashboard action (viewing a patient, exporting a report, sending a note) is logged in `practice_user_audit_log`. Patients can request the audit log of who accessed their data; we provide it on request.
- **No data export to clinic-owned databases at v1.** The clinic can download outcome PDFs, but patient-level CSV exports are out of scope until v2 with proper HIPAA / DPA framework.
- **Clinic staff cannot impersonate patients.** No "log in as patient" feature; auditability would be impossible.

---

## Edge cases

- **Patient enrolled with two clinics simultaneously** — supported. Each enrollment is scoped independently. The patient's app shows both in Settings → Connections.
- **Practice subscription lapses** — enrollments freeze. Patient still has Vela access (we extend a 30-day grace at our cost). Practice has 30 days to renew; if they don't, all enrollments terminate, patients are notified, and they enter the standard lapsed-subscription flow (file 46).
- **Patient was on consumer Premium before enrollment** — consumer subscription is suspended (no double-charging) for the enrollment duration. Resumes if they leave or the clinic ends.
- **Practice deleted** — all enrollments cascade to `ended_at`, patients get a notification, all clinic-side data is wiped within 30 days.
- **Clinic staff member leaves the clinic** — practice owner removes them from `practice_users`; their access to the dashboard is revoked immediately.
- **Patient revokes a scope mid-treatment** — clinic dashboard shows a small flag: *"Patient has narrowed sharing scope on Apr 3."* The clinic does not see what was previously visible.
- **Patient enrolls, then their phone is lost / stolen** — they sign in on a new phone with their Apple ID; enrollment is restored automatically because it's account-bound, not device-bound.
- **Clinic location moves to another country** — the `region` field on the practice is updatable; affects which Vela data center handles the practice's data (if multi-region routing is in place).

---

## Settings — for enrolled patients

In the consumer Vela app, Settings → Connections gains a new section:

```
Enrolled clinics

  Skin & Co Aesthetics                        >
  Brooklyn, NY · Enrolled Jan 12

  ─────────────────────────────────────────
  Manage clinic enrollments                  >
```

Tapping the clinic opens a detail screen:

```
Skin & Co Aesthetics

  What you're sharing:
  ☑ Scans (numbers and trends)
  ☐ Photos in clinic dashboard
  ☐ My full name
  ☐ Identified outcomes for research

  Notes from the clinic:
  · "Looking forward to seeing you for your follow-up." Apr 2

  ─────────────────────────────────────────
  Leave this clinic                          >
  See who's accessed my data                 >
```

The "See who's accessed my data" link surfaces the audit log: *"Dr. Patel viewed your timeline on Apr 2 at 3:14 PM."* Honesty as a feature.

---

## Brand voice for the clinic-facing surface

The practice dashboard is **not** the consumer app's brand. It's still Vela, but the tone shifts a notch toward professional clinical UI without becoming sterile. Specifically:

- Cream surface remains; serif headlines remain.
- Copy is more direct, less editorial. *"View patient timeline"* not *"Open Sarah's journey."*
- No exclamation marks anywhere (consistent with file 21).
- No "ammazing transformation" / "results" language. *"Score change"* not *"results."*
- Outcome PDFs for marketing have stricter copy review.

---

## Analytics

Practice-tier-specific events (separate event prefix to keep analytics dashboards clean):

| Event | Properties |
|---|---|
| `practice_signup_initiated` | `region` |
| `practice_account_activated` | `pricing_model: 'per-patient'|'flat-practice'` |
| `practice_enrollment_invited` | `practice_id` |
| `practice_enrollment_started` | `practice_id` |
| `practice_enrollment_completed` | `practice_id, scopes_count` |
| `practice_consent_scope_changed` | `practice_id, scope, action: 'granted'|'revoked'` |
| `practice_dashboard_viewed_patient` | `practice_id, patient_id_hashed` (hashed for analytics) |
| `practice_outcome_pdf_generated` | `practice_id, treatment_id, patient_count_bucket` |
| `practice_note_sent` | `practice_id, length_bucket: '<50'|'50-200'|'200-500'` |
| `practice_enrollment_ended` | `practice_id, days_enrolled_bucket, ended_by: 'patient'|'practice'` |
| `practice_patient_audit_log_viewed` | (consumer-side event) |

Patient-side events for practice flows are tagged with `via_practice: true` to enable funnels.

---

## Pre-launch checklist

- [ ] `practice.getvela.com` SPA built, deployed, accessible
- [ ] Practice dashboard auth via Supabase Auth + practice_users role
- [ ] Patient enrollment via deep link `vela://practice/enroll?code=...`
- [ ] Consent screen displays clinic's uploaded consent text correctly
- [ ] Default scope: scans-summary + treatments-at-clinic + side-effects-opt-in
- [ ] Photo opt-in toggle changes RLS policy results within 5 seconds
- [ ] Diary, HealthKit, life-stage data NEVER returned to practice queries (RLS test)
- [ ] Audit log records every practice dashboard read action
- [ ] Patient can view audit log of who accessed their data
- [ ] Patient can leave clinic in two taps; clinic loses access immediately
- [ ] Practice subscription lapse: 30-day grace, then enrollments terminate
- [ ] Outcome PDF generation works with branded clinic logo
- [ ] White-label branding applies in patient's app for the enrolled clinic
- [ ] Two pricing models tested in RevenueCat sandbox (per-patient + flat)
- [ ] First-party billing: practices billed via Stripe (web) or RC (mobile-bridge)
- [ ] Consent text version tracked; if practice updates text, existing patients re-consent at next app open
- [ ] HIPAA disclaimer in consent text reviewed by legal counsel
- [ ] Patient leaving consumer Premium → suspended cleanly during enrollment
- [ ] Brand voice review: dashboard copy, outcome PDF templates, consent screens
- [ ] PostHog events scrub patient names; patient IDs hashed
- [ ] Sentry breadcrumbs scrub patient body / name fields
- [ ] First clinic onboarding playbook documented
- [ ] Sales motion: enrollment cards designed (PDF), email templates customizable
- [ ] Maestro flow: practice onboards → invites patient → patient enrolls → first scan → clinic sees timeline
- [ ] Maestro flow: patient revokes photo consent mid-treatment → clinic dashboard reflects within minutes
- [ ] Maestro flow: practice ends enrollment → patient gets notified, consumer Premium resumes
- [ ] Persona check: a clinic owner walks through the dashboard and finds it useful in 10 minutes
- [ ] Privacy floor lint rule: any new data table must explicitly grant or deny practice-user access; CI fails if undefined
