# 43 — Drip-Feed Feature Reveals

## Why this exists

Most apps die in the second month, not the first. Users complete their initial onboarding, do the obvious flows, and run out of new things to discover. Without forward-looking surfaces, the product feels exhausted.

Vela's structural answer: a calibrated reveal calendar. Across the user's first 20 weeks, new feature surfaces *introduce themselves* one at a time. Most of these features already exist on day 1; what changes is that the user discovers them when they're contextually useful, not when they're overwhelming.

The mechanism is **never urgency-based**. There are no "Limited time" badges, no "Unlock now" CTAs, no FOMO. The frame is *"now's a good time"*: comparison view appears at week 6 because that's when there's enough data to compare meaningfully. Aging-band overlay appears at week 8 because that's when chart context starts paying off. Treatment tracking promotes itself at week 12 if the user's onboarding answers suggested they might be a candidate.

This file specifies the reveal calendar, the per-card UX, the anti-pattern guardrails, and the tracking that lets us refine the calendar over time.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `10_DASHBOARD.md`, `11_COMPARISON.md`, `12_NOTIFICATIONS.md`, `15_DESIGN_SYSTEM.md`, `21_BRAND_SYSTEM.md`, `22_FEEDBACK_SYSTEM.md`, `25_ANALYTICS.md`, `33_HEALTHKIT.md`, `34_TREATMENT_TRACKING.md`, `36_AGING_ACCEPTANCE.md`, `37_DIARY.md`, `42_IOS_SURFACES.md`, and `44_EXPERIMENT_MODE.md`.

---

## Product principles

1. **A reveal is contextual, not promotional.** Each reveal lands at a moment the feature is genuinely useful, not at a calendar tick.
2. **Per-user, not cohort-wide.** Reveals are gated by user state (number of scans, days since signup, HealthKit connection, etc.) — not just elapsed time.
3. **Quiet, ignorable, recoverable.** A reveal is a single soft card on the dashboard, dismissable, with a one-tap path back if the user changes their mind later.
4. **Never block.** A reveal never blocks a screen, never shows above primary content, never requires interaction to advance.
5. **One at a time.** Two reveals never compete on the same week. A user who delays a reveal pushes the next one forward.

---

## The reveal calendar

The default cadence — modified per user based on state. Each row is a **candidate** reveal; whether it fires depends on eligibility rules.

| Week | Reveal | Eligibility | Surface |
|---|---|---|---|
| 1 | None | — | The user is still in trial/early days; reveals would distract |
| 2 | Apple Health Vital ask | Has HealthKit access OR opted in earlier; first scan complete | Modal sheet (file 42) |
| 3 | None | — | Trial just ended; user is settling in |
| 4 | Home Screen widget | Paid; has 3+ scans; iOS version ≥ 14 | Dashboard card |
| 5 | First comparison view | Has 2+ scans separated by ≥ 2 weeks | Dashboard card linking to file 11 |
| 6 | Lock Screen complication | iOS ≥ 16; has 3+ scans; widget already installed | Dashboard card |
| 7 | Aging band overlay | Has 4+ scans; has provided sex-at-birth OR opted to see combined band | Dashboard card linking to file 36 |
| 8 | Apple Watch companion | Paired Apple Watch detected via `WCSession` | Dashboard card |
| 9 | Diary nudge | Has logged any diary entries; has consistency streak ≥ 5 days | Dashboard card linking to file 37 |
| 10 | Siri shortcuts | iOS ≥ 16; has done routine on 14+ days | Settings → notifications-style nudge |
| 12 | Treatment tracking | Onboarding answers suggested treatment interest, OR user has searched for treatment-related terms in any free-text field | Dashboard card linking to file 34 |
| 14 | Experiment mode | Has 8+ scans; has 4+ weeks of routine consistency | Dashboard card linking to file 44 |
| 16 | "Patterns we noticed" deep-dive | Has 6+ weeks of HealthKit + scan data | Dashboard card |
| 18 | Hair tracking | Onboarding answers OR diary tags suggest hair-related interest, OR user is on a hair-affecting treatment | Dashboard card linking to file 35 |
| 20 | Doctor-friendly export | Has 12+ weeks of treatment data | In-context within treatment timeline |
| Ongoing | "On this day" / Year-over-year | Has data from ≥ 1 year ago | Dashboard card, monthly cadence |

