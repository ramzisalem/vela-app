# 48 — Life-Stage Modes

## Why this exists

Vela's existing spec treats users as roughly homogeneous — a single profile with a gender, an age, a routine. Real users are not homogeneous. The moments people most want longitudinal face tracking are exactly the moments their lives are *not* normal: pregnancy, menopause, gender transition on HRT, cancer recovery. These are dramatic, predictable, often misunderstood physical journeys. Existing skincare apps either ignore them, treat them with default copy that lands wrong, or actively re-traumatize.

Life-Stage Modes are opt-in settings that adjust Vela's behavior across multiple surfaces — the aging band, AI copy, routine engine, treatment library, notifications, diary prompts — to fit the user's actual situation. None of them are required; none are auto-enabled; all are reversible.

The framework is shared across modes; the per-mode behavior is specific. This file specifies both.

This file extends `02_TYPES_AND_MODELS.md`, `06_AI_PROMPTS.md`, `07_ONBOARDING.md`, `09_ROUTINE.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `21_BRAND_SYSTEM.md`, `25_ANALYTICS.md`, `33_HEALTHKIT.md`, `34_TREATMENT_TRACKING.md`, `36_AGING_ACCEPTANCE.md`, `37_DIARY.md`, `39_DAILY_STREAKS.md`, and `45_LONG_TERM_RETENTION.md`.

---

## Product principles

1. **Modes are opt-in.** Vela never infers a life stage from data and silently switches modes. The user chooses.
2. **Modes are reversible.** Turning a mode off restores defaults; data is preserved.
3. **One mode at a time, with care for overlap.** Most users have one active life stage; we handle the rare overlaps explicitly (e.g., postpartum + perimenopause).
4. **No medical claims.** Vela is not a doctor, no mode pretends otherwise. We adjust framing, not advice.
5. **The brand voice gets quieter, not louder, in modes.** These are sensitive moments. Notifications dial down, copy gentles, streak punishment vanishes.

---

## The framework — what every mode adjusts

A `LifeStageMode` is a structured override that affects six surfaces:

```ts
// src/types/life-stage.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface LifeStageMode {
  id: LifeStageModeId;
  userId: string;
  // When the user enabled the mode and (optionally) when it ends.
  startedAt: string;             // ISO date
  endsAt?: string;               // ISO; for finite modes (e.g., "due in May")
  // For pregnancy: trimester estimate auto-computed from dueDate or lmpDate.
  metadata?: LifeStageMetadata;
  // Whether the user has explicitly accepted that mode's adjustments.
  acknowledgedAt: string;
  // Notifications can be paused mode-wide.
  pauseNotifications: boolean;
  pauseStreaks: boolean;
}

export type LifeStageModeId =
  | 'pregnancy'
  | 'postpartum'
  | 'menopause'
  | 'hrt-estrogen'
  | 'hrt-testosterone'
  | 'cancer-recovery';

