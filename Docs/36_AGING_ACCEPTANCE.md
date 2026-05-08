# 36 — Aging Acceptance Visualization

## Why this exists

Every face-tracking app on the market makes the user feel like aging is a problem to solve. Looksmaxxing apps shame. Beauty apps sell. Even neutral skincare apps inadvertently frame any negative trend as failure. Vela does the opposite: we show what's *expected* at this point in someone's life and what's *controllable*, and we treat the difference between the two as information, not pressure.

This is the single feature that earns the brand the right to call itself "the kind face-tracking app." A user trying tretinoin who sees their fine-lines score dip and reads *"This is roughly what we'd expect at 38 — with or without skincare. The shift you've made since spring is small but in the right direction"* will keep the app open for years. The same user on a competing app sees *"Wrinkle score down 12% — fix it"* and churns within a week.

The feature is also a hard differentiator. A pure tracker that's aging-aware is something nobody else can ship credibly without rebranding their whole product line.

This file extends `06_AI_PROMPTS.md`, `10_DASHBOARD.md`, `11_COMPARISON.md`, `15_DESIGN_SYSTEM.md`, `21_BRAND_SYSTEM.md`, `25_ANALYTICS.md`, and `28_ACCESSIBILITY.md`.

---

## Product principles

1. **Show the band, not a target.** Vela never displays "ideal" or "younger" lines. We show a soft range of *what's typical at this age*, and the user's own trace within or outside it.
2. **Controllable vs. natural — name both clearly.** Sun damage is largely controllable; bone-structure-driven volume change isn't. We never make users feel like they failed at something they couldn't change.
3. **Words matter more than visuals here.** A perfect chart paired with the wrong sentence undoes the work. This file is dense on copy.
4. **No before/after hooks.** "How you'll look in 10 years" generators are a dark pattern. Vela never shows them.
5. **Anxiety-aware defaults.** First-time users see the band on by default with very gentle introductions. Users who turn it off don't get nagged to turn it back on.

---

## What "natural aging band" means

For each measured face metric, we have a soft range of typical year-over-year change for someone in the user's age decade. The range is broad on purpose — humans vary enormously — and is built from peer-reviewed dermatology and gerontology literature rather than from app user data (which would be biased toward people who scan their faces).

| Face metric | Source data | Typical decade-over-decade change |
|---|---|---|
| Skin clarity | Studies of texture, pore visibility, fine lines by decade | Slight gradual decrease, accelerating after 40 |
| Redness | Vasculature studies, skin reactivity | Tends to mildly increase with age, varies hugely by skin type |
| Eye area (periorbital hollowness) | Volumetric MRI studies of orbital fat pad atrophy | Hollowness gradually increases from late 30s |
| Cheek volume | Same volumetric studies on malar fat pad | Decreases ~3–5% per decade after 35 |
| Jaw definition | Skeletal + soft-tissue studies | Decreases (jowl drop) gradually after 40, more sharply after 50 |
| Symmetry | Limited data; modest decline after 60 | Held mostly stable in a wide band |
| Hair density (file 35) | Trichology literature, distinct curves M/F | M: front recession + crown 25→55; F: midline part widening 35→65 |

These curves are stored as a versioned static dataset shipped with the app and updated via remote config. Each curve is parameterized as `(metric, decade, sex_at_birth)` returning `{ percentileBand10: number, percentileBand50: number, percentileBand90: number }` for relative-to-baseline annual change.

> **Source transparency:** every curve cites its references in an "About these bands" sheet accessible from any chart. We don't pretend the data is more precise than it is. The default phrasing on charts uses "around" and "typical" rather than statistical numbers.

### Why decade-bucketed rather than age-precise

Year-by-year precision over-promises. Decade bands preserve honest uncertainty and avoid the trap of suggesting a 39-year-old should panic on their 40th birthday because the curve "shifts."

### Why use sex-at-birth rather than gender

The underlying biology that drives most measurable face-aging signals — bone density, soft-tissue distribution, hair-loss patterns — tracks more closely with sex-at-birth than with gender identity. We collect this in onboarding (file 07) as a *separate, optional* field tied solely to this feature. The user's chosen gender drives every other product surface; the bands are computed against the optional biological field and degrade gracefully (use the broader combined band) if not provided.

> **Sensitivity & UX rule:** the optional ask is single-screen, calmly worded, and easy to skip:
> *"For the natural-aging bands on your charts, it helps if we know your sex assigned at birth. This is separate from the gender you selected earlier and doesn't affect anything else in Vela. You can skip this — we'll just use a broader band."*