### Reveals NOT in the drip-feed

These features are surfaced *immediately* upon eligibility — they're not part of the drip:

- Daily streaks (file 39) — visible from day 2 once a streak forms.
- Routine (file 09) — visible from day 1.
- Wrapped (file 38) — surfaces on the 1st of each month independently.
- Trial-end forecast (file 41) — fires on day 7 of trial.
- Monthly recap card on dashboard — surfaces on the 1st of each month.

---

## Per-reveal card

Every reveal uses the same component shape, with content tailored to the feature.

### Visual

```
┌─────────────────────────────────────────┐
│                                         │
│   Now's a good time:                    │
│   Compare your scans.                   │
│                                         │
│   You have three scans now. Sliding     │
│   between them shows you change in a    │
│   way charts can't.                     │
│                                         │
│                                         │
│   ┌────────────────────────┐  Not now   │
│   │  Try the comparison    │            │
│   └────────────────────────┘            │
│                                         │
└─────────────────────────────────────────┘
```

- Cream surface card on the dashboard, sitting between existing top cards (score, routine).
- Soft 1px border in `border.subtle`; no shadow, no glow.
- Headline: "Now's a good time:" then the feature name on a second line. Both `headlineSerif`.
- Body: 2-3 sentences explaining *why this is a good time*.
- Primary action: single button, label specific to the feature.
- Dismiss: small *Not now* link to the right of the button. Tap dismisses the card; user can recover it from Settings → *What's new in Vela*.

### What the card does NOT do

- Does not flash, glow, or animate to draw attention.
- Does not say *"NEW"* or *"Just unlocked!"*.
- Does not include badges, levels, or any gamification cue.
- Does not pile up — only one reveal card visible on the dashboard at a time.
- Does not auto-dismiss on scroll-past — it persists until the user dismisses it or engages.

### Dismissal vs. engagement

Two distinct user actions:

- **Engage** — the user taps the primary CTA. Card disappears; the feature is now considered "introduced." User won't see this reveal again unless they explicitly reset it from Settings.
- **Dismiss** — the user taps *Not now*. Card disappears for **14 days**, then re-surfaces once. After a second dismissal, it does not re-surface; the feature lives quietly in Settings → *What's new in Vela* for the user to discover when ready.

The *Not now* mechanic is the trust anchor. Users learn that ignoring a card doesn't punish them.

---

## Eligibility rules in code

```ts
// src/types/feature-reveal.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface FeatureReveal {
  id: FeatureRevealId;
  userId: string;
  status: 'pending' | 'shown' | 'engaged' | 'dismissed-once' | 'dismissed-twice';
  shownAt?: string;
  engagedAt?: string;
  dismissedAt?: string;
  reShownAfter?: string;          // 14 days after first dismissal
  // The eligibility predicate ran at this state to decide.
  lastEvaluatedAt: string;
}

export type FeatureRevealId =
  | 'apple-health-vital'
  | 'home-screen-widget'
  | 'first-comparison'
  | 'lock-screen-complication'
  | 'aging-band-overlay'
  | 'apple-watch-companion'
  | 'diary-nudge'
  | 'siri-shortcuts'
  | 'treatment-tracking'
  | 'experiment-mode'
  | 'patterns-deep-dive'
  | 'hair-tracking'
  | 'doctor-friendly-export'
  | 'on-this-day';

export interface EligibilityContext {
  daysSinceSignup: number;
  scansCount: number;
  consecutiveRoutineDays: number;
  hasHealthKitConnected: boolean;
  hasPairedAppleWatch: boolean;
  iosVersionMajor: number;
  hasInstalledWidget: boolean;
  hasOpenedDiary: boolean;
  hasActiveTreatment: boolean;
  onboardingAnswers: Record<string, unknown>;
  diaryTags: string[];
  yearsSinceFirstScan: number;
}
```

### Evaluator logic

