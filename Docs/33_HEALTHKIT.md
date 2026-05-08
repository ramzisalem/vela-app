# 33 — HealthKit Correlation Engine

## Why this exists

Vela measuring face change is interesting. Vela explaining *why* faces changed — *because the user slept under six hours four nights running, or because their luteal phase is in week three, or because their HRV dipped* — is a product nobody else has.

This is the actual moat. Hardware and AI are commodities. **Correlations between what you feel and what shows up on your face are not.** Oura's whole business is this layer applied to body data; Vela becomes the same thing for face data.

The feature respects three product principles:

1. **Causal hypotheses, never diagnoses.** *"Your eye area looks tired on weeks you sleep less"* — yes. *"You have under-eye dehydration syndrome"* — never.
2. **The user already trusts HealthKit.** We piggyback on that trust; we do not ask for new credentials or build a competing health database.
3. **The correlation engine works on-device.** No body data leaves the phone. The AI proxy only ever sees aggregated, anonymized hypotheses — never raw values.

This file extends `02_TYPES_AND_MODELS.md` (new types), `03_BACKEND_SUPABASE.md` (no new server tables — see "On-device first" below), `06_AI_PROMPTS.md` (insight generation prompt), `07_ONBOARDING.md` (lazy permission ask), `10_DASHBOARD.md` (insights surface), and `14_SETTINGS_AND_SUBSCRIPTION.md` (toggle).

---

## What HealthKit data we use, and why

| HealthKit type | Why it matters for face | Read frequency |
|---|---|---|
| `HKCategoryTypeIdentifierSleepAnalysis` | Sleep duration & quality drives periorbital hollowness, redness, perceived fatigue | Every app open + nightly fetch |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | Stress proxy; correlates with skin reactivity, breakout cycles | Daily |
| `HKQuantityTypeIdentifierRestingHeartRate` | Recovery proxy | Daily |
| `HKCategoryTypeIdentifierMenstrualFlow` + `HKCategoryTypeIdentifierIntermenstrualBleeding` | Cycle phase awareness; massive driver of skin clarity & oil | Daily, when user opts in |
| `HKQuantityTypeIdentifierBodyMass` | Weight changes correlate with facial volume (jowls, cheek hollows) | Weekly |
| `HKQuantityTypeIdentifierDietaryWater` | Hydration → skin clarity, undereye fullness | Daily |
| `HKQuantityTypeIdentifierBloodAlcoholContent` (rare) and `HKQuantityTypeIdentifierNumberOfAlcoholicBeverages` | Alcohol → puffiness, redness next morning | Daily |
| `HKQuantityTypeIdentifierStepCount` | General activity proxy | Daily |
| `HKWorkoutType` | High-intensity exercise → next-day inflammation/redness in some users | Daily |
| `HKQuantityTypeIdentifierVO2Max` | Long-term cardiovascular conditioning correlate (months/years) | Weekly |