---

## Types

```ts
// src/types/aging.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface AgingBand {
  metric: FaceMetric;
  ageDecade: 20 | 30 | 40 | 50 | 60 | 70;
  sexAtBirth: 'female' | 'male' | 'combined';
  // All values are annual-relative-change percentages.
  // E.g., { p10: -8, p50: -3, p90: +1 } means in this decade,
  // 80% of typical annual changes for this metric fall between -8% and +1%.
  band: {
    p10: number;
    p50: number;
    p90: number;
  };
  // For the chart overlay rendering.
  controllabilityHint: 'mostly-controllable' | 'partly-controllable' | 'mostly-natural';
  sourceCitation: string;       // shown in the About sheet
}

export interface UserBandPreferences {
  showOnTrendCharts: boolean;       // default true
  showControllabilityCallouts: boolean; // default true
  optedOutAt?: string;              // when user dismissed the feature
}

export interface AgingContext {
  ageDecade: number;
  sexAtBirth: 'female' | 'male' | 'combined' | 'unknown';
  yearsSinceBaseline: number;       // for cumulative band computation
}
```

---

## Visual treatment

This is the part that makes or breaks the feature. Specs are non-negotiable.

### On the trend chart (file 10 dashboard, file 32 comparison)

```
score
  ┃
80┃                          ╲
  ┃             ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← upper band edge (p90)
  ┃     ░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  ← p10–p90 fill, soft cream gradient
  ┃     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← lower band edge (p10)
  ┃              ●─────●─────●─────●─────●  ← user's actual trace, espresso line
70┃                                          ●
  ┃                                                ●  ← latest scan, sits below the band
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Jan        Apr       Jul      Oct      Jan
```

- **Band fill**: 8% opacity of `text.tertiary` over `surface.primary` in light mode; 14% opacity over `surface.elevated` in dark mode. The band is *background texture*, never visually dominant.
- **Band edges**: dotted strokes at p10 and p90, very thin, `border.subtle` color with 60% opacity.
- **User trace**: the existing user line, unchanged — same espresso color, same weight. The user is the figure; the band is the ground.
- **No labels on the band itself** by default. Tap the chart → bottom sheet shows the band's meaning and citation. (See "Information density" below.)

### Controllability callouts (when the user is outside the band)

If the latest scan is outside the band:

- **Above the band** — single thin chip below the chart: *"You're tracking ahead of typical for your age."* Soft gold dot. No further commentary; no congratulations.
- **Below the band, mostly-controllable metric** — chip: *"This metric is partly within your control. Sun, sleep, stress and consistency all show up here over time."* Linked tap-target: *"What helps?"* opens routine-tasks modal.
- **Below the band, mostly-natural metric** — chip: *"This kind of change is mostly natural at any age. Tracking it gives you a record, not a target."* No "What helps" link. We refuse to imply you can fix bone-structure aging with a serum.

> **Forbidden in this feature:** the words *"reverse," "fight," "combat," "defeat," "lose,"* the suffix *"-ize" (youthful-ize, etc.)*, and any framing of being outside the band as failure. Lint rule in file 21 must catch these.

### Information density rule

The chart is *quieter* with the band on than without it. The band is a soft watercolor wash; the user's line is the only ink. If a glance at the chart makes a user feel anxious, we have failed the brand. UX QA includes a "five users see the chart for the first time, none describe their reaction with a negative emotion word" test.

### About-this-band sheet

Bottom sheet, tap-to-open from any chart with the band visible:

> **What you're seeing**
>
> The soft band is the range we'd expect for someone in their *thirties* over time. It's wide because people vary a lot. Your line is your line — same as it ever was.
>
> **Where this comes from**
>
> Studies in dermatology and gerontology covering thousands of people, summarized into broad age ranges. We list our sources below.
>
> **What we'd never do**
>
> We won't show you a "younger version" of yourself. We won't tell you you're behind. The band is here to give context, never to set a target.
>
> *[ Hide bands on my charts ]   [ See sources ]*

The opt-out lives here, not in Settings. Toggling off hides bands across every chart without further nagging.

---

## Where the band shows up

### Dashboard trend chart (file 10)
Default on for new users. Shows above the user's primary metric. A single chip below: *"Your line vs. a typical decade for your age"*.

### Sub-score detail screens
Each of the 7 sub-scores has its own band. Quietly displayed.

### Comparison slider (file 11)
The slider itself doesn't show bands (it's photographic). But the score deltas displayed below the slider are annotated when meaningful: *"Year-over-year, your fine-lines score is moving roughly in line with what's typical."*