```ts
// Pseudocode — runs at app foreground each session.
function evaluateNextReveal(ctx: EligibilityContext, history: FeatureReveal[]) {
  const ordered = REVEAL_CALENDAR;
  const inFlight = history.find(h => h.status === 'shown');
  if (inFlight) return null; // only one card on dashboard at a time

  for (const candidate of ordered) {
    const past = history.find(h => h.id === candidate.id);

    // Don't re-show engaged or twice-dismissed cards.
    if (past?.status === 'engaged' || past?.status === 'dismissed-twice') continue;

    // Re-show once-dismissed cards after 14 days.
    if (past?.status === 'dismissed-once' && past.reShownAfter && past.reShownAfter > nowIso()) continue;

    // Eligibility predicate.
    if (!candidate.eligible(ctx)) continue;

    // Don't show this week if a different reveal was shown in the past 7 days.
    if (history.some(h => h.shownAt && daysAgo(h.shownAt) < 7)) continue;

    return candidate;
  }
  return null;
}
```

### Life-stage mode gating (canonical)

The reveal evaluator MUST check active life-stage modes (file 48) before proposing a reveal. Some reveals are inappropriate during certain modes:

| Mode active | Suppressed reveals | Reason |
|---|---|---|
| `pregnancy` | `treatment-tracking`, `experiment-mode` | Most treatments are contraindicated; experiments add stress at a sensitive time |
| `postpartum` | `experiment-mode` (first 6 months) | Sleep is wrecked; not the time to optimize |
| `cancer-recovery` | `treatment-tracking`, `experiment-mode`, `hair-tracking` | All inappropriate during recovery |
| `hrt-estrogen` / `hrt-testosterone` | none | Modes don't suppress reveals; users on HRT often WANT treatment-tracking |
| `menopause` | none | All reveals available |

Implementation: each `RevealDefinition` gains `suppressedDuringModes: LifeStageModeId[]`. The eligibility predicate adds `&& !ctx.activeLifeStageModes.some(m => candidate.suppressedDuringModes.includes(m))`.

### "What's new in Vela" surface respects modes

The recovery surface in Settings → "What's new in Vela" lists features. Mode-suppressed features appear with a label instead of being shown as available:

> *"Treatment tracking — Available after pregnancy mode ends."*

The label is informational, never blocking. A user can still ENGAGE with the feature via Settings deep link, but the friction prevents accidental discovery.

### Eligibility predicates (selected examples)

```ts
const REVEAL_CALENDAR: RevealDefinition[] = [
  {
    id: 'first-comparison',
    week: 5,
    eligible: (ctx) => ctx.scansCount >= 2 && hasScansSeparatedBy(ctx, 14),
    cardCopy: { /* ... */ },
  },
  {
    id: 'aging-band-overlay',
    week: 7,
    eligible: (ctx) => ctx.scansCount >= 4
      && hasProvidedSexAtBirth(ctx) || hasOptedToCombinedBand(ctx),
    cardCopy: { /* ... */ },
  },
  {
    id: 'experiment-mode',
    week: 14,
    eligible: (ctx) => ctx.scansCount >= 8 && ctx.consecutiveRoutineDays >= 28,
    cardCopy: { /* ... */ },
  },
  {
    id: 'on-this-day',
    week: 52, // Ongoing
    eligible: (ctx) => ctx.yearsSinceFirstScan >= 1,
    cardCopy: { /* ... */ },
  },
  // ... etc
];
```

---

## Card copy library

Each reveal needs body copy that explains *why this is a good time*. The copy is hand-written — not AI-generated — because it's stable, brand-critical, and audited via the brand voice review process.

### Sample copy

**`first-comparison`**:
> *"You have three scans now. Sliding between them shows you change in a way charts can't."*

**`aging-band-overlay`**:
> *"Your charts can show you what's typical for someone your age, alongside your own line. We thought you might want the context."*

**`apple-watch-companion`**:
> *"We noticed you have a Watch paired. Vela on the wrist is one tap to log your routine."*

**`treatment-tracking`** (when onboarding hinted at it):
> *"You mentioned you might be starting tretinoin during onboarding. If you're on something now or thinking about it, treatment tracking gives you a timeline that doesn't lie."*

**`experiment-mode`**:
> *"You've kept a routine for a month. Want to test something — a single change, four weeks, see what your face does?"*

**`on-this-day` (year-over-year)**:
> *"You scanned a year ago today. Here's where your face was then, and where it is now."*