export interface LifeStageMetadata {
  // Pregnancy
  dueDate?: string;
  lmpDate?: string;              // last menstrual period
  // Postpartum
  birthDate?: string;
  // Menopause
  perimenopauseStartedAt?: string;
  // HRT
  hrtStartedAt?: string;
  // Cancer recovery
  treatmentType?: string;        // free text, e.g., "chemotherapy", "radiation"
  treatmentEndedAt?: string;
}
```

Each surface reads the active mode and adjusts:

| Surface | Adjustment |
|---|---|
| Aging band (file 36) | Replaced or suppressed per mode |
| AI prompt copy (file 06) | Mode-specific framing block injected |
| Routine engine (file 09) | Tasks added/removed per contraindications |
| Treatment library (file 34) | Hard-blocks or warnings on contraindicated entries |
| Notification cadence (file 12) | Tone & timing adjusted |
| Diary tag suggestions (file 37) | Mode-specific tags surfaced first |
| Streak rules (file 39) | Optional auto-freeze for the mode duration |
| Wrapped (file 38) | Acknowledges the mode in the year's narrative |

A user with no active mode behaves exactly like the current spec.

---

## Mode-specific behavior

### Pregnancy mode

**When enabled:**

- *Aging band* → suppressed entirely. Pregnancy has its own predictable face changes (melasma, oil shifts, water retention) that have nothing to do with aging trajectory. Charts show only the user's own line, with no comparison band.
- *AI copy* → bias toward "this is a pregnancy thing, here's what's known about it" framing for melasma, hyperpigmentation, increased oil, cheek volume from edema.
- *Routine engine* → remove retinoids (tretinoin, retinol, retinaldehyde, adapalene), hydroquinone, salicylic acid >2%, high-dose vitamin A. Add: gentle cleanser, ceramide moisturizer, mineral SPF, azelaic acid (pregnancy-safe), niacinamide.
- *Treatment library* → tretinoin, isotretinoin, hydroquinone, tazarotene, adapalene, spironolactone, finasteride, dutasteride are **hard-blocked from new logging** with a clear sheet: *"This isn't recommended during pregnancy. If you're already on it, talk to your doctor — Vela won't track it as new while pregnancy mode is on."* Existing logged treatments are paused but not deleted.
- *Notifications* → tone softens; never reference body weight or "areas of concern"; cadence reduced to weekly only (daily routine reminders pause unless user explicitly keeps them).
- *Diary prompts* → trimester-aware: in T1 surface "first trimester nausea / fatigue" tags; in T2 "round ligament pain / energy returns"; in T3 "swelling / sleep disrupted." (No medical detail; just the tags users actually log.)
- *Streaks* → user can opt to auto-freeze entire pregnancy duration. Default off; offered at mode enable.
- *Wrapped* → if mode active for any of the month, the monthly Wrapped acknowledges: *"Week 16 of pregnancy. Your face is doing what faces do during this."*

**How the mode is enabled:**

A user can enable pregnancy mode from:
- Settings → Health & lifestyle → Life-stage modes → Pregnancy
- A diary entry tagged `pregnant` triggers a one-time soft prompt: *"Want to switch to pregnancy mode? It adjusts what we surface and pauses anything that wouldn't be safe to track."*
- HealthKit-synced pregnancy data (some users log pregnancy in Apple Health) triggers the same one-time soft prompt.

The enable sheet:

```
┌──────────────────────────────────────────┐
│   Pregnancy mode                         │
│                                          │
│   We'll suppress the aging-band overlay, │
│   pause anything contraindicated, and    │
│   shift the tone. Your data stays where  │
│   it is.                                 │
│                                          │
│   When are you due? (optional)           │
│   ┌──────────────────────────┐           │
│   │  May 2026                │           │
│   └──────────────────────────┘           │
│                                          │
│   ☐ Auto-freeze my streak                │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  Turn pregnancy mode on          │   │
│   └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

**How it ends:**

The user manually disables, OR the user enables postpartum mode (which auto-disables pregnancy), OR the due date passes by 4+ weeks with no postpartum enable (we surface a soft check-in: *"Has the baby arrived? Tap to switch to postpartum, or turn this mode off."*).

**Edge cases:**

- *Pregnancy loss* — sensitive. The user disables the mode at any time; we never ask why. The disable confirmation shows: *"We'll switch you back. We're sorry if this is hard. Take all the time you need."* No follow-up nudges.
- *Existing treatment logged before pregnancy enabled* — paused, not deleted. User sees: *"Your tretinoin tracking is paused while pregnancy mode is on. The history is preserved."*
- *User on cycle phase tracking (file 33)* — cycle correlations auto-suppressed during pregnancy; resume when mode disabled.

---

### Postpartum mode

**When enabled:**

- *Aging band* → still suppressed for the first 12 months postpartum (face changes during this window are not aging-driven).
- *AI copy* → bias toward "this is what bodies do after birth — postpartum hair shedding peaks at month 4, recovers by month 12, melasma fades over months" framing.
- *Routine engine* → most actives can return; hydroquinone if breastfeeding still gets a soft warning; retinoids return after the user signals they aren't breastfeeding (a single Settings ask, easy to skip).
- *Treatment library* → breastfeeding contraindications surface as warnings (not hard-blocks). User has agency.
- *Hair tracking (file 35)* → if enabled, postpartum hair shedding gets explicit recovery-curve framing. The trend chart shows expected recovery timeline overlaid; insights never use "loss" or "thinning" language during this window.
- *Notifications* → cadence stays softened for first 6 months. Easy to re-enable normal cadence when user is ready.
- *Diary prompts* → "sleep disrupted," "breastfeeding," "first walk outside," "milk supply" surface as tags.
- *Streaks* → auto-freezes during cluster-feeding nights are generous; the `weekly-auto` budget doubles for the first 6 months.

