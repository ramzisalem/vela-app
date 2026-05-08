# 41 — Trial-to-Paid Conversion Mechanics

## Why this exists

Vela's structural problem: meaningful change in a face takes weeks. The 7-day trial ends before any user has seen real movement. Without intervention, users decide whether to subscribe based on novelty rather than evidence. Two interventions close the gap:

1. **Day 7 forecast card** — a personalized preview of what the user's *own* dashboard will look like at week 4 if they stay consistent. Mocked-data, clearly labeled, anchored in their actual baseline.
2. **Trial-extension save flow** — when a user heads toward cancellation during the trial, offer 14 more days at no cost (no discount, no pause, no bargaining). The premise: skin takes time. We acknowledge it. We give them the time.

Together these reframe the trial-end decision from "is this app working yet?" (almost always no at day 7) to "is this app something I want to keep going with?" (a much more answerable question, with much higher conversion).

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `08_PAYWALL.md`, `10_DASHBOARD.md`, `12_NOTIFICATIONS.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `15_DESIGN_SYSTEM.md`, `25_ANALYTICS.md`, and `30_DEEP_LINKING.md`.

---

## Product principles

1. **Promise nothing the data won't keep.** The forecast is illustrative and clearly labeled. We never imply guaranteed outcomes.
2. **Time, not money, is the lever.** When someone is mid-cancel, offering a discount feels transactional. Offering more time feels honest because the user's stated objection — "I haven't seen change yet" — is genuine.
3. **One save attempt, never two.** A user who declines the trial extension is not pursued further within the trial window. Brand respect outranks short-term conversion lift.
4. **The forecast is recoverable.** A user who saw it on day 7 can revisit it from the paywall, the dashboard, or Settings. It's an artifact, not a moment.

---

## Card 1 — The Day 7 Forecast

### When it appears

- The morning of day 7 (or the user's local timezone equivalent), at 9 AM local.
- Pinned to the top of the dashboard for the rest of trial day 7 + day 8.
- Triggered by an opt-in notification: *"Your week-four preview is ready when you are."* Default on (this is the rare opt-in default-on case — the notification is single-fire, time-bound, and high-value).
- Also surfaces at the top of the trial-end paywall as a *"See what's coming"* link.

### Visual

Full-bleed cream surface. Vertical card stack of three sub-cards swipeable left-to-right:

#### Sub-card 1 — Header

```
┌─────────────────────────────────────────┐
│                                         │
│   Your week four,                       │
│   if you stick around.                  │
│                                         │
│                                         │
│   A preview, based on what your face    │
│   has shown us so far and what we       │
│   typically see in someone your age     │
│   sticking with their routine.          │
│                                         │
│                                         │
│   This is mocked-up. Real numbers       │
│   start when they start.                │
│                                         │
└─────────────────────────────────────────┘
```

The "This is mocked-up" line is **mandatory** and rendered in `text.tertiary`. Honesty about what the user is seeing is the brand premise of this whole feature.

#### Sub-card 2 — The dashboard preview

A faithful render of the actual dashboard component (file 10), populated with **mocked future data**:

- **The score** — projected value at week 4 based on:
  - User's baseline score (`Capture3D` baseline + 2D sub-scores)
  - Population-derived improvement curves for "consistent users with similar starting profile" (drawn from a dataset of internal benchmarks; precision intentionally low — we project a band, not a point).
- **The trend chart** — shows the user's actual day-1 baseline and day-7 second scan (real points), then a dashed projected line through week 4 with a soft uncertainty band (file 36 aging-band style applied to a forward projection).
- **The sub-score deltas** — projected, presented as ranges: *"Skin clarity: +1 to +3 points"*. Never a single number.
- **A "Patterns we noticed" card placeholder** — populated with one synthesized correlation built from the user's actual HealthKit data if connected: *"Pattern noticed: your skin clarity tends to track with your sleep — three weeks of data and we'll know for sure."*

A pinned watermark across the entire card: a soft diagonal "PREVIEW" in `text.tertiary` at 14% opacity. Visible enough to read; not so visible it makes the card look like a stamp.

#### Sub-card 3 — Footer with action

```
┌─────────────────────────────────────────┐
│                                         │
│   What gets you there:                  │
│                                         │
│   ✿  Weekly scan (you've done two)      │
│   ✿  Daily routine (consistency lifts   │
│       what's controllable)              │
│   ✿  Apple Health connection if you     │
│       have one (sharper patterns)       │
│                                         │
│                                         │
│   ┌────────────────────────────────┐    │
│   │  Continue with Vela            │    │
│   └────────────────────────────────┘    │
│                                         │
│   No thanks                             │
│                                         │
└─────────────────────────────────────────┘
```

- *Continue with Vela* button — the existing trial-end paywall conversion CTA.
- *No thanks* — opens the trial-extension save flow (Card 2 below).

### Forecast generation pipeline

```
1. Read user's:
   - Baseline scan + sub-scores
   - Day-7 scan (if present) + delta from baseline
   - Onboarding profile (age, gender, scoring framework)
   - HealthKit connection state

2. Look up the projected-trajectory dataset for their cohort:
   - Indexed by (age decade, scoring framework, baseline percentile)
   - Returns expected score range at week 4 for "consistent users"

3. Generate forecast:
   - Score band at week 4 (lower bound, upper bound)
   - Sub-score deltas as ranges, never single numbers
   - One synthesized pattern (if HealthKit) or one synthesized observation

4. AI proxy generates copy for sub-card headers and the synthesized
   pattern phrasing, using FORECAST_COPY_SYSTEM.

5. Render card with watermark.
```

### Where the trajectory dataset comes from

A static dataset shipped with the app, derived from internal cohort analyses of consistent users (post-launch data) or, pre-launch, from peer-reviewed studies of routine-driven score improvements. The dataset is conservative on purpose:

- We project the **median expected change**, not the optimistic case.
- We always show a range, never a single number.
- We never project regression or negative outcomes — the forecast is structurally an "if you stay consistent" preview; the alternative path is what their dashboard already shows.

The dataset is stored in `app_config.forecast_curves` and remote-configurable so we can refine it with real data post-launch.

### `FORECAST_COPY_SYSTEM` prompt

Add to `06_AI_PROMPTS.md`:

```
You write copy for a "what your dashboard could look like in three weeks" preview
card. The user is on day 7 of their trial.

CONTEXT YOU WILL RECEIVE:
- User's baseline + day-7 delta
- Projected band for week 4
- HealthKit connection state
- Any active treatments

VOICE: Vela voice (file 21). Calm. Honest. No urgency.

OUTPUT — generate three short strings:
1. headerLine: a phrase like "Your week four, if you stick around." (≤8 words).
   Cannot use exclamation marks. Cannot promise outcomes.
2. patternHypothesis: a one-line synthesized pattern, ≤22 words.
   - If HealthKit connected: pull a real signal correlation in the user's data
     so far. Frame as "tends to track with" or "may correlate with".
   - If HealthKit NOT connected: propose what we WOULD watch for
     ("If you connect Apple Health later, we'll start watching for sleep
     patterns").
   Always end with the word "soon" or "sharper" or "clearer" — pointing forward.
3. footerActionLine: a phrase ≤8 words inviting the user to keep going.
   Must NOT use the word "subscribe", "buy", "sign up", or "continue trial".
   Prefer "Continue with Vela", "Keep going", "Stay here".

FORBIDDEN:
- "Glow", "transformation", "amazing", "incredible", "best version".
- Any number or score.
- Any guarantee. ("Your score WILL", "you'll see")
- Promising specific products or treatments.

Return JSON:
{ "headerLine": "...", "patternHypothesis": "...", "footerActionLine": "..." }
```

### Edge cases

- **User hasn't done a day-7 scan yet** — only baseline data feeds the forecast. Cohort projection still works. Sub-score deltas are wider (±5 instead of ±2).
- **HealthKit not connected** — `patternHypothesis` becomes a forward-looking *"If you connect Apple Health later, we'll start watching for sleep patterns sharper after a few weeks."*
- **Forecast fails (AI down, dataset missing for user's cohort)** — show the card with deterministic copy and the trend chart only, no patterns or sub-cards 2's pattern card. Better to ship something honest than nothing.
- **User dismissed the day-7 notification but opens app on day 8** — card is still pinned to dashboard for the rest of day 8.
- **User on extended trial (see Card 2 flow)** — day 7 card fired once. We don't refire on day 14 or day 21 — the moment was the original trial-end window.
- **User opens app multiple times on day 7** — card is non-modal, dismissable, and pinned. They see it but it doesn't block anything.
- **User is in App Store review's testflight track** — same flow. We don't gate forecasts behind production-only state.

---

## Card 2 — The Trial-Extension Save Flow

### When it triggers

The user taps *Cancel subscription* in:
- Settings → Subscription → Cancel
- The system iOS subscription management page (we detect this via `customerInfoUpdate` from RevenueCat — see Detection below)
- The "No thanks" affordance on the day-7 forecast card

…**within the trial window**. (Post-trial cancellation routes to file 47, the cancel-save flow.)

### The flow

A single full-bleed sheet — not a modal alert — appears before the cancellation is confirmed. One question, one option, one fallback.

```
┌─────────────────────────────────────────┐
│                                         │
│   Skin takes time.                      │
│                                         │
│   Most of the change Vela tracks shows  │
│   up at three to six weeks. The trial   │
│   ends before that.                     │
│                                         │
│   We can give you another two weeks,    │
│   on us, to see what happens.           │
│                                         │
│                                         │
│   ┌────────────────────────────────┐    │
│   │  Give me two more weeks        │    │
│   └────────────────────────────────┘    │
│                                         │
│   Continue cancelling                   │
│                                         │
└─────────────────────────────────────────┘
```

- *Give me two more weeks* — extends the trial by 14 days. No payment, no commitment, no card on file change. Implementation via RevenueCat custom entitlement override (see "Implementation" below).
- *Continue cancelling* — proceeds to cancellation as normal. No further save attempt.

### Why this works

Industry data on similar "give me more time" mechanics in subscription apps:
- Conversion of would-be cancellers: **18–35%** (vs. ~8–12% for discount offers in the same context).
- Of users who accept the extension, ~55–65% convert to paid at the new trial end (vs. ~25% baseline trial-to-paid).
- Net: extending grants a meaningful LTV lift while preserving brand integrity.

The reason: the user's stated objection is real — they haven't seen change. We meet the objection on its terms.

### Eligibility rules

- One trial extension per user, ever.
- Available only during the original 7-day trial window or earlier.
- Not available if the user has already extended once.
- Not available if the user has had a paid subscription with Vela in the past (they're not in a "haven't seen change yet" state — they're a returning lapsed user, file 47 handles them).
- Available regardless of how many scans the user has logged (we don't gate on engagement; the offer is the offer).

### Implementation

#### RevenueCat entitlement extension

RevenueCat's API supports manual entitlement grant via the server-side admin API:

```
POST /v1/subscribers/{user_id}/entitlements/{entitlement_id}/promotional
{ "duration": "two_week", "start_time_ms": <now> }
```

A new Edge Function `extend-trial`:

```ts
// Edge function: extend-trial
export async function handler(req: Request) {
  const { user_id } = await req.json();

  // Eligibility check
  const profile = await getProfile(user_id);
  if (profile.trial_extended_at) return errorResponse('already-extended', 409);
  if (profile.has_ever_paid) return errorResponse('not-eligible', 403);
  if (!profile.is_in_trial) return errorResponse('not-in-trial', 409);

  // Grant via RevenueCat
  await rc.grantPromotionalEntitlement(user_id, 'vela_premium', 'two_week');

  // Stamp the profile
  await db.profile.update(user_id, {
    trial_extended_at: nowIso(),
    trial_extension_ends_at: addDays(now, 14).toIso(),
  });

  // Track analytics, fire welcome notification
  await trackServer('trial_extension_granted', { user_id });
  await scheduleNotification(user_id, 'trial_extension_welcome', addHours(now, 1));

  return successResponse();
}
```

A new column on `profiles`:

```sql
alter table public.profiles
  add column trial_extended_at timestamptz,
  add column trial_extension_ends_at timestamptz;
```

#### Day-7 of the extension — second forecast card?

No. We do not re-fire the forecast card. The user has had their preview. At day 13–14 of the extension (so day 20–21 from sign-up), the standard trial-end paywall fires once with the existing copy (file 08), with one small variation: *"You've had three weeks. Where you've landed is real now."* Honest framing, no manipulation.

If the user cancels at the extension end, file 47's cancel-save flow handles them.

---

## Detection: when the user is heading to cancel

RevenueCat fires a `customerInfoUpdate` listener whenever the user's subscription state changes. We can detect cancel intent via:

1. **In-app cancel** — Settings → Subscription → Cancel button is the obvious one. Our code intercepts that tap and renders the save sheet.
2. **iOS system cancel** — User cancels via Settings.app → Subscriptions. RevenueCat fires `customerInfoUpdate` with `willRenew: false`. The next time the user opens Vela, if they are still in the trial window AND have not been offered the extension, the save sheet appears as a one-time interstitial after the launch flow completes.

For (2) we have to be careful: if the user opens the app to genuinely use it and gets a save sheet they didn't ask for, that's intrusive. The rule:

- The save sheet appears once, on the first launch after detection.
- It is dismissable at any time; dismissal is treated as "Continue cancelling."
- The user can re-trigger it by going to Settings → Subscription → "Restore my trial extension offer" (one-time) — but this is hidden behind a small footnote, not actively promoted.

### Race resolution: system-iOS cancel WHILE the trial is still active

A user can cancel via iOS Settings.app while still mid-trial. By the time the app foregrounds and our save sheet considers showing, the cancellation has already propagated through RevenueCat. The user's state at that moment:

- `subscription_status: 'trial'` (still active until trial-end date — Apple keeps the entitlement until then even after cancel)
- `willRenew: false` — RevenueCat reports they won't auto-convert at trial end

Our save sheet IS shown (the user is still in trial; the extension can still be granted; cancellation hasn't taken effect yet — Apple delivers their subscription until trial-end and only then doesn't auto-convert). If the user accepts the extension:

- We grant the 14-day promotional entitlement via RC. Apple's "won't renew" flag still stands for the original SKU; the promotional entitlement is independent. The user gets 14 free days starting now, and the trial-end conversion that would have happened simply doesn't (which is what they wanted anyway by cancelling).

If the user declines the save offer ("Continue cancelling"):

- No further save attempts within this session or this lifecycle. The trial runs out at its scheduled end. They land at the lapsed flow (file 46) per the standard timeline.

This is the canonical behavior for the timing race; without this rule documented, Cursor will invent inconsistent behavior between "cancel detected pre-trial-end" and "cancel detected post-trial-end."

---

## Trial-extension welcome moment

When the user accepts the extension, a small celebration moment that's still on-brand for Vela:

- The save sheet swaps to a confirmation card (no animation):

  > *"Done. You have 14 more days. We'll be here when something interesting shows up."*

  *[ Back to Vela ]*

- A passive in-app banner appears on the dashboard for 24 hours: *"Trial extended. Day 1 of 14 — let's see what changes."*

- A push notification fires 1 hour after extension acceptance: *"Two weeks on us. Your next scan opens up new patterns once we have three weeks of data."*

- After day 7 of the extension (so day 14 from sign-up), the dashboard surfaces a "Patterns we noticed" card with whatever HealthKit correlation has emerged from the now-2-weeks-of-data window. **This is the payoff.** A user who took the extension specifically to see patterns gets to see one.

---

## Pre-trial-end notifications

Even outside the save flow, the existing trial-end notification cadence (file 12) deserves a small refinement:

- **Day 5 of trial** — opt-out: *"Two days left. Where would you like to go from here?"* Tap → opens dashboard.
- **Day 6 of trial** — opt-out: *"Tomorrow's preview is set."* (Anticipation framing for the day-7 forecast card.)
- **Day 7 morning** — *"Your week-four preview is ready when you are."* (The forecast card.)
- **Day 7 evening** — only if the user hasn't engaged with the forecast: *"Your preview's still here if you'd like to see it."*

After day 7 cancellation, the standard lapsed-user reactivation cadence kicks in (file 46).

---

## Edge cases

- **User accepts extension immediately, then changes mind 30 minutes later** — extension is reversible until day 1 ends. Settings shows a *"Cancel my extension"* button during that window. After 24 hours, the extension is committed and the only path forward is the standard paywall flow.
- **User on a yearly trial** (if Vela ever offers one) — extension is also 14 days; we don't scale by trial length. Yearly trials are a different beast and are out of scope for this file.
- **User is in a region where the App Store doesn't allow promotional entitlements** — the save sheet shows a different copy: *"Right now we can only offer this in some regions. We'd still love to know what made you cancel."* and routes to the exit interview (file 47).
- **User uninstalls during the extension** — RevenueCat preserves the entitlement until it expires. If they reinstall and sign in within the 14-day window, they pick up where they left off. After 14 days the entitlement lapses and the standard paywall greets them.
- **Dev / TestFlight users** — extensions work normally; the eligibility check uses RevenueCat sandbox. Internal-tester profiles can extend repeatedly via a feature flag.
- **User accepts extension but doesn't open the app for 14 days** — the extension expires, the standard paywall greets them on next open, and the lapsed-user reactivation flow (file 46) takes over once they hit 30 days lapsed.

---

## Privacy

- The forecast generation calls the AI proxy with anonymized cohort identifiers (age decade, framework, baseline percentile bucket) — never raw scores or photos.
- The `forecast_curves` dataset is generic, not user-specific.
- The trial-extension Edge Function logs only: user ID, granted-at timestamp. No personal data, no reasons, no exit-interview answers.
- The save-sheet detection uses RevenueCat state changes; we don't surveil iOS Settings.app activity directly.

---

## Analytics

| Event | Properties | Notes |
|---|---|---|
| `forecast_card_shown` | `day_in_trial, has_day7_scan: bool, has_healthkit: bool` | |
| `forecast_card_dismissed` | `dwell_ms, last_subcard_seen` | |
| `forecast_card_action_taken` | `action: 'continue'|'no-thanks'` | |
| `trial_save_sheet_shown` | `entry_point: 'in-app-cancel'|'system-cancel'|'forecast-no-thanks'` | |
| `trial_save_sheet_action` | `action: 'extend'|'continue-cancel'` | |
| `trial_extension_granted` | `entry_point` | Server-side event |
| `trial_extension_canceled_within_24h` | `hours_since_grant` | |
| `trial_extension_welcome_shown` | none | |
| `trial_extension_payoff_card_shown` | `day_in_extension` | When the patterns card appears |
| `trial_extension_converted_to_paid` | `days_used` | |
| `trial_extension_lapsed` | none | |

Never log forecast text, save-sheet copy variants, or AI output.

---

## Pre-launch checklist

- [ ] Day 7 forecast card surfaces on day 7 morning local time
- [ ] Forecast generated for users with and without day-7 scan
- [ ] Forecast generated for users with and without HealthKit connection
- [ ] "PREVIEW" watermark visible at 14% opacity in both light and dark mode
- [ ] AI prompt produces JSON across 200 sample inputs, no exclamation marks
- [ ] Forecast fallback (deterministic copy + chart only) when AI fails
- [ ] Trajectory dataset shipped, conservative bands verified
- [ ] Trial extension Edge Function tested with sandbox RevenueCat user
- [ ] Eligibility checks: trial-only, never-paid, not-already-extended
- [ ] Save sheet renders in-app cancel and system cancel paths
- [ ] System-cancel detection triggers save sheet on next app open exactly once
- [ ] Save sheet "Continue cancelling" routes to standard cancel flow with no further save attempts
- [ ] Trial-extension confirmation: 24-hour window where user can reverse
- [ ] Day 7 of extension: HealthKit pattern card surfaces if data warrants
- [ ] Day 14 of extension: standard paywall fires with adjusted copy
- [ ] Brand voice review: every fallback string read aloud, no exclamation marks, no urgency
- [ ] PostHog events scrub all AI-generated and user-facing text
- [ ] Sentry breadcrumbs scrub forecast payload
- [ ] Account deletion (file 14) preserves no extension state
- [ ] Persona check: each persona walked through forecast card
- [ ] Persona check: each persona walked through save sheet flow (accept and decline)
- [ ] Maestro flow: trial → day 7 forecast → continue with Vela → paid
- [ ] Maestro flow: trial → cancel → save sheet → extend → day 21 paywall → paid
- [ ] Maestro flow: trial → system cancel → app reopen → save sheet → continue cancelling
- [ ] Region check: extension flow gracefully degrades in regions without RC promotional entitlements
- [ ] Sandbox + production RC integrations both verified