**What we deliberately don't read:**
- Audiogram, ECG, body fat percentage (irrelevant to face).
- Anything in `HKObjectType.clinicalType` — clinical records are a separate, stricter permission domain we don't need.
- Mindfulness sessions (interesting but noisy — don't ask).

---

## Types

```ts
// src/types/health.ts
// Add to 02_TYPES_AND_MODELS.md during implementation.

export interface HealthSnapshot {
  // Snapshot of a single day's HealthKit data, stored locally.
  date: string;                    // YYYY-MM-DD, device-local
  sleepHours: number | null;       // total sleep, hours
  sleepEfficiency: number | null;  // 0–1, time-asleep / time-in-bed
  sleepLatencyMin: number | null;  // minutes to fall asleep
  hrvSdnn: number | null;          // ms
  restingHeartRate: number | null; // bpm
  cyclePhase: CyclePhase | null;   // null when user hasn't opted in
  cycleDay: number | null;         // 1–28 typical, can extend
  weightKg: number | null;
  hydrationMl: number | null;
  alcoholDrinks: number | null;    // standard drinks consumed
  stepCount: number | null;
  hadIntenseWorkout: boolean | null;
}

export type CyclePhase =
  | 'menstrual'    // ~days 1–5
  | 'follicular'   // ~days 6–14
  | 'ovulatory'    // ~days 14–16
  | 'luteal';      // ~days 17–28

export interface Correlation {
  id: string;
  // The face metric being explained.
  faceMetric: 'overall' | 'redness' | 'clarity' | 'eyeArea'
            | 'cheekVolume' | 'jawDefinition' | 'symmetry';
  // The lifestyle signal correlated.
  healthSignal: 'sleep' | 'hrv' | 'cyclePhase' | 'weight'
              | 'hydration' | 'alcohol' | 'workout';
  // Statistical strength.
  pearsonR: number;        // -1 to 1
  pValue: number;          // significance threshold for surfacing
  sampleSize: number;      // weeks of overlapping data
  // Plain-language hypothesis written by the AI proxy (OpenAI).
  insight: string;         // ≤140 chars, brand voice
  // The most recent week's example, surfaced if relevant.
  recentExample?: { date: string; faceDelta: number; signalValue: number };
  generatedAt: string;
  shownToUserAt?: string;
}
```

---

## On-device first — what runs where

```
┌─────────────────────────────────────────────────────────────┐
│                       iPhone                                │
│  ┌──────────────────┐    ┌────────────────────────────┐     │
│  │  HealthKit       │    │  WatermelonDB              │     │
│  │  (Apple, on OS)  │───▶│  health_snapshots table    │     │
│  └──────────────────┘    │  (one row per day)          │     │
│                          └─────────────┬───────────────┘     │
│  ┌──────────────────────────────────────┼──────────────┐     │
│  │  CorrelationEngine (TypeScript)      │              │     │
│  │  - Pearson r over rolling 8-week     │              │     │
│  │    window per (face_metric, signal)  │              │     │
│  │  - Filters by p < 0.1, n ≥ 6         │              │     │
│  │  - Top 3 strongest correlations      │              │     │
│  │    → submitted to AI for phrasing    │              │     │
│  └──────────────────────────────────────┼──────────────┘     │
│                                         │                    │
└─────────────────────────────────────────┼────────────────────┘
                                          │ (numbers only,
                                          │  no raw values)
                                          ▼
                          ┌──────────────────────────────────┐
                          │  Supabase Edge Function          │
                          │  (ai-proxy → OpenAI gpt-4o-mini)   │
                          │  Returns plain-language insight  │
                          └──────────────────────────────────┘
```

> **Privacy invariant:** the body data the user has chosen to share with HealthKit *never* leaves the phone in raw form. The Edge Function receives only `{ faceMetric, healthSignal, pearsonR, sampleSize }` — enough to write a sentence, not enough to reconstruct anything personal.

---

## Permission flow

We do not ask for HealthKit access at app launch or during onboarding. We ask **lazily, in context**, the first time the user lands on the dashboard with at least three weeks of scans.

### The ask screen

A single full-bleed screen with cream surface, serif headline, soft body copy:

> **You log scans here. You log sleep there.**
>
> If you'd like, Vela can connect to Apple Health to spot patterns between how you live and what shows up on your face. Your health data never leaves your phone — we read it locally to find correlations, then forget the underlying numbers.
>
> *[ Connect Apple Health ]*  *[ Maybe later ]*

Tap "Connect Apple Health" → present the standard `HKHealthStore.requestAuthorization` sheet with the read-only types listed earlier.

### What happens if the user denies

- The dashboard never shows the insights card; it shows the existing layout unchanged.
- No further nagging. The "Connect Apple Health" entry point lives in Settings → Connections (file 14) for whenever they change their mind.
- No silent retries on app launch.

### Cycle data — separate, opt-in, gentle

When a profile's gender field is `woman` or `non_binary`, the ask screen has a checkbox: *"Include menstrual cycle data — for finding patterns by cycle phase."* Default off. If checked, the `HKCategoryTypeIdentifierMenstrualFlow` permission is included.

For users who don't see that checkbox or leave it off, all cycle-related correlations are skipped.

> **Sensitivity note:** never assume a user wants their cycle tracked. Some women don't track at all; some are pregnant or postpartum; some are perimenopausal; some are trans women without cycles. The opt-in checkbox is the only correct way.

> **Foreshadowing rule:** users who pick `woman` or `non_binary` at onboarding Q1 see a small foreshadow line at that moment (file 07): *"Later on, you'll be able to opt in to cycle-phase tracking if you'd like — entirely optional, you can skip then."* This file's lazy ask is then expected, not surprising.

---

## Correlation engine

### Inputs
- 8-week rolling window of `HealthSnapshot` rows.
- 8-week rolling window of `Capture3D` + sub-score deltas (from file 32).

### Algorithm
For each `(faceMetric, healthSignal)` pair:

1. Align the time series — face metrics are weekly (one scan/week); health signals are daily (averaged across the 7 days preceding each scan).
2. Compute Pearson r and p-value.
3. Filter:
   - `n ≥ 6` weeks of overlap.
   - `|r| ≥ 0.4` (moderate or stronger).
   - `p < 0.1` (lenient — we're presenting hypotheses, not publishing papers).
4. Rank by `|r|`, pick the top 3 across all pairs.
5. For each top correlation, send `{ faceMetric, healthSignal, pearsonR, sampleSize }` to the AI proxy with the insight-generation prompt; receive a ≤140 char plain-language phrasing.
6. Cache for 7 days. Re-run weekly after each new scan.

### Why not a fancier model
A full causal-inference graph or per-user regression is overkill at this scale and risks false confidence. Correlations are *suggestions*. Anything more sophisticated would need to express uncertainty better, which is a v2 problem.

### Edge case: spurious correlations
With ~10 health signals × 7 face metrics = 70 pairs, we will find spurious p < 0.1 results by chance (Bonferroni would demand p < 0.0014). Three guards:

1. We only surface the top **3**, never the top 10. A user seeing one moderate correlation per face metric is plausible; seven would be noise.
2. The AI prompt that generates phrasing is told *"Frame this as a possibility, not a fact."* See prompt below.
3. Insights have an explicit "Helpful?" 👍 / 👎 thumbs in the UI; we use the negative signal to suppress similar phrasings for that user.

---

## AI insight prompt

Add to `06_AI_PROMPTS.md` as `HEALTH_INSIGHT_SYSTEM`:

```
You are writing a single short observation about a possible link between someone's
health data and how their face has changed. You are not a doctor.

VOICE:
- Vela voice (see file 21): considered, warm, never urgent, never excited.
- No exclamation marks.
- No words from the brand forbidden list.
- Plain English. No clinical jargon.

OUTPUT:
- One sentence, ≤140 characters.
- Frame the link as a possibility ("often", "might track with", "tends to coincide").
- Never claim causation. Never use the word "cause."
- Do not give medical advice. Do not mention products or treatments.
- If the correlation is weak (|r| < 0.5), use softer language ("a faint pattern").

EXAMPLES — good:
- "Your eye area tends to look more rested on weeks you average over seven hours of sleep."
- "There's a faint pattern: your skin clarity dips during the few days before your period."
- "Your jaw definition has tracked your weight over the past two months."

EXAMPLES — bad (do not produce):
- "Sleep deprivation is causing dark circles."
- "Drink more water for clearer skin!"
- "Your luteal phase is destroying your skin."
```

User message:
```
Face metric: {faceMetric}
Health signal: {healthSignal}
Correlation strength (Pearson r): {pearsonR}
Weeks of data: {sampleSize}
```

---

## Where insights surface

### Dashboard insights card (file 10)

Below the trend chart, above the routine recap, a single card titled *"Patterns we noticed"* with the top insight (or a horizontally-scrollable carousel for the top 3). Each card:

- Soft cream background, serif headline (the face metric), body sentence (the AI-written insight), one tap-target *"What this is"* that opens a sheet explaining how the pattern was found.
- Thumbs 👍 / 👎 in the bottom-right corner, very subtle. Tapping either dismisses the card and updates a per-user feedback signal.

When there are no insights yet (fewer than 6 weeks of overlapping data), the card shows:

> *"Once you've scanned for a few more weeks, we'll start spotting patterns between how you live and what shows up on your face."*

Friendly, never patronizing.

### Per-scan footer
The reveal screen (file 05) gets one optional line at the bottom when relevant: *"This scan came after a low-sleep week — we'd expect a tired-looking eye area, and there it is."* Only shown when both conditions are present and the correlation has been validated for this user before.

### Cycle-aware overlay
If cycle data is connected, the trend chart (file 10) gains an optional shaded overlay marking the user's luteal phase weeks. Off by default; toggle in chart settings. Copy under the toggle: *"Your skin often shifts in the days before your period. Show those weeks?"*

---

## Settings & control

A new section in Settings (file 14) → *Health & lifestyle*:

- **Apple Health connection** — connected / not connected. Tap → opens the system Health app's source-permissions screen for Vela.
- **Read which data?** — list of granted types with toggles to revoke individually. Note that revoking is honored on the next app open.
- **Cycle phase tracking** — separate toggle, only visible to users who opted in.
- **Pause insights** — temporarily hide the insights card without revoking permissions. Useful for users going through life events (illness, pregnancy, grief) who don't want pattern analysis right now.

---

## Edge cases

- **HealthKit unavailable** — Apple Watch users may have rich data; iPhone-only users may have basically none. Engine reports "not enough data yet" until thresholds are met. Never blame the user.
- **Sparse data** — a user who has 8 weeks of scans but only 12 days of sleep data needs the engine to skip sleep correlations entirely. Filter at the per-signal level, not just the per-user level.
- **HealthKit returns errors** — sandbox issues, permissions revoked mid-session. Engine logs to Sentry (PII-stripped), surfaces nothing to the user, retries next app open.
- **User in a country where HealthKit is restricted** — China-region phones disable some HealthKit features. Engine respects what's available.
- **Cycle phase confusion (perimenopause, irregular cycles)** — if `cycleDay` is `null` for >40% of recent days, we suppress cycle-based correlations and show: *"Your cycle data hasn't been complete enough to spot patterns lately. We'll keep watching."*
- **User has been ill or on antibiotics** — they may want to mark a week as "not representative." Diary (file 37) handles this; the correlation engine reads diary "skip from analysis" tags and excludes those weeks.
- **Apple Watch Pro user with extreme HRV ranges** — outliers can dominate Pearson. Pre-filter to remove values outside 3 SD per user before computing.

---

## Privacy primer (added to onboarding & Settings → About)

> Vela can read certain things from Apple Health if you connect it: how long you slept, your heart-rate variability, things like that. Reading happens on your phone. The numbers themselves never leave your phone. We use them to spot patterns between how you live and what shows up on your face — and we tell you what we found in a sentence. That's it.
>
> You can disconnect anytime in Settings, or in the iPhone's Health app under Sources.

---

## Analytics events

| Event | Properties | PII guard |
|-------|-----------|-----------|
| `health_permission_prompt_shown` | `weeks_of_scans` | none |
| `health_permission_granted` | `included_cycle: bool` | never log specific types granted |
| `health_permission_denied` | none | never log to user properties |
| `correlation_computed` | `face_metric, health_signal, r_bucket: 'low'|'medium'|'high', sample_size_bucket` | never log raw r |
| `insight_shown` | `face_metric, health_signal, position: 1|2|3` | never log the insight text (could contain inferred info) |
| `insight_thumbs_up` / `insight_thumbs_down` | `face_metric, health_signal` | |
| `health_setting_pause_insights` | `paused: bool` | |
| `health_setting_disconnect` | none | |

All events scrubbed by Sentry's `beforeSend` per file 25.

---

## Pre-launch checklist

- [ ] HealthKit entitlement added to iOS provisioning profile
- [ ] `NSHealthShareUsageDescription` set in Info.plist with this exact copy: *"Vela reads sleep, heart-rate variability, weight, hydration, cycle phase, and activity to spot patterns with how your face changes. This data stays on your phone."*
- [ ] No `NSHealthUpdateUsageDescription` — we never write to HealthKit
- [ ] Lazy permission flow tested — never asked at launch or onboarding
- [ ] Cycle checkbox only shown to `woman` / `non_binary` profiles
- [ ] Permission revocation honored on next app foreground
- [ ] Correlation engine produces zero correlations with <6 weeks of data
- [ ] Outlier filter (3 SD) applied per signal before Pearson
- [ ] AI insight prompt produces no exclamation marks across 100 sample inputs
- [ ] Insight card respects light + dark mode
- [ ] "Pause insights" hides card without revoking permission
- [ ] Insights cache invalidated on new scan
- [ ] PostHog events scrubbed of any HealthKit numeric values (Sentry beforeSend test)
- [ ] No HealthKit data ever sent over network — verified via mitm proxy run
- [ ] VoiceOver: insights card reads "Pattern noticed: <insight text>. Helpful, button. Not helpful, button."
- [ ] First-run on a brand-new account doesn't show the prompt until week 3 scans
- [ ] Sample-size bucket boundaries documented for analytics review (6–7, 8–11, 12+)
- [ ] Settings → Health & lifestyle section reachable from canonical Settings nav (file 14, file 20)
