# 34 — Treatment Tracking

## Why this exists

The most-googled before/after photos in skincare are treatment progressions: tretinoin month 1 vs. month 6, accutane day 1 vs. day 180, finasteride at one year, Botox before and three weeks after. People take these photos themselves on couches and in bathrooms with inconsistent lighting, and end up with timelines that aren't comparable enough to actually show change.

Vela has the only piece of infrastructure that fixes this — clinically comparable longitudinal capture (file 32). Treatment tracking is the feature that turns that infrastructure into a use case people will pay for. It directly serves the **Priya** persona (who is 15% of the target distribution and the highest LTV) and unlocks meaningful adjacent audiences: men on finasteride, anyone on accutane, post-cosmetic-procedure tracking, melasma & rosacea management.

The feature is also a distribution play. A dermatologist who recommends "log your tretinoin progress in Vela so we can review at our six-month follow-up" gives Vela a referral source that none of the looksmaxxing competitors can earn.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `07_ONBOARDING.md`, `09_ROUTINE.md`, `10_DASHBOARD.md`, `11_COMPARISON.md`, `13_SHARE_CARDS.md`, `18_PERSONAS.md`, and `20_INFORMATION_ARCHITECTURE.md`.

---

## Product principles

1. **Treatments are journeys, not products.** A treatment has a start, an end, an expected progression, and side effects. The UX is timeline-shaped, not catalogue-shaped.
2. **We frame, never prescribe.** Vela never recommends a treatment. We help users log and observe one they've chosen (with their dermatologist or otherwise).
3. **The user owns the narrative.** Side-effect tracking, photo annotation, the ability to mark a week "not representative" — these belong to the user. Vela never overrides what they say.
4. **Doctor-friendly export is a feature, not an afterthought.** A 4-page PDF the user can email to their dermatologist before a follow-up is the single biggest value driver here.
5. **Honesty about expectations.** Tretinoin makes skin worse before it gets better. Vela says so, every day, in the routine copy and in the timeline view. Users who don't see the dip-then-recover won't blame the product if we set the expectation upfront.

---

## The treatment library

A curated set of treatments Vela can track. Each entry contains evidence-based defaults, an expected progression curve, and copy that explains what to look for. The library lives client-side as a JSON bundled with the app and updated via remote config.

```ts
// src/types/treatment.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface TreatmentDefinition {
  id: TreatmentId;
  displayName: string;          // "Tretinoin"
  category: TreatmentCategory;
  evidenceLevel: 'strong' | 'moderate' | 'limited';
  expectedDurationWeeks: number; // typical observable window
  primaryFaceMetrics: FaceMetric[]; // which sub-scores to highlight
  expectedProgression: ProgressionMarker[];
  commonSideEffects: SideEffect[];
  contraindications: string[];     // plain language, not medical
  educationCopy: TreatmentCopy;
  requiresPrescription: boolean;
  genderRelevance: 'all' | 'men' | 'women' | 'cycle-relevant';
}

export type TreatmentId =
  // Topical actives
  | 'tretinoin' | 'retinol' | 'azelaic-acid' | 'niacinamide'
  | 'salicylic-acid' | 'benzoyl-peroxide' | 'hydroquinone'
  | 'tranexamic-acid' | 'vitamin-c-serum'
  // Oral
  | 'isotretinoin' | 'spironolactone' | 'finasteride' | 'dutasteride'
  | 'minoxidil-oral'
  // Topical anti-androgen / hair
  | 'minoxidil-topical'
  // Procedures
  | 'botox' | 'filler-cheek' | 'filler-lip' | 'filler-jaw'
  | 'microneedling' | 'chemical-peel-light' | 'chemical-peel-medium'
  | 'laser-ipl' | 'laser-fractional' | 'laser-vascular'
  // Hormonal
  | 'hrt-estrogen' | 'hrt-testosterone'
  // Custom
  | 'other';

export type TreatmentCategory =
  | 'topical' | 'oral' | 'procedure' | 'hormonal' | 'lifestyle';

export interface ProgressionMarker {
  weekNumber: number;
  expected: string;             // "Skin may flake and look slightly red — this is normal."
  visualCue?: 'getting-worse' | 'plateau' | 'getting-better';
}

export interface SideEffect {
  id: string;
  name: string;                 // "Dryness"
  severity: 'common' | 'occasional' | 'rare';
  whenToWorry?: string;         // "If it lasts past week 8 or feels burning, talk to your doctor."
}

export interface TreatmentCopy {
  shortDescription: string;     // 1-line for selection list
  whatItIs: string;             // 80-150 word user-facing explainer
  whatToExpect: string;         // 80-150 words, week-by-week framing
  consistencyNote: string;      // 30-word reminder, used in routine UI
}

export type FaceMetric =
  | 'overall' | 'redness' | 'clarity' | 'eyeArea'
  | 'cheekVolume' | 'jawDefinition' | 'symmetry'
  | 'hairlineDensity' | 'crownDensity'; // hair metrics from file 35
```