**How the mode is enabled:**

- Settings → Health & lifestyle → Life-stage modes → Postpartum
- Auto-suggested when pregnancy mode reaches the due date OR a diary entry includes `postpartum` tag.

**How it ends:**

Default 12-month duration. User extends or ends earlier as they choose. After 12 months, mode disables automatically with: *"You're a year past the start of postpartum mode. We'll switch back to your defaults. Hair recovery patterns continue to be tracked normally."*

---

### Menopause / perimenopause mode

**When enabled:**

- *Aging band* → still shows but uses a menopause-specific overlay derived from peri/post-menopause cohort data. Estrogen-drop-driven collagen and elasticity changes are accelerated; the band reflects this.
- *AI copy* → bias toward "estrogen drop affects collagen, hydration, redness reactivity — this is the picture for many people in perimenopause" framing. Never says *"because you're getting older."*
- *Routine engine* → bias toward peptides, ceramides, niacinamide, gentle exfoliation, mineral SPF, retinoid (tolerated, often beneficial). Bias against drying actives without barrier support.
- *Treatment library* → HRT (estrogen patch, oral, vaginal estrogen) surfaces as a category; contraindications are documented but never prescriptive. Bioidentical hormone treatments are listed with extra "talk to your doctor" emphasis.
- *Notifications* → time-of-day aware (hot flashes / sleep disruption are real). No 6 AM reminders unless the user opts in. Sleep disruption diary tag triggers softer next-morning copy.
- *Diary prompts* → "hot flash," "night sweat," "sleep disrupted," "mood low," "joint ache" surface as tags. These also feed correlation engine (file 33) for hot-flash → next-day redness patterns.
- *Wrapped* → acknowledges the journey: *"Six months into perimenopause. Your skin's been holding on; the routine's been honest about what's happening."*

**How the mode is enabled:**

- Settings → Health & lifestyle → Life-stage modes → Menopause
- One-time soft prompt if user is 40+ AND HealthKit cycle data shows irregularity (skipped cycles, length variance). The prompt is gentle: *"Have things been changing with your cycle? Vela has a perimenopause mode that adjusts the picture. No medical claim — just an option."*

**How it ends:**

User-controlled. Most users keep it on indefinitely. We never auto-disable.

---

### HRT mode (estrogen or testosterone)

**When enabled:**

- *Aging band* → repurposed: instead of an aging band, the chart now shows the **expected HRT timeline** for the user's specific HRT type. E.g., for estrogen: cheek volume gradually increases over 12-24 months; skin softens; pore size decreases. For testosterone: jawline tightens; pore size increases; oil production rises; potential beard density increase. These curves are well-documented for trans HRT and form the basis of the overlay.
- *AI copy* → bias toward "month X of HRT typically shows..." framing. Aware of medical-transition context. Never assumes the user is "transitioning to" anything specific — the language is descriptive, not narrative.
- *Routine engine* → bias toward what supports the user's HRT goals: estrogen users often want gentler, hydrating routines as skin softens; testosterone users often need stronger oil control. The user's gender + framework choice (file 02) drive the bias; HRT mode just adjusts within those.
- *Treatment library* → HRT itself is in the treatment library as an entry. Hair-affecting effects (testosterone causing hairline recession over years; finasteride concurrent for trans women on E) handled in file 35.
- *Hair tracking* → critical for HRT users. Front hairline tracking + crown tracking become the primary hair surfaces.
- *Notifications* → trans-inclusive copy throughout. Never gendered pronouns based on profile alone.
- *Diary prompts* → HRT-specific: "started a new dose," "switched form (oral/patch/injection)," "blood draw scheduled," "first effects noticed."
- *Wrapped* → acknowledges HRT explicitly when active: *"Year one on E. Here's what your face has done in the documented timeframe."*

**How the mode is enabled:**

- Settings → Health & lifestyle → Life-stage modes → HRT (estrogen or testosterone)
- Suggested if user logs HRT as a treatment in file 34.

**How it ends:**

User-controlled. Most users on HRT stay on for life; mode stays on as long as the user wants.

**Privacy note:**