### Copy review rules

- No exclamation marks.
- No urgency ("Don't miss out", "Only available now").
- No artificial novelty ("Just released!", "NEW").
- Always frame as *now's a good time* or equivalent — never "you should" or "you must."
- Never compare the user to other users.
- Always end with a soft action verb that reads like an offer, not a demand: *Try*, *Take a look*, *See what happens*, *Add it*, *Start*.

---

## Surfacing logic

### Where the reveal card appears
- The dashboard, between the score card and the routine card. **Slot 2** in the dashboard render order.
- Never on the routine screen, treatment timeline, comparison view, or settings.

### When the evaluator runs
- On every dashboard render.
- After every scan completion.
- After Wrapped is generated.
- After a routine task is completed (debounced to once per session).

### Deduplication with other surfaces
- If a Wrapped notification is queued for today, the reveal evaluator skips for 24 hours after Wrapped is opened.
- If a milestone notification (file 39 streak milestones) is being displayed in the same session, the reveal card is suppressed until the next session.

The principle: *the user gets at most one new thing to think about per session*.

---

## "What's new in Vela" — the recovery surface

Every reveal — whether engaged, dismissed once, or dismissed twice — is preserved in **Settings → What's new in Vela**. This is the user's catalog of features they may not have explored.

### Layout

```
┌─────────────────────────────────────────┐
│   What's new in Vela                    │
│                                         │
│   Things you can use that you may not   │
│   have explored yet.                    │
│                                         │
│   ─────────────────────────────────     │
│   Comparison view                       │
│   Try it · Last shown March 12          │
│                                         │
│   Aging-band overlay                    │
│   Try it · You hid this card            │
│                                         │
│   Apple Watch companion                 │
│   Currently set up                      │
│   ─────────────────────────────────     │
│                                         │
│   And the rest, as you grow:            │
│                                         │
│   • Experiment mode                     │
│   • Hair tracking                       │
│   • Doctor-friendly export              │
│                                         │
└─────────────────────────────────────────┘
```

- Above-the-fold: features with status `engaged`, `shown`, or `dismissed-*`.
- Below: the still-locked features, listed by name only, no detail. The user knows there's more coming without being teased about it.
- Tap any feature → opens its onboarding card or, for already-engaged features, the feature itself.

### Settings access

This screen lives at **Settings → What's new in Vela**, surfaced as a section in the main Settings list. Always visible, even for users with no engagement yet.

---

## AI-personalized reveals (v1.1+)

For users who are in the post-week-12 zone, the reveal calendar becomes more personalized. The evaluator queries the AI proxy with the user's state and asks the model to **rank** which existing-but-not-yet-engaged feature is most likely to be useful right now.

### `REVEAL_RANKING_SYSTEM` prompt (v1.1+)

```
You decide which Vela feature to suggest to a user this session.

CONTEXT YOU WILL RECEIVE:
- A list of features the user hasn't yet engaged with.
- The user's recent activity: scan count, days since last scan, whether their
  routine streak has lengthened or stalled, what diary tags appear most this week,
  whether they have an active treatment.

OUTPUT:
- One feature ID, or null if no feature is contextually useful right now.
- A confidence score 0-1.

VOICE: not user-facing. Output is JSON only.

NEVER:
- Recommend a feature the user has already engaged with.
- Recommend more than one feature per response.
- Bias toward monetization features.

Return: { "id": "experiment-mode", "confidence": 0.74 } or { "id": null }
```

If the AI returns a confidence < 0.6, no card is shown. If confidence >= 0.6, the corresponding feature's reveal card is queued.

This is a v1.1+ enhancement — v1 ships with the static calendar above. The infrastructure (eligibility rules, card component, recovery surface) is identical; the change is just the evaluator's selection logic.

---

## Accessibility

- Reveal card is a `Section` in the dashboard's accessibility tree, announced as *"Suggestion: [headline]. [body]. [CTA]. Not now button."*
- VoiceOver users can swipe past the card without engaging; the *Not now* dismiss is a clearly labeled `button` role.
- Cards respect Dynamic Type up to XXXL; layout reflows vertically.
- No motion on the card (no fade-in, no animation) to ensure reduce-motion compatibility automatically.