### Three example library entries

```jsonc
{
  "id": "tretinoin",
  "displayName": "Tretinoin",
  "category": "topical",
  "evidenceLevel": "strong",
  "expectedDurationWeeks": 24,
  "primaryFaceMetrics": ["clarity", "redness", "eyeArea"],
  "expectedProgression": [
    { "weekNumber": 1, "expected": "Mild dryness or peeling. Stinging is common.", "visualCue": "getting-worse" },
    { "weekNumber": 4, "expected": "The retinization period — skin may break out or look rough. Stay the course.", "visualCue": "getting-worse" },
    { "weekNumber": 8, "expected": "Texture starting to smooth. Redness easing.", "visualCue": "plateau" },
    { "weekNumber": 12, "expected": "Most users see their first clear improvements around now.", "visualCue": "getting-better" },
    { "weekNumber": 24, "expected": "Cumulative changes in fine lines and tone are visible.", "visualCue": "getting-better" }
  ],
  "commonSideEffects": [
    { "id": "dryness", "name": "Dryness", "severity": "common" },
    { "id": "peeling", "name": "Peeling", "severity": "common" },
    { "id": "redness", "name": "Redness", "severity": "common" },
    { "id": "purging", "name": "Initial breakouts (purging)", "severity": "common" },
    { "id": "sun-sensitivity", "name": "Sun sensitivity", "severity": "common", "whenToWorry": "Always pair with daily SPF — your skin is more vulnerable to UV." }
  ],
  "contraindications": ["pregnancy", "breastfeeding"],
  "requiresPrescription": true,
  "genderRelevance": "all",
  "educationCopy": {
    "shortDescription": "Prescription-strength retinoid for texture and tone.",
    "whatItIs": "Tretinoin is a vitamin A derivative your dermatologist may prescribe…",
    "whatToExpect": "It often gets worse before it gets better. The first month or two…",
    "consistencyNote": "Apply at night, on dry skin, pea-sized amount, every other night to start."
  }
}
```

(Other entries — accutane/isotretinoin, Botox, finasteride, melasma combo, vitamin C, etc. — follow the same schema. The full library should ship with ~30 entries at launch and grow over time.)

---

## User-side treatment instance

```ts
export interface UserTreatment {
  id: string;
  userId: string;
  definitionId: TreatmentId;
  customName?: string;          // for "other" or user-renamed
  startDate: string;            // YYYY-MM-DD
  endDate?: string;             // optional — open-ended for ongoing treatments
  status: 'active' | 'paused' | 'completed' | 'stopped-early';
  prescribedBy?: string;        // free text, "Dr. Patel"
  notes?: string;               // free text, user's private notes
  // The face baseline against which progress is measured.
  // First scan after startDate becomes baseline if startDate is in the future.
  baselineSessionId?: string;
  // Side effects logged by date.
  sideEffectLog: { date: string; sideEffectId: string; severity: 1 | 2 | 3 }[];
  // Weeks the user has marked as "not representative" (skip from analysis).
  excludedWeeks: string[];      // YYYY-W## format
  createdAt: string;
  updatedAt: string;
}
```

These rows sync to Supabase (with RLS) under `user_treatments` and `user_treatment_side_effects` tables. Photos remain on-device.

### Supabase schema additions

Add to file 03:

```sql
create table public.user_treatments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  definition_id text not null,
  custom_name text,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active','paused','completed','stopped-early')),
  prescribed_by text,
  notes text,
  baseline_session_id uuid references public.scan_sessions(id) on delete set null,
  excluded_weeks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.user_treatments enable row level security;
alter table public.user_treatment_side_effects enable row level security;

create policy "users own treatments" on public.user_treatments
  for all using (auth.uid() = user_id);
create policy "users own side effects" on public.user_treatment_side_effects
  for all using (auth.uid() = user_id);
```

---

## Onboarding into a treatment

Treatment tracking is **not** a primary onboarding question — most users don't have a treatment to log on day one. The path to it is:

### Entry points (any of these)
1. Settings → *Track a treatment* → tap *Start a new one*.
2. Routine screen → soft *"Are you starting a treatment?"* card visible only when the AI routine generation has detected high-evidence active products in the user's profile.
3. Dashboard insights card → after several weeks of unusual change, *"If you started a treatment recently, log it here for clearer comparisons."*
4. Direct deep link from a doctor/influencer (`vela://treatment/start?id=tretinoin`) — sends the user straight to the new-treatment sheet pre-populated.

### The new-treatment sheet

Bottom sheet, friendly tone:

> **What are you trying?**
>
> *(Search field with category chips: Topical · Oral · Procedure · Hormonal · Other)*

After selection, the sheet expands:

> **Tretinoin**
>
> *Prescription-strength retinoid for texture and tone.*
>
> [ Read more about this ]
>
> ---
>
> **When did you start?** *Date picker, defaults to today*
>
> **Did a doctor prescribe it?** *Optional text field*
>
> **Anything you'd like to remember?** *Optional notes*
>
> ---
>
> [ Start tracking ]

After tap:
1. The user lands on the new treatment timeline view (described below).
2. A passive nudge fires from the next scan reveal: *"Your first scan with tretinoin will set your baseline. Catch us at the same time of day next week and we're set."*
3. The routine engine (file 09) re-runs, biasing toward complementary tasks (gentle cleanser, ceramide moisturizer, daily SPF) and removing contraindicated ones (other strong actives).

### "Other" / custom treatments

If the user picks *Other*, the sheet collapses to:

> **What are you trying?** *Free text*
>
> **Category?** *Topical · Oral · Procedure · Hormonal · Lifestyle*
>
> **Which face areas would you like us to watch?** *Multi-select chips: Overall · Skin clarity · Redness · Eye area · Cheek volume · Jaw · Symmetry · Hair*
>
> **Expected duration?** *4 weeks · 12 weeks · 6 months · Ongoing*
>
> **Side effects to watch for?** *Optional, comma-separated, 5 max*

These build a synthetic `TreatmentDefinition` for that user only. The AI proxy gets a different prompt for custom treatments — it knows we don't have curated copy and frames everything more cautiously.

---

## The treatment timeline view

The defining screen of this feature. Lives at `vela://treatment/[id]` and is reachable from the dashboard once an active treatment exists.

### Layout, top to bottom

1. **Header card** — treatment name (serif), days elapsed, expected duration. Soft cream background.
   > *Tretinoin · Week 6 of 24*
2. **Hero comparison** — side-by-side or slider of (baseline scan) vs. (most recent scan), pose-corrected and lighting-normalized via file 32. Single tap toggles slider/side-by-side. The user's primary metrics for this treatment (e.g., clarity + redness for tretinoin) show as percentage deltas underneath.
3. **Progress curve** — the sub-scores the treatment is supposed to move, plotted against the *expected progression curve* for this treatment (file 36 aging band style — a soft shaded region of "what's typical at this point"). Lets the user see when they're tracking ahead, on, or behind expected.
4. **Scan timeline** — horizontal scroll of every scan since baseline, each showing a tiny thumbnail + date + delta. Tapping any scan opens it in the comparison view with baseline.
5. **Side effects journal** — log a side effect today (sheet with the curated list + severity 1–3). Below, a compact heatmap-by-week of past side-effect entries.
6. **What to expect this week** — a single sentence pulled from `expectedProgression` for the current week. *"Most users start seeing texture smooth out around now."*
7. **Notes** — user's private free-text journal for this treatment. Cross-references file 37 (diary).
8. **Mark this week as "not representative"** — a small, easy-to-find toggle. *"Sick this week? Travelled? Not on the regimen?"* Tap to add the current week to `excludedWeeks`. Excluded weeks render as ghosted rows in the timeline.