This is sensitive data for many users. We make extra promises:
- HRT mode status is NEVER shared with the AI proxy unless the user has explicitly opted in to AI-powered HRT-aware insights (a one-time toggle in mode setup).
- Wrapped's HRT mention is opt-in at first Wrapped after enable; default off.
- Sentry / PostHog never log HRT type or mode duration in event properties — only mode-id-bucket level (`hrt-active: bool`).

---

### Cancer recovery mode

**When enabled:**

- *Aging band* → suppressed entirely. Cancer treatment (chemo, radiation) causes face changes that have nothing to do with aging trajectories.
- *AI copy* → bias toward "what's expected during recovery" framing. Acknowledges chemotherapy hair loss and regrowth, radiation-affected skin reactivity, steroid-induced changes. Never alarms.
- *Routine engine* → bias toward maximally gentle: barrier repair, sun protection, no actives, no exfoliation. The "stripped-down" version of the routine engine.
- *Treatment library* → all aggressive actives are hard-blocked or warned (stronger than pregnancy mode). Hydroquinone, retinoids, AHAs/BHAs, microneedling, chemical peels, lasers all warn. The user has full agency — we surface warnings, never block.
- *Hair tracking (file 35)* → if enabled, the AI copy is biased toward chemo-hair-loss recovery curves. The shedding-and-regrowth pattern is documented; we frame it accordingly. Never use "loss" framing.
- *Notifications* → minimal. Daily routine reminders pause by default. Weekly scan reminders soften: *"Whenever's good for you."*
- *Diary prompts* → treatment-day, side-effect, energy-level, appetite tags surface.
- *Streaks* → auto-freeze for full mode duration by default. Never punish a missed day during recovery. Streak surface partially hidden (visibility set to `subtle` per file 39).
- *Wrapped* → acknowledged with the most care of any mode: *"Through chemo, you scanned thirteen times this year. That's a lot of showing up."*

**How the mode is enabled:**

- Settings → Health & lifestyle → Life-stage modes → Cancer recovery
- The enable sheet asks for treatment type (chemotherapy / radiation / both / surgery / other) optionally. This drives the AI bias but is never required.

**How it ends:**

User-controlled. We default to a 24-month duration with a soft check-in at month 18: *"How are you doing? Want to keep recovery mode on, or switch back to your defaults?"*

**Privacy:**
- Cancer recovery mode is the most privacy-sensitive of all modes. Treatment type metadata is **never** sent to the AI proxy unless explicit opt-in. PostHog logs only `cancer-recovery-active: bool` — never the type or treatment-end date.
- Mode enable triggers a one-time card with extra reassurance: *"This is private. Vela's servers can read that this mode is on, but no specifics about your treatment go anywhere we don't tell you about."*

---

## Mode switching & overlap

Most users will be in zero modes most of the time. Some will move between modes (pregnancy → postpartum). A few overlaps are real and need to be handled:

- **Pregnancy ↔ postpartum**: enabling postpartum auto-disables pregnancy. Pregnancy mode becomes uneditable as a "history" item until manually re-enabled (in case of subsequent pregnancy).
- **Postpartum + perimenopause**: rare but real (women in late 30s / early 40s having a child while perimenopausal). Both modes can be active simultaneously; the routine engine merges biases (postpartum's gentler bias wins on contraindications; perimenopause's specific actives win on routine selection).
- **HRT + cancer recovery**: also real (trans patients with cancer). Both modes active; cancer recovery's gentler bias dominates routine; HRT mode's timeline overlay still shows on charts.
- **Menopause + cancer recovery**: cancer recovery dominates routine; menopause timeline overlay suppresses to defer to recovery.

The general rule: **the more sensitive mode wins on contraindications and notification tone**; the more specific mode wins on chart overlays.

When two modes are active, Settings shows both with one-tap disable for either:

```
Active modes
  Postpartum             Started Jan 12, ends Jan 12 next year   ✕
  HRT (estrogen)         Started Sep 2024                        ✕

  ⓘ When both modes adjust the same thing (like contraindicated
     treatments or notification tone), the gentler one wins:
     postpartum's quieter notifications take precedence over HRT's.
```

The one-line explainer is rendered below the active-modes list when two or more are active. Users can tap the ⓘ for a detailed precedence table that mirrors `PRECEDENCE_ORDER` from the runtime contract.