### Treatment timeline (file 34)
Two overlays now appear together: the *expected progression curve* (treatment-specific) AND the *natural aging band* (age-decade-specific). These can intersect or diverge. The chart legend distinguishes them: solid soft band = aging context, dashed line = expected treatment progression.

### Monthly Wrapped (file 38)
One slide is dedicated to "Where you are this month, in context" — gentle band-aware framing.

---

## AI prompt updates

### `SCORE_EXPLANATION_SYSTEM` (file 06) — addendum

Add the following to the existing system prompt:

```
You will sometimes receive an aging context with the user's age decade and whether
their latest score is inside, above, or below the natural-aging band for that decade.

Use this to ground your phrasing:

- INSIDE the band: "Your <metric> is moving along as we'd expect for someone in
  their <decade>." Mention the user's own consistency or lifestyle, never the band
  as praise or criticism.
- ABOVE the band: "You're tracking a touch ahead of typical for your age on
  <metric>." Once. No further fanfare.
- BELOW the band, controllable metric (clarity, redness, eye area):
  "Your <metric> is sitting a bit below typical for the decade. The drivers are
  things you can move — sleep, sun, consistency."
- BELOW the band, natural metric (cheek volume, jaw definition):
  "Your <metric> is a touch below typical for the decade. This is the kind of
  change that's mostly part of how faces shift over time, not something to
  optimize. Tracking it gives you a record, not a target."

NEVER:
- Use words: reverse, fight, combat, defeat, restore, regain, recover-as-vanity,
  youthful, youth, anti-aging, aging issue, problem area.
- Compare the user's age to the decade as though it's a deadline.
- Suggest the user is "behind" or "ahead" in any race.
- Recommend specific products or treatments here. (That's the routine prompt's job.)
```

### `AGING_CONTEXT_GUIDE_SYSTEM` (new — file 06)

Used to generate the "About this band" copy on a per-metric basis if the user taps deeper. Outputs ≤80 words explaining what's typical for the metric in their decade and what affects it.

```
You write a single short paragraph explaining what tends to happen with a face metric
across someone's <decade> and what factors (lifestyle, biology, environment) most
influence it. You never tell the user they should change anything.

VOICE: Vela voice. No urgency. No promise of control beyond what's honest.

OUTPUT: 60–80 words, one paragraph, plain English.

Always close with: "We track it because some people like to know. We don't think
you should aim for any particular shape of curve."
```

---

## Onboarding

The aging-context optional question lives at the very end of the existing 30-question flow, after all required fields are captured. Single screen, easy skip:

> **Optional: sex assigned at birth**
>
> Vela uses this only for the soft "what's typical" bands on your charts later on. It's separate from the gender you selected earlier — and you can skip it.
>
> *[ Female ]    [ Male ]    [ Skip ]*

If skipped, charts use the wider combined band for the user's age decade.

---

## Edge cases

- **User under 25 or over 75** — bands exist for decades 20s through 70s. Anyone outside that range sees a wider "limited data" band and an explanatory note. Never an apology.
- **Massive recent change** — a user who lost 30 lbs and saw their cheek volume drop sharply will fall outside the band hard. The chip in this case reads: *"Your <metric> moved more than usual recently. Tracking it gives you a record."* The diary tag (file 37) for "weight change" suppresses any further band-related callouts for the affected weeks.
- **User on a treatment that intentionally moves a metric** (e.g., filler increasing cheek volume above the band) — the treatment timeline overrides the aging band as the dominant context. The band still shows but the AI prompt's phrasing is treatment-aware: *"Your cheek volume reflects the filler, which is what we'd expect."*
- **User has very strong feelings about aging** — toggle off in the About sheet. Off persists across devices via `UserBandPreferences` synced to profile. Never re-prompt.
- **Accessibility setting interaction.** When `Increase Contrast` (iOS) or any other accessibility setting that affects band rendering changes, the app re-checks `UserBandPreferences.showOnTrendCharts` BEFORE re-rendering. A user who explicitly turned the band off must NOT have it re-surfaced because their accessibility settings changed. The accessibility-aware rendering only applies to the band's appearance (opacity, stroke); it never overrides the user's visibility preference. Lint: any rendering of `<AgingBand>` must read both `userBandPrefs.showOnTrendCharts` AND `accessibilityFlags` and respect the user pref as a hard gate.
- **Sex-at-birth not provided** — combined band is used; user is never asked again. Settings → "About these bands" lets them add later if they want.
- **A new metric is added** without an aging-band curve — the metric simply renders without the band overlay, no error, no fallback. The metric works; the context is just not there yet.
- **First-time user who hasn't yet completed a baseline scan** — bands aren't shown until there's at least one scan; the band is meaningless without a reference point on the chart.
- **User has a life-stage mode active (file 48)** — the standard aging band is overridden per mode:
  - *Pregnancy / postpartum (first 12 months)*: aging band suppressed entirely. Pregnancy and postpartum face changes have nothing to do with aging trajectory.
  - *Menopause / perimenopause*: aging band uses a menopause-specific overlay reflecting estrogen-drop-driven collagen changes; the band shifts faster than the standard age-decade band.
  - *HRT (estrogen / testosterone)*: aging band repurposed entirely as an **HRT timeline overlay** — expected face changes by month of HRT (cheek volume, jaw definition, oil production, etc.).
  - *Cancer recovery*: aging band suppressed entirely. Recovery dynamics are not aging dynamics.
  In all cases, the user's own line is unchanged; only the contextual band is replaced or suppressed. AI copy adjusts via the `LIFE_STAGE_CONTEXT` block (file 06, file 48).