### Edge case copy

- **First scan since starting** (no baseline yet): *"Your next scan will be your tretinoin baseline. We'll start tracking from there."*
- **In the "gets worse" phase** (week 2–6 for tretinoin): *"You're in the rough patch. This is normal. The first improvements typically show up around week 12."* The progression curve also visually bottoms out, so the user sees their trajectory is in the expected dip, not failing.
- **Plateau without progress** (no movement after `0.7 × expectedDurationWeeks`): *"You're past most users' usual response window. Worth checking in with your doctor or considering what to try next. Vela can keep tracking."* Never *"This isn't working."*
- **User stops early**: *Are you stopping for now, taking a break, or finished?* — three options that map to `stopped-early` / `paused` / `completed`. The history is preserved in either case.

---

## Comparison view enhancements

When a comparison happens between two scans that both fall inside a treatment window, the comparison view (file 11) gains:

- A small chip in the header: *"Tretinoin · Week 1 vs. Week 12"*
- The volume/heatmap overlay (file 32) defaults to *on* in this mode.
- Side-effect markers from those weeks appear as small tags below each photo: *"Logged: dryness (mild)"*.

---

## Doctor-friendly export

The single highest-leverage UX detail in this feature.

### Reveal gating (file 43)

The PDF export button is NOT visible immediately upon entering the treatment timeline. It's gated behind file 43's reveal calendar — surfaces at week 8–10 of treatment OR on the user's second logged treatment, whichever comes first. The reveal card explains:

> *"You can export a clean summary of this treatment to share with your doctor. Useful before follow-up appointments. Here's how."*

After the reveal, the button persists in the timeline header. This prevents the polished output from feeling like an extraction request to first-time users still learning the basic timeline view.

### What it is

A 4-page PDF the user can generate from the treatment timeline header → *Share with my doctor*. Saved to the iOS Files app or shared via system share sheet.

### Contents

- **Page 1: Cover** — user's first name (no surname unless typed), treatment name and dates, baseline + most recent scan side by side (pose-corrected, watermarked unobtrusively). Vela wordmark in muted footer.
- **Page 2: Progress at a glance** — a clean line chart of the primary face metrics over the treatment window with the expected curve overlaid. Caption explains what each axis means.
- **Page 3: Notable scans** — 4-up grid of evenly spaced scans across the window (e.g., baseline, 25%, 50%, 75%, current). Date and key metric values under each.
- **Page 4: Side effects, notes, and excluded weeks** — table of side-effect entries with severity, the user's free-text notes, and any weeks they marked non-representative.

Footer on every page: *"This is the user's tracking record. It is not a medical document. Vela is not a medical device."*

### Privacy

- The user explicitly chooses what to include before generating. The first time they generate, a sheet asks: *"Include scan photos? · Include side-effect log? · Include free-text notes?"* Defaults all on.
- The PDF lives on-device. It is not uploaded anywhere; the user shares it manually.
- Generated PDFs are stored in `Documents/treatment-exports/` with their treatment ID and a UUID; the user can delete them in Settings → *Storage*.

### Implementation note

Generated client-side using `@react-pdf/renderer` or similar. Pose-corrected photos sourced from the existing capture cache. No new server endpoint needed.

---

## Routine integration

When a user starts tracking a treatment, the routine engine (file 09) is biased:

- **Add complementary tasks (capped at +3 total)** — for tretinoin, ensure: gentle cleanser, ceramide moisturizer, mineral SPF. Tasks are tagged with `complementsTreatments: TreatmentId[]`.

  **Cap rule (resolves SPEC_REVIEW_3 HIGH on file 34):** treatment-driven additions never expand the routine beyond +3 tasks total. If a 3rd complementary task would push the user's routine size beyond a soft ceiling of 8 daily tasks (the ceiling that keeps streak achievement realistic per file 39), the engine presents a swap choice:

  > *"To track tretinoin well, we'd add ceramide moisturizer. Want to swap it for one of your current tasks, or add it anyway?"*

  Tap-options:
  - **Swap with…** → opens a list of current tasks; user picks one to remove.
  - **Add it anyway** → routine size increases (user's choice, with full agency).
  - **Skip this addition** → routine stays as-is; the treatment timeline still tracks normally.

  This prevents the failure mode where logging tretinoin silently doubles a user's routine length, breaks their streak (file 39), and causes abandonment.
- **Remove contraindicated tasks** — for tretinoin, AHAs / BHAs / strong physical scrubs are removed and replaced.
- **Add a treatment-specific task** — e.g., *"Apply tretinoin (pea-sized, every other night to start)"* with the user's chosen frequency.
- **Surface the consistency note** — `treatmentDefinition.educationCopy.consistencyNote` shows as a small tip card above the routine until the user dismisses it.

The routine card on the home screen gets a soft *"Tretinoin · Week 6"* chip when an active treatment is being tracked.

---

## AI integration

A new prompt joins file 06: `TREATMENT_INSIGHT_SYSTEM`. Used when generating the weekly score-explanation copy *if* an active treatment overlaps the scan window.

```
You are writing a single observation about how someone's face is changing during a
specific treatment. You are not a doctor.

CONTEXT YOU WILL RECEIVE:
- Treatment ID + display name
- Week number into the treatment
- Expected progression marker for this week (the "expected" string)
- Top 1-2 face-metric deltas this week
- Any side effects logged this week

VOICE:
- Vela voice (file 21).
- No exclamation marks. No emojis.
- No medical advice. Never use the word "diagnose" or "prescribe".
- If user is in an expected-rough phase, name it kindly and frame it as expected.
- If user is ahead of curve, say so plainly without fanfare.
- If user is behind curve, never say "behind" — say "this often takes a bit longer for some people. It's still working its way in."

OUTPUT:
- 2-3 sentences max.
- Always close with a touch of forward motion ("we'll see how next week goes", "keep your routine steady").
```

The custom-treatment variant of the prompt is identical except it omits the "expected progression marker" line and is told to use "we don't have a curated guide for this, so frame everything as observation, not prediction."

---

## Side effect logging UX

Tap *Log a side effect* → bottom sheet:

> **How are you feeling?** *(Header)*
>
> *Chips: Dryness · Peeling · Redness · Burning · Itching · Breaking out · Headache · Mood low · Other*
>
> *(Selected chip expands to show severity dots)*
>
> **How bad?** *Three soft circles, taps select 1 (mild), 2 (moderate), 3 (rough)*
>
> *Optional one-liner: "Anything to add?"*
>
> [ Log it ]

Quick. Five seconds end-to-end.

When severity 3 is logged for a side effect with `whenToWorry` text in the library, the sheet shows that text on save: *"If burning lasts past week 8 or feels intense, talk to your doctor. We'll keep tracking."* Friendly safety net, no panic.

---

## Sharing a treatment journey

A new share-card variant (file 13): *Treatment timeline*.

A vertical card showing baseline → midpoint → current scans (pose-corrected) with the treatment name, weeks elapsed, and a clean delta chart at the bottom. Watermarked. Made for Reels / TikTok / stories.

Important: the share-card flow lets the user pick which scans appear, with a clear preview. Never include side-effect notes or free-text on shareable cards. Those are private.

---

## Privacy & safety

- The treatment library is descriptive, not prescriptive. We never suggest a treatment.
- Contraindications are listed with the treatment but framed as *"things to talk to your doctor about"* — Vela does not screen.
- Pregnancy and breastfeeding contraindications are surfaced gently when picking a known-contraindicated treatment, with a *"Have you talked to your doctor?"* check that does not block the flow but does require a confirm tap.
- **Life-stage modes (file 48) tighten contraindication behavior**: when pregnancy mode is active, contraindicated treatments (tretinoin, isotretinoin, hydroquinone, tazarotene, adapalene, spironolactone, finasteride, dutasteride) are **hard-blocked from new logging** with a clear sheet referring back to the user's doctor. Existing logged treatments are paused but never silently deleted. When cancer-recovery mode is active, all aggressive actives surface stronger warnings (microneedling, peels, lasers); the user retains full agency. When HRT mode is active, hair-affecting treatments coexist with HRT context awareness.
- All treatment data is encrypted at rest in Supabase via standard RLS + the existing data-deletion flow (file 14). Account deletion deletes the treatment history.
- Doctor-friendly PDF includes the disclaimer line on every page.

---

## Edge cases

- **Treatment overlap** — a user can have multiple active treatments at once (very common: tretinoin + spironolactone, or finasteride + minoxidil). The timeline view supports this; comparisons can be filtered to "since start of <X>" or "since start of all current treatments."
- **Treatment retroactive logging** — user remembers they started tretinoin three months ago. Start date can be set in the past; baseline is the closest scan to that date. If no scan exists from then, baseline is the first scan after.
- **Treatment changes mid-stream** — user goes from 0.025% to 0.05% tretinoin. Logged as a *strength change* event in `notes` field; doesn't reset the timeline.
- **Stopped-early vs paused** — distinct statuses. Paused can resume; stopped-early cannot but can be re-started as a new instance.
- **Pregnancy** — if a user logs pregnancy in HealthKit, contraindicated treatments (tretinoin, isotretinoin, hydroquinone, others) trigger a single, gentle in-app card: *"Some active treatments aren't recommended during pregnancy. If yours is on that list, your doctor will guide you. Vela will keep tracking your skin through this."* No alert, no badge — one card, dismissible, never re-shown.
- **User undoes a side-effect log** — tap a logged entry → *Edit* / *Remove*. Removed entries are deleted, not soft-archived (this is sensitive personal health data).
- **Custom treatment that turns out to be in the library** — when the user types a custom name that strongly matches a known treatment ID (Levenshtein), prompt: *"Is this Tretinoin? We have a guide for it."* Tap to convert.

---

## Analytics events

| Event | Properties | Notes |
|---|---|---|
| `treatment_started` | `definition_id, custom: bool, has_prescriber: bool, expected_duration_weeks` | Never log free-text fields |
| `treatment_baseline_set` | `treatment_id, days_from_start_to_baseline` | |
| `treatment_timeline_viewed` | `treatment_id, weeks_in` | |
| `treatment_side_effect_logged` | `treatment_id, side_effect_id, severity` | |
| `treatment_excluded_week` | `treatment_id` | |
| `treatment_pdf_generated` | `treatment_id, included_photos: bool, included_side_effects: bool, included_notes: bool` | |
| `treatment_status_changed` | `treatment_id, from_status, to_status` | |
| `treatment_share_card_created` | `treatment_id, format: vertical|horizontal` | |
| `treatment_pregnancy_warning_shown` | `treatment_id` | |

PII rule: free-text `customName`, `prescribedBy`, `notes` are never sent to analytics.

---

## Pre-launch checklist

- [ ] Treatment library shipped with at least 25 entries
- [ ] Library JSON validated against schema in CI
- [ ] Library remote-config fetch with 7-day cache + stale-while-revalidate
- [ ] Tretinoin, isotretinoin, finasteride, Botox, microneedling each have full education copy reviewed by a dermatologist consultant
- [ ] Pregnancy + breastfeeding contraindication cards fire once, never repeatedly
- [ ] Custom treatment flow validated with 4 internal users
- [ ] Routine engine bias verified for tretinoin (gentle cleanser, ceramide moisturizer, SPF added; AHAs removed)
- [ ] Doctor-friendly PDF renders on iPhone 13 mini through 15 Pro Max without overflow
- [ ] PDF disclaimer footer on every page
- [ ] Pose-corrected scan thumbnails in PDF (verified visually)
- [ ] Side-effect logging round-trip in <8 seconds (manual test)
- [ ] Treatment timeline view loads under 600ms with 24 scans
- [ ] Mark-week-non-representative shown in timeline as ghosted
- [ ] Multiple-treatment overlap UX verified (tretinoin + spiro)
- [ ] Retroactive start-date flow doesn't break baseline assignment
- [ ] Share-card *Treatment timeline* variant respects light + dark, watermarked
- [ ] PostHog events scrubbed of free-text fields
- [ ] Sentry breadcrumbs strip `notes` field on errors
- [ ] Account deletion (file 14) cascades user_treatments + side effects
- [ ] Deep link `vela://treatment/start?id=...` validates ID against library before rendering
- [ ] Voice rule audit: no exclamation marks anywhere in education copy
- [ ] Persona check: Priya (treatment tracker) walkthrough end-to-end with tretinoin