---

## Runtime contract — `useLifeStageMode()` hook + mode-aware-surfaces registry

Life-stage mode state needs to be checked by 9+ files (06, 09, 12, 33, 34, 36, 38, 41, 45, 46, 47, 49, 50). Without a single contract, each file invents its own check. This section is the canonical contract.

### The hook

Every UI surface and service that needs to behave mode-aware reads from one hook:

```typescript
// src/hooks/useLifeStageMode.ts
import { useStore } from '@/stores/lifeStageStore';

export function useLifeStageMode(): UseLifeStageModeReturn {
  const modes = useStore((s) => s.activeModes);
  return {
    activeModes: modes,
    hasMode: (id: LifeStageModeId) => modes.some(m => m.id === id),
    hasAny: () => modes.length > 0,
    primaryMode: () => pickByPrecedence(modes),    // see precedence below
    isAiAwareConsented: (id: LifeStageModeId) => {
      const m = modes.find(x => x.id === id);
      return m?.aiAwarenessConsented ?? false;
    },
  };
}

export interface UseLifeStageModeReturn {
  activeModes: LifeStageMode[];
  hasMode: (id: LifeStageModeId) => boolean;
  hasAny: () => boolean;
  primaryMode: () => LifeStageMode | null;          // the dominant mode for overlap cases
  isAiAwareConsented: (id: LifeStageModeId) => boolean;
}
```

The store is local (WatermelonDB) with cloud sync. A user opening the app on a second device sees the same active modes within seconds.

### The precedence rule (for overlap cases)

When multiple modes are active simultaneously:

```typescript
// src/services/lifeStage/precedence.ts
const PRECEDENCE_ORDER: LifeStageModeId[] = [
  'cancer-recovery',  // most sensitive — wins on routine bias and notification tone
  'pregnancy',        // hard contraindication blocks
  'postpartum',
  'hrt-estrogen',
  'hrt-testosterone',
  'menopause',
];

export function pickByPrecedence(modes: LifeStageMode[]): LifeStageMode | null {
  for (const id of PRECEDENCE_ORDER) {
    const found = modes.find(m => m.id === id);
    if (found) return found;
  }
  return null;
}
```

The precedence applies to: routine engine bias (the "gentlest" mode wins), notification tone (the "softest" mode wins), and any UI element that can show only one mode's context at a time.

### Mode-aware-surfaces registry

Every surface that reads mode state declares itself in this registry. CI fails if a feature file references modes without registering.