---

## Accessibility

- Band fill must remain perceivable in dark mode and high-contrast accessibility settings; tested at WCAG AAA against the user trace.
- VoiceOver on the chart: *"Trend chart for skin clarity. Your score over time. Background shading shows the typical range for your age decade — your line falls within it for the past four months."*
- Reduce-motion: the band fade-in animation that plays on first chart open is disabled when motion is reduced.
- Reduce-transparency: band fill opacity bumps to 24% so it remains visible without the watercolor effect.

---

## Privacy

- Sex-at-birth is stored in `profiles.sex_at_birth_for_bands` (nullable), with the column comment: *"Used only for natural-aging band rendering. Not shared with AI proxy unless aggregated to decade. Not exported in user data exports unless user opts in."*
- Aging-context input to the AI proxy is `{ ageDecade, sexAtBirth, currentBandPosition }` — coarse buckets only, no precise age, no other identifying fields.
- The dataset of curves itself ships in the app bundle; no per-user aging data is collected to refine it. We do not build a population model out of our users' faces.

---

## Settings

A new entry in Settings → *Charts*:

- **Show natural-aging bands** — toggle. On by default.
- **Show controllability callouts** — toggle. On by default.
- **Sex assigned at birth** — picker (Female / Male / Prefer not to say). The third option is the same as null.

---

## Analytics

| Event | Properties |
|---|---|
| `aging_band_viewed` | `metric, position: 'inside'|'above'|'below'` |
| `aging_band_about_sheet_opened` | `metric` |
| `aging_band_toggled_off` | `metric_count_visible_at_dismissal` |
| `aging_band_toggled_on` | none |
| `aging_band_callout_shown` | `metric, position, callout_type: 'controllable'|'natural'` |
| `aging_band_callout_link_followed` | `metric, callout_type` (only fires for controllable callouts that link to routine) |
| `aging_band_sex_at_birth_provided` | `provided: bool` (never the value) |

PII rule: never log the user's age or decade as an event property; only as a coarse bucket within the band-position event.

---

## Pre-launch checklist

- [ ] Aging-band dataset shipped with citations in the About sheet
- [ ] All 7 sub-score curves × 6 decades × 3 sexes (combined included) defined
- [ ] Hair-density curves included (file 35 metrics)
- [ ] Band overlay tested in light mode, dark mode, increase-contrast, reduce-transparency
- [ ] WCAG AAA contrast between band fill and user trace verified
- [ ] Forbidden-words lint rule (reverse / fight / combat / etc.) passing across all generated copy
- [ ] AI prompt produces no judgmental language across 200 sample inputs (varied ages, positions)
- [ ] "Mostly natural" callouts never link to routine tasks
- [ ] Five-user "first reaction" test — none describe the chart with negative emotion words
- [ ] Sex-at-birth question can be skipped end-to-end without re-prompts later
- [ ] Toggle off in About sheet hides bands everywhere immediately and persists
- [ ] Treatment-aware override behaves correctly for filler / weight-change cases
- [ ] No "younger you" / "before/after" / "future-you" surfaces anywhere in the app
- [ ] Sources sheet lists references for all curves, accessible in two taps
- [ ] PostHog events scrub age and never log the precise sex-at-birth value
- [ ] Brand voice review: read every band-related copy string aloud, no exclamation marks, no jargon
- [ ] Persona check: Jordan (considered comeback) walks through dashboard, sees band, feels seen — qualitative QA