---

## Edge cases

- **User powers through and engages with everything in week 1** (rare, but power users exist) — the reveal queue fires as fast as eligibility allows, but never more than one per session and never more than 3 in any 7-day window.
- **User who's been around since v1 launches and now sees a brand-new feature reveal** (e.g., file 44 experiment mode releasing in v1.1) — the new feature is added to the calendar; users who are already past week 14 see the reveal on their next session if eligible. We don't artificially delay.
- **User uninstalls and reinstalls** — reveal history is preserved server-side; on reinstall, the user resumes from where they left off in the calendar.
- **User signs in on a new device** — same: reveal history is per-account, not per-device.
- **User in the trial-extension flow (file 41)** — reveals are suppressed during the extension period; we don't pile on while the user is deciding whether to keep paying.
- **User in a "subscription paused" state** (Apple's auto-pause for non-renewing subs) — reveals continue but only for free-tier-compatible features. Paid features don't reveal until the user renews. (No file 41 file 47 paid-feature reveal during pause.)
- **The reveal calendar evolves post-launch** — a new column `revealCalendarVersion` is stored per user; users on older calendars don't get backfilled mid-stream. The next-eligible reveal logic handles version differences gracefully.

---

## Settings

In **Settings → What's new in Vela** (already specified above), an additional row at the bottom:

```
Reveal cards on dashboard
On                                   ▢
```

A user who finds the reveal cards intrusive can disable them entirely. The features still exist in this Settings screen for manual discovery. Default ON.

---

## Analytics

| Event | Properties | Notes |
|---|---|---|
| `reveal_eligible` | `id, days_since_signup, scans_count_bucket` | When eligibility passes; not when shown |
| `reveal_shown` | `id, days_since_signup, position_in_dashboard: 'slot-2'` | |
| `reveal_engaged` | `id, time_to_engage_ms, dwell_total_ms` | |
| `reveal_dismissed_once` | `id, dwell_ms` | |
| `reveal_re_shown` | `id, days_since_first_dismissal` | |
| `reveal_dismissed_twice` | `id, dwell_ms` | |
| `reveal_recovered_from_settings` | `id` | User found the feature in "What's new" |
| `reveal_calendar_version_bumped` | `from_version, to_version` | When the user moves to a new version |
| `reveal_globally_disabled` | none | User toggled off the reveals system |

---

## Pre-launch checklist

- [ ] Reveal calendar shipped with all 14 reveal definitions
- [ ] Eligibility predicates tested for each reveal
- [ ] Only one reveal card visible on dashboard at any time
- [ ] At most one reveal shown per session
- [ ] At most three reveals shown per 7-day window
- [ ] Dismiss-once / dismiss-twice cycle works as specified (14-day delay)
- [ ] *Not now* dismissal is friction-free (single tap, no confirmation)
- [ ] Card copy reviewed for every reveal — no exclamation marks, no urgency, no FOMO
- [ ] All 14 features recoverable from Settings → What's new in Vela
- [ ] Settings page lists engaged + dismissed + locked features in three groups
- [ ] Toggle in Settings to globally disable reveals (default ON)
- [ ] Reveal evaluator runs on dashboard render, scan, Wrapped open, routine completion
- [ ] Deduplication with Wrapped open: 24-hour suppression
- [ ] Deduplication with milestone notifications: same-session suppression
- [ ] Trial-extension users see reveals suppressed during extension
- [ ] Reveal history is per-account, not per-device
- [ ] Reveal calendar version migration tested
- [ ] Anti-pattern audit passed: no badges, no "NEW", no urgency, no level-up animations
- [ ] PostHog events scrubbed of any user-identifying data beyond the feature ID
- [ ] VoiceOver: card announced as suggestion, dismiss labeled as button
- [ ] Reduce-motion: no animation on cards (already none, verified)
- [ ] Brand voice review: every card body string read aloud
- [ ] Persona check: each persona walked through their probable reveal sequence
- [ ] Maestro flow: user signs up → reaches week 5 → sees comparison reveal → engages → reveal disappears
- [ ] Maestro flow: user dismisses comparison reveal twice → finds it in Settings → engages
- [ ] Maestro flow: user disables reveals globally → no cards show after toggle off