```typescript
// src/services/lifeStage/registry.ts
export interface ModeAwareSurface {
  surfaceName: string;           // 'dashboard.agingBandCallout', 'routineEngine.taskFilter', etc.
  ownerFile: string;
  modesAffected: LifeStageModeId[];   // 'all' is also accepted
  behavior: 'suppress' | 'replace' | 'augment' | 'tighten';
  // 'suppress' — surface is hidden during mode
  // 'replace'  — surface is replaced by mode-specific variant
  // 'augment'  — surface adds mode-specific context (e.g., copy adjustment)
  // 'tighten'  — surface enforces stricter rules (e.g., contraindication hard-block)
}

export const MODE_AWARE_SURFACES: ReadonlyArray<ModeAwareSurface> = [
  // file 32 — 3D capture
  { surfaceName: 'capture.lightingNormalization',         ownerFile: 'file_32', modesAffected: ['cancer-recovery'], behavior: 'augment' },

  // file 33 — HealthKit insights
  { surfaceName: 'healthInsights.cycleCorrelations',      ownerFile: 'file_33', modesAffected: ['pregnancy', 'menopause'], behavior: 'suppress' },
  { surfaceName: 'healthInsights.aiPromptContext',        ownerFile: 'file_33', modesAffected: 'all', behavior: 'augment' },

  // file 34 — treatments
  { surfaceName: 'treatmentLibrary.contraindicationBlock',ownerFile: 'file_34', modesAffected: ['pregnancy', 'postpartum'], behavior: 'tighten' },
  { surfaceName: 'treatmentLibrary.contraindicationWarn', ownerFile: 'file_34', modesAffected: ['cancer-recovery', 'menopause'], behavior: 'augment' },

  // file 36 — aging band
  { surfaceName: 'agingBand.overlay',                     ownerFile: 'file_36', modesAffected: ['pregnancy', 'postpartum', 'cancer-recovery'], behavior: 'suppress' },
  { surfaceName: 'agingBand.overlay',                     ownerFile: 'file_36', modesAffected: ['menopause'], behavior: 'replace' },
  { surfaceName: 'agingBand.overlay',                     ownerFile: 'file_36', modesAffected: ['hrt-estrogen', 'hrt-testosterone'], behavior: 'replace' },

  // file 38 — Wrapped
  { surfaceName: 'wrapped.contextNarrative',              ownerFile: 'file_38', modesAffected: 'all', behavior: 'augment' },

  // file 41 — trial forecast
  { surfaceName: 'trialForecast.cohortProjection',        ownerFile: 'file_41', modesAffected: ['pregnancy', 'cancer-recovery'], behavior: 'suppress' },

  // file 45 — long-term retention
  { surfaceName: 'longTerm.yearOverYearOverlay',          ownerFile: 'file_45', modesAffected: 'all', behavior: 'augment' },
  { surfaceName: 'longTerm.onThisDayCard',                ownerFile: 'file_45', modesAffected: 'all', behavior: 'augment' },

  // file 46 — reactivation
  { surfaceName: 'reactivation.emailDigest',              ownerFile: 'file_46', modesAffected: 'all', behavior: 'augment' },

  // file 47 — cancel save
  { surfaceName: 'cancelSave.offerCopy',                  ownerFile: 'file_47', modesAffected: 'all', behavior: 'augment' },

  // file 49 — practice tier
  { surfaceName: 'practiceTier.modeFlagToClinic',         ownerFile: 'file_49', modesAffected: 'all', behavior: 'augment' },

  // file 50 — evidence
  { surfaceName: 'evidence.contraindicationBanner',       ownerFile: 'file_50', modesAffected: ['pregnancy', 'postpartum', 'cancer-recovery'], behavior: 'augment' },
];
```

### Lint rule

A new ESLint rule `vela/mode-aware-must-register`: any file that imports `useLifeStageMode` must export a corresponding entry in the registry above. CI fails if a file uses the hook without registering its surfaces.

This rule is what makes the rippling problem solvable: at any commit, you can grep `MODE_AWAVE_SURFACES` to see every place mode state matters, what it does, and who owns it.

### Atomic mode switching (canonical)

Mode enable / disable / swap (e.g., pregnancy → postpartum) is **atomic**. There is no 24-hour dual-state window. The transition runs as a single transaction:

1. New mode's `startedAt` is written.
2. Old mode (if any) gets `endsAt = now`.
3. Routine engine regenerates with new mode bias (per "Mode enable triggers immediate refresh" below).
4. Dashboard card-stack re-evaluates.
5. Notification scheduler re-evaluates pending notifications.
6. UI surfaces re-render via Zustand subscription.

If any step fails, the transaction rolls back — the old mode persists. Failure surfaces as a non-blocking toast (file 22 AI-failure pattern equivalent): *"We couldn't switch your mode just now. We'll try again on next app open."*

Pregnancy → postpartum specifically: enabling postpartum atomically disables pregnancy, sets pregnancy's `endsAt` to today, and starts postpartum's `startedAt` at today. There's no dual-active window during which both biases would apply.

### Mode enable triggers immediate refresh

When a user enables or disables a mode, the following must run synchronously before the Settings sheet closes:

1. Routine engine regenerates the user's current routine with mode-aware bias.
2. The dashboard `cardStackEvaluator` re-runs to update Slot 2 eligibility.
3. The notification scheduler re-evaluates pending notifications against the new suppression table (file 12).
4. The `useLifeStageMode()` hook's downstream consumers re-render via Zustand subscription.

Failure of any of these steps must be retried in a queue. The user is told once: *"We're updating your Vela for [mode]. This may take a moment."* Then the sheet closes.

### Practice-tier visibility into modes

A patient enrolled with a clinic via file 49 has mode state that the clinic might need to interpret data correctly. The decision (which file 49 references back here):

- The clinic sees a non-specific flag: *"This patient has a life-stage mode active that may affect their data interpretation."*
- The clinic does NOT see WHICH mode is active.
- The patient can opt-in to share the specific mode with the clinic via Settings → Connections → [Clinic] → "Share my life-stage mode." Default off.
- The flag itself toggles automatically based on `hasAny()`.

This balances medical-safety (clinic knows something to ask about) with patient privacy (mode itself stays app-private).

---

## Onboarding & discovery

We do **not** ask about life stages during initial onboarding (file 07). Most users don't need them, and asking implies "we want to put you in a category." Modes are discovered via:

1. Settings → Health & lifestyle → Life-stage modes (always available).
2. Diary tag triggers (one-time soft prompts when a relevant tag appears).
3. HealthKit-synced data triggers (cycle irregularity, pregnancy logged).
4. Treatment-tracking triggers (logging HRT or chemotherapy as a treatment surfaces the corresponding mode).

The diary-tag and HealthKit triggers fire only **once**. Dismissed → never asked again from that trigger.

---

## Settings surface

A new section in Settings: **Health & lifestyle**.

```
Settings → Health & lifestyle

  Apple Health connection                          >
  Cycle phase tracking                  Connected  >

  ─────────────────────────────────────────────
  Life-stage modes                               >

      Active: Postpartum
      Started Jan 12, ends Jan 12 next year
```

The Life-stage modes detail screen lists all available modes with status:

```
Life-stage modes

  Active modes
    ✿  Postpartum               12 months until auto-end   ✕

  Available
    Pregnancy                   Tap to enable
    Menopause / perimenopause   Tap to enable
    HRT — estrogen              Tap to enable
    HRT — testosterone          Tap to enable
    Cancer recovery             Tap to enable

  About these modes                                          >
```

The "About" link opens a single-screen explainer of what modes do and don't do. Plain language, brand-voice approved.

---

## AI prompt integration (file 06)

A new section in `06_AI_PROMPTS.md`: `LIFE_STAGE_CONTEXT`. This is not a standalone prompt — it's a context block injected into other prompts (score explanation, routine adaptation, monthly Wrapped, treatment insights) when a mode is active.

```
LIFE_STAGE_CONTEXT block (injected when a mode is active):

The user has the following life-stage mode(s) active. Adjust your framing
accordingly. Do not give medical advice. Do not pretend you are a doctor.

[ pregnancy mode ]
- The user is in pregnancy week {weeks_pregnant}.
- Frame skin and face changes as "what bodies do during pregnancy."
- NEVER reference body weight, "losing the baby weight," or appearance pressure.
- Tone: warm, observational, never alarmed.

[ postpartum mode ]
- The user is in postpartum month {months_postpartum}.
- Hair shedding peaks at month 4; recovery typical by month 12.
- Frame changes as expected recovery, not loss.
- Tone: gentle, never punitive about missed scans or routines.

[ menopause mode ]
- The user is in {peri | post}-menopause.
- Estrogen drop affects collagen, elasticity, hydration, redness reactivity.
- Frame changes in this context, not in "you're getting older" terms.
- Tone: matter-of-fact, no euphemism.

[ HRT mode (E/T) ]
- The user is on month {n} of {hormone-type} HRT.
- Reference documented timeline of HRT face changes.
- Use trans-inclusive language. Do not assume specific gender goals.
- Never use gendered pronouns unless the user has provided them.

[ cancer recovery mode ]
- The user is recovering from {treatment-type}.
- Treat any face/hair change as expected during recovery.
- Tone: maximally gentle. Never use "loss," "thinning," or alarming framing.
- Default to "this is what bodies do during recovery" framing.

ALWAYS:
- One observation, never a list.
- ≤22 words for short surfaces, ≤120 words for verdict / explanation surfaces.
- Brand voice (file 21). No exclamation marks. No forbidden words.
- Never imply the user should change anything. We describe; we don't prescribe.
```

---

## Privacy

- All mode metadata is encrypted at rest (same as profile data).
- Mode status is included in the data export (file 14) and account deletion cascades.
- HRT type and cancer treatment type are **never** sent to AI proxy without explicit opt-in (separate toggle from general "AI insights").
- Analytics events log mode `id` only — never duration, type, or specific metadata fields.
- The "active modes" status is visible only to the user; never shared with Family Sharing organizers, never visible to Aesthetic Medicine practice partners (file 49).

---

## Edge cases

- **User ends a mode and immediately re-enables** — full data is preserved; mode picks up where it was. No re-onboarding.
- **User in cancer recovery mode with active treatment in file 34 (e.g., tretinoin)** — the existing tracked treatment is paused, not deleted. User sees: *"Your tretinoin tracking is paused. We'll resume when you switch back to your defaults."*
- **User enables HRT mode but is also on file 34 finasteride for hair loss** — both coexist. The treatment timeline shows finasteride; HRT mode adjusts the broader chart context.
- **User completes pregnancy without enabling postpartum** — at 4 weeks past due date, soft check-in: *"Has the baby arrived? Tap to switch to postpartum, or turn pregnancy mode off."* If ignored for 8+ weeks, pregnancy mode auto-disables silently.
- **Pregnancy loss** — disable confirmation handles it gently; the data is preserved as the user wishes; we never re-prompt about pregnancy after a manual disable.
- **Mode enabled retroactively** — e.g., user remembers they were pregnant 6 months ago and wants the period flagged. They can backdate the `startedAt` and `endsAt`. The aging band, AI insights, etc. for those past weeks recompute. Wrapped retrospectives for those months will regenerate.
- **Multiple HRT cycles** — a user who started HRT, paused, restarted is supported via the existing treatment library (file 34); HRT mode tracks the *current* phase.

---

## Analytics

| Event | Properties | Notes |
|---|---|---|
| `lifestage_mode_enabled` | `mode_id, source: 'settings'|'diary-trigger'|'healthkit-trigger'|'treatment-trigger'` | Never log metadata |
| `lifestage_mode_disabled` | `mode_id, days_active_bucket` | |
| `lifestage_mode_overlap_active` | `count` | When 2+ modes are simultaneously on |
| `lifestage_mode_check_in_shown` | `mode_id, milestone: '18m'|'4w-past-due'|...` | |
| `lifestage_mode_pregnancy_to_postpartum_switched` | none | |
| `lifestage_ai_consent_toggle` | `mode_id, opted_in: bool` | Opt-in toggle for HRT / cancer recovery AI awareness |
| `lifestage_routine_adjustment_applied` | `mode_id, tasks_added_count, tasks_removed_count` | |
| `lifestage_treatment_block_triggered` | `mode_id, treatment_id` | When a contraindicated treatment was attempted |

PII rule: never log dueDate, lmpDate, birthDate, hrtStartedAt, treatmentType, or treatmentEndedAt in event properties.

---

## Pre-launch checklist

- [ ] All five mode IDs enable + disable correctly via Settings
- [ ] Aging band suppression / replacement verified per mode
- [ ] AI prompt LIFE_STAGE_CONTEXT block injected only when relevant mode active
- [ ] AI prompt outputs reviewed across 200 sample inputs per mode for tone (no exclamation marks, no body-pressure language, no medical advice)
- [ ] Routine engine biases verified per mode (specific tasks added/removed)
- [ ] Treatment library hard-blocks (pregnancy) and warnings (other modes) fire correctly
- [ ] Notification cadence softens per mode
- [ ] Streak auto-freeze offered at mode enable
- [ ] Diary tag suggestions surface mode-specific tags first
- [ ] Wrapped acknowledges active mode (when AI consent opted in for HRT / cancer)
- [ ] HealthKit cycle-irregularity trigger fires once for menopause mode
- [ ] Diary tag triggers fire once per tag
- [ ] Pregnancy → postpartum auto-suggested at due-date passage
- [ ] Pregnancy loss disable copy reviewed and approved by sensitivity reviewer
- [ ] Cancer recovery enable shows extra privacy reassurance card
- [ ] HRT mode never sends type to AI proxy without opt-in
- [ ] Sentry / PostHog scrub all metadata fields
- [ ] Account deletion cascades all life-stage data
- [ ] Data export includes mode history
- [ ] VoiceOver: mode toggle screens read correctly
- [ ] Brand voice review: every mode-specific copy string read aloud
- [ ] Persona check: trans user (Jordan) walked through HRT mode end-to-end
- [ ] Persona check: pregnant user walked through pregnancy → postpartum transition
- [ ] Persona check: perimenopausal user walked through menopause mode
- [ ] Sensitivity review: cancer recovery copy reviewed by external reviewer (oncology-aware)
- [ ] Maestro flow: enable pregnancy mode → log diary entry → see softened tone → disable cleanly
