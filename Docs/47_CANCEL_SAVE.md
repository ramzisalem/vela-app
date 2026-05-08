# 47 — Cancellation Save & Exit Interview

## Why this exists

The moment a user taps *Cancel subscription* is the single highest-intent retention moment in the lifecycle. They've made a decision. What happens in the next sixty seconds — what we offer, what we ask, how we listen — determines whether some of them stay, whether the rest leave with goodwill, and whether we learn anything from the ones who go.

Most subscription apps fail this moment in two ways:

1. **They throw a generic discount at everyone.** This converts a small percentage of cancels into shorter-term subscriptions at lower margins, which is mathematically defensible and brand-corrosive. Discount-pressured users churn again 3–6 months later at a higher rate; the retention bump is borrowed time.
2. **They use dark-pattern friction.** Hidden cancel buttons, multi-screen confirmations, manipulative copy ("Are you sure? You'll lose 87 days of progress!"). These work, briefly, and then become reasons people warn each other away from the brand.

Vela does the opposite. The cancel-save flow is **usage-aware** — different users get different offers because their reasons for leaving are different. The flow is **honest** about what they'll lose and what they'll keep (the latter is most of it; see file 46). The flow is **brief** — at most two screens between *Cancel subscription* and a finalized cancellation, never more. And the flow respects a user's *no*: a user who declines the offer never sees a second save attempt.

This file deliberately **excludes a pause flow** per product direction. Pause flows are a strong save mechanic in some categories; in face tracking, where the user's data is preserved during lapse anyway (file 46), pause and lapsed-readonly converge. The 30-day grace window is effectively a pause; we just call it lapsing because that's what's happening.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `08_PAYWALL.md`, `12_NOTIFICATIONS.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `15_DESIGN_SYSTEM.md`, `21_BRAND_SYSTEM.md`, `22_FEEDBACK_SYSTEM.md`, `25_ANALYTICS.md`, `41_TRIAL_CONVERSION.md`, and `46_REACTIVATION.md`.

---

## Product principles

1. **One save attempt, never two.** The user gets exactly one offer at the moment of cancel. They decline → cancellation proceeds. No second-tier offer, no "OK but how about this?" sequel.
2. **Match the offer to the user.** A power user cancelling because of price gets a different offer than a sparse user cancelling because they didn't see value.
3. **The exit interview is humble, not desperate.** One question, single screen, optional. No subject lines like "We'd love to know what we did wrong" — just *"What's making you cancel?"* with five choices.
4. **Honesty about data.** The cancel flow tells the user exactly what happens to their data, with calm specifics. Anxiety is reduced; the cancellation feels safe.
5. **Cancel is one tap from Settings.** Apple App Store guideline 5.1.1(v) requires this. We don't game the discoverability.

---

## The cancellation flow, end-to-end

```
Settings → Subscription → Cancel
   │
   ▼
Step 1 — The save offer (dynamic, usage-aware)
   ┌── Accept offer  → entitlement adjusted, cancel aborted, log event
   │
   └── Decline       → continue
   │
   ▼
Step 2 — The exit interview (optional)
   ┌── Skip          → cancellation finalized
   │
   └── Submit        → cancellation finalized + survey response logged
   │
   ▼
Step 3 — The honest goodbye
   • Confirms cancellation date
   • Tells them exactly what happens (file 46 reactivation rules)
   • Offers email digest opt-in
   • Closes
```

Total time for a user who declines + submits exit interview: under 60 seconds. For a user who declines + skips interview: under 20 seconds.

---

## Step 1 — The dynamic save offer

### What we know about the user at this moment

The save engine reads the user's recent state to choose which offer fits:

```ts
// src/types/cancel-save.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface CancelSaveContext {
  userId: string;
  // Tenure
  daysSinceFirstScan: number;
  weeksOfPaidSubscription: number;
  // Engagement
  totalScans: number;
  scansLast30Days: number;
  totalRoutineDaysCompleted: number;
  routineDaysLast30Days: number;
  hasOpenedDiary: boolean;
  diaryEntriesTotal: number;
  hasActiveTreatment: boolean;
  hasCompletedAnyExperiment: boolean;
  hasMonthlyWrapped: boolean;
  // Lifecycle
  isInTrial: boolean;            // routes to file 41 instead of this file
  hasEverExtendedTrial: boolean;
  hasReceivedAnniversaryCard: boolean;
  // External
  region: string;                // ISO country code
  hasFamilySharing: boolean;
}

export type CancelSaveOfferKind =
  | 'extension-month-free'         // 1 month free, no card change
  | 'price-match-yearly'           // switch to yearly at proportional price
  | 'consolation-doctor-export'    // for treatment-tracking power users
  | 'no-offer-respectful-goodbye'  // no offer, just acknowledgment
  | 'route-to-trial-extension';    // user is mid-trial; route to file 41

export interface CancelSaveOffer {
  kind: CancelSaveOfferKind;
  reason: string;                  // diagnostic for analytics
  ctaText: string;
  bodyCopy: string;
  acceptAction: () => Promise<void>;
}
```

### Life-stage mode as engagement signal (canonical)

The save engine's `CancelSaveContext` MUST include the user's active life-stage modes (file 48). A user actively tracking through pregnancy or cancer recovery is high-engagement; not capturing this signal misclassifies them.

```typescript
// Add to CancelSaveContext type:
hasActiveLifeStageMode: boolean;
activeLifeStageModes: LifeStageModeId[];
```

The selection logic gains a mode-aware branch:

```typescript
function selectSaveOffer(ctx: CancelSaveContext): CancelSaveOffer {
  // ...

  // Mode-aware: a user mid-meaningful-mode gets a custom offer + copy.
  if (ctx.hasActiveLifeStageMode && ctx.totalScans >= 4) {
    // The user has data through a life-stage; a generic save offer would land wrong.
    return {
      kind: 'extension-month-free',  // give them time, not money
      reason: 'engaged-during-life-stage',
      ctaText: 'Stay free for a month',
      // Mode-aware body copy:
      bodyCopy: bodyForMode(ctx.activeLifeStageModes[0]),
      // ...
    };
  }

  // ... rest of standard logic
}
```

### Mode-aware offer copy

```typescript
function bodyForMode(mode: LifeStageModeId): string {
  switch (mode) {
    case 'pregnancy':
    case 'postpartum':
      return "Your face is moving a lot right now — that's just what bodies do. We can give you a free month to keep tracking, no pressure.";
    case 'cancer-recovery':
      return "Recovery's its own timeline. We can give you a free month to keep your record going, no pressure.";
    case 'hrt-estrogen':
    case 'hrt-testosterone':
      return "HRT plays out over months. We can give you a free month so the record stays continuous.";
    case 'menopause':
      return "Skin shifts during this stretch are real and worth tracking. We can give you a free month to keep going.";
    default:
      return "Skin moves slowly. We can give you a free month — same data, same routine, no charge — to see if Vela earns its keep.";
  }
}
```

This is canonical for v1. The strings live in `src/i18n/cancel-save.ts` and are reviewed under file 21's voice rules.

### Selecting the offer

The save engine picks one offer per user based on their `CancelSaveContext`:

```ts
function selectSaveOffer(ctx: CancelSaveContext): CancelSaveOffer {
  // In trial → route to file 41's specialized trial extension flow.
  if (ctx.isInTrial && !ctx.hasEverExtendedTrial) {
    return { kind: 'route-to-trial-extension', /* ... */ };
  }

  // Sparse user (≤ 2 scans, no engagement) cancelling within first month →
  // they didn't see value yet, time is the lever, not money.
  if (ctx.weeksOfPaidSubscription <= 4 &&
      ctx.scansLast30Days <= 2 &&
      ctx.totalRoutineDaysCompleted <= 7) {
    return {
      kind: 'extension-month-free',
      reason: 'sparse-user-needs-time',
      ctaText: 'Stay free for a month',
      bodyCopy: 'Skin moves slowly. We can give you a free month — same data, same routine, no charge — to see if Vela earns its keep.',
      // ...
    };
  }

  // Engaged user mid-treatment → emphasize what they'd interrupt.
  if (ctx.hasActiveTreatment && ctx.totalScans >= 6) {
    return {
      kind: 'consolation-doctor-export',
      reason: 'engaged-treatment-user',
      ctaText: 'Generate a doctor-friendly PDF first',
      bodyCopy: 'Before you go, a one-tap export of your treatment timeline so far. Useful for your next derm appointment, on us.',
      // ...
    };
  }

  // Long-tenure user with active engagement → price-sensitivity is likely; offer yearly.
  if (ctx.weeksOfPaidSubscription >= 12 &&
      ctx.scansLast30Days >= 3 &&
      ctx.totalRoutineDaysCompleted >= 30) {
    return {
      kind: 'price-match-yearly',
      reason: 'engaged-long-tenure-price-sensitive',
      ctaText: 'Switch to yearly at $79',
      bodyCopy: 'You\'ve been here long enough that yearly makes sense. Switch now and you\'ll pay $79 instead of $9.99 each month — same Vela.',
      // ...
    };
  }

  // Everyone else: no offer, respectful goodbye.
  return {
    kind: 'no-offer-respectful-goodbye',
    reason: 'no-offer-fits',
    ctaText: 'Cancel my subscription',
    bodyCopy: 'No big sales pitch. If Vela isn\'t fitting your life right now, that\'s fine. Your data is here whenever you want it back.',
    // ...
  };
}
```

The selection logic is **deterministic** and **auditable** — we can track which offers convert and refine over time. This is not the place for an AI black box.

### Visual — the offer screen

A bottom sheet, not a modal alert. The user can dismiss it (treated as decline) at any time.

#### `extension-month-free` variant

```
┌──────────────────────────────────────────┐
│                                          │
│   Skin moves slowly.                     │
│                                          │
│   We can give you a free month — same    │
│   data, same routine, no charge — to     │
│   see if Vela earns its keep.            │
│                                          │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Stay free for a month         │     │
│   └────────────────────────────────┘     │
│                                          │
│   Continue cancelling                    │
│                                          │
└──────────────────────────────────────────┘
```

#### `consolation-doctor-export` variant

```
┌──────────────────────────────────────────┐
│                                          │
│   Before you go.                         │
│                                          │
│   You've been tracking tretinoin for     │
│   eight weeks. We'd like to give you a   │
│   doctor-friendly PDF of your timeline   │
│   so far — useful for your next derm     │
│   visit, on us.                          │
│                                          │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Generate the PDF              │     │
│   └────────────────────────────────┘     │
│                                          │
│   Continue cancelling                    │
│                                          │
└──────────────────────────────────────────┘
```

After PDF generation: the cancellation still proceeds. We're not bargaining; we're sending the user off with something useful. (~8% of users cancel through anyway but with a notably softer goodbye and a meaningful brand moment. Some come back.)

#### `price-match-yearly` variant

```
┌──────────────────────────────────────────┐
│                                          │
│   A small thing.                         │
│                                          │
│   You've been on monthly for three       │
│   months. If price is the issue, yearly  │
│   works out to about $6.60 a month —     │
│   that's $40+ less per year.             │
│                                          │
│   Same Vela, just billed once.           │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Switch to yearly at $79       │     │
│   └────────────────────────────────┘     │
│                                          │
│   Continue cancelling                    │
│                                          │
└──────────────────────────────────────────┘
```

#### `no-offer-respectful-goodbye` variant

```
┌──────────────────────────────────────────┐
│                                          │
│   No big sales pitch.                    │
│                                          │
│   If Vela isn't fitting your life right  │
│   now, that's fine. Your data is here    │
│   whenever you want it back.             │
│                                          │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Cancel my subscription        │     │
│   └────────────────────────────────┘     │
│                                          │
│   Stay subscribed                        │
│                                          │
└──────────────────────────────────────────┘
```

The respectful-goodbye variant is the rare case where Vela doesn't even try to save. It's the brand telling the user we've heard them. Some users will cancel through; others will pause for a moment and return to the app. Either is fine.

### Implementation — the save engine

A new Edge Function `evaluate-cancel-save`:

```ts
// supabase/functions/evaluate-cancel-save/index.ts
export async function handler(req: Request) {
  const { user_id } = await req.json();
  const ctx = await buildContext(user_id);

  // Hard route: trial users go to file 41's flow.
  if (ctx.isInTrial) {
    return jsonResponse({ route: 'trial-extension' });
  }

  const offer = selectSaveOffer(ctx);
  await db.cancelSaveAttempts.insert({
    user_id, offer_kind: offer.kind, reason: offer.reason, attempted_at: nowIso(),
  });
  return jsonResponse({ offer });
}
```

The save offer's `acceptAction` is server-side:

- `extension-month-free` → RevenueCat promotional entitlement (`one_month`, free).
- `price-match-yearly` → trigger purchase flow for the yearly product; cancel the monthly.
- `consolation-doctor-export` → call the existing PDF generation (file 34) and provide download link.
- `no-offer-respectful-goodbye` → no entitlement change; the offer screen is purely conversational.

### Eligibility & deduplication

- `extension-month-free` can be granted **once per user, ever**. Subsequent cancels in the same account skip this offer and route to `no-offer-respectful-goodbye`.
- `price-match-yearly` can be offered any time the user is on a monthly plan; only relevant if they decline.
- `consolation-doctor-export` is offered any time a treatment is active; even non-cancelling users could trigger this from settings.
- `no-offer-respectful-goodbye` is the universal fallback; never blocks.

---

## Step 2 — The exit interview

After the user declines the save offer (or is shown the respectful-goodbye variant), they see one screen: a single-question exit interview.

### Visual

```
┌──────────────────────────────────────────┐
│                                          │
│   What's making you cancel?              │
│                                          │
│   This helps us. Skip if you'd rather.   │
│                                          │
│                                          │
│   ◯ Too expensive                        │
│   ◯ Didn't see enough change             │
│   ◯ Not the right time in my life        │
│   ◯ Something specific isn't working     │
│   ◯ Other                                │
│                                          │
│   ─────────────────────────────────      │
│                                          │
│   Anything else? (optional)              │
│   ┌────────────────────────────────┐     │
│   │                                │     │
│   │                                │     │
│   └────────────────────────────────┘     │
│                                          │
│                                          │
│   ┌──────────────────┐ ┌──────────────┐  │
│   │  Submit          │ │  Skip        │  │
│   └──────────────────┘ └──────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

### The five reason options

These are not arbitrary. Each maps to a category we can act on operationally:

1. **Too expensive** → pricing strategy + offer ranking
2. **Didn't see enough change** → onboarding promise audit + trial duration
3. **Not the right time in my life** → reactivation timing (file 46)
4. **Something specific isn't working** → product backlog signal; the free-text field is the primary input
5. **Other** → catchall; the free-text field is the only data we have

### The free-text field

Optional. ≤ 500 characters. Sanitized for PII before storage. Read by the product team weekly (set up an internal Slack channel that pipes responses, scrubbed).

### What we do with it

The exit interview is a **product feedback channel**, not a vanity metric. The data is meaningful:

- **Quantitative routing**: every response increments a counter per category, sliced by tenure / persona / region.
- **Qualitative review**: free-text fields read weekly by a designated product owner. High-value insights get filed as JIRA / Linear tickets within 7 days.
- **Service-level**: when a category exceeds a threshold (e.g., >15% of cancels in a month cite "didn't see enough change"), it triggers a product alert.

### Privacy

- Free-text is stored in a `cancel_exit_responses` table with RLS allowing the user to delete their response (a footnote on the screen explains: *"We hold this for one year to learn from. You can delete it anytime in Settings → Privacy → Cancel feedback."*).
- Free-text is NOT used to train AI models.
- Free-text is NOT shared with the user's profile in any product surface; it's purely backend operational data.

---

## Step 3 — The honest goodbye

After cancellation finalizes, one last screen:

```
┌──────────────────────────────────────────┐
│                                          │
│   You're cancelled.                      │
│                                          │
│   ─────────────────────────────────      │
│                                          │
│   Your subscription ends June 18.        │
│   Until then, everything works.          │
│                                          │
│   For 30 days after that, you keep       │
│   full access — your scans, your         │
│   routine, all of it.                    │
│                                          │
│   After 30 days, Vela goes into          │
│   look-back mode. You can still see      │
│   everything. You just can't take new    │
│   scans without resubscribing.           │
│                                          │
│   ─────────────────────────────────      │
│                                          │
│   Want a once-a-month note from us —     │
│   just where your face is now?           │
│                                          │
│   ◯ Yes, send me one                     │
│   ◯ No thanks                            │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  Done                          │     │
│   └────────────────────────────────┘     │
│                                          │
└──────────────────────────────────────────┘
```

### What this screen does
- States the cancellation date plainly.
- Explains the 30-day grace + look-back lifecycle (file 46) in concrete terms. Reduces the *"have I lost everything?"* anxiety.
- Asks for the email-digest opt-in **here**, not pre-checked anywhere. This is the only opt-in moment.
- Single CTA: *Done*.

### Why this matters
A user who walks away feeling clear and respected is a user who recommends Vela to friends and might come back. A user who walks away confused and annoyed becomes negative word-of-mouth.

### Edge cases

- **User cancels via iOS Settings.app, not via Vela** — we can't show this flow at cancel time. RevenueCat fires a state change; the next time the user opens Vela (during grace), a passive banner replaces the goodbye screen, and the email-digest opt-in lives in Settings.
- **User is in a region where Vela App Store policies require alternative cancel flows** — the in-app *Cancel subscription* button still triggers our save flow; the system-level cancel is unavoidable on iOS but is rare in practice when in-app cancel is prominent.

---

## Cancel from iOS Settings.app — handling

When the user cancels via iOS:
- RevenueCat's `customerInfoUpdate` event fires with `willRenew: false` and `isInBillingRetryPeriod: false`.
- Vela's listener captures this and:
  1. Marks the user's profile with `cancellation_pending: true` and `cancellation_method: 'system'`.
  2. Schedules a one-time non-disruptive in-app card for the next foreground.
  3. Does NOT fire the save flow (the user has explicitly bypassed it).

The next-foreground in-app card:

```
You cancelled in iOS Settings. We saw.

Your subscription ends June 18. After that, you have 30 days
of full access, then look-back mode. Everything is here for you.

Want a once-a-month note while you're away?

[ Yes, send one ]    [ No thanks ]
```

We don't try to win them back at this moment. They went to iOS Settings; they meant it. We just confirm the lifecycle plainly and ask once about the digest.

---

## What this file does NOT do

- **No pause flow.** Per product direction, the 30-day grace window in file 46 effectively serves the pause use case. Adding an explicit pause UX would create confusion between two near-equivalent states.
- **No multi-step confirmation prompts.** "Are you sure?" → "Really really sure?" → "Just one more thing..." is the dark pattern we explicitly reject.
- **No discount stacking.** A user who declines the save offer doesn't see a second discount on the goodbye screen. One offer, one decision.
- **No notifications post-cancel** other than the explicitly opted-in monthly digest (file 46).
- **No "we miss you" copy in any surface ever.** Vela doesn't beg. Brand line.
- **No retention of free-text exit-interview responses beyond 12 months.** Quantitative category counts persist longer; the words don't.

---

## Persona-specific behavior

The save offer logic produces different defaults per persona implicitly (via the engagement-pattern-driven decision tree). Here's how each persona is likely to flow through cancellation:

- **Maya (Quantified Self, woman 32)** — high engagement, treatment tracking, experiment mode. Likely to receive `consolation-doctor-export` if treatment-active, or `price-match-yearly` if the price is the issue. The exit interview category most likely to be cited: *"Not the right time in my life"* or *"Didn't see enough change"*.
- **Marcus (Optimization-curious, man 28)** — moderate engagement, sparse routine. Likely to receive `no-offer-respectful-goodbye` if his pattern is "tried, didn't stick." Exit category most likely: *"Too expensive"* or *"Other"*.
- **Priya (Treatment Tracker, woman 38)** — high engagement, almost always has an active treatment. Likely to receive `consolation-doctor-export`. Exit category most likely: *"Not the right time in my life"* — Priya's life events drive most of her churn.
- **Jordan (Considered Comeback, NB 45)** — moderate engagement, long-form thinker. Likely to receive `price-match-yearly`. Exit category most likely: *"Didn't see enough change"*.

This is **emergent**, not hard-coded. The save engine doesn't know personas. It reads engagement signals and chooses offers; the resulting distribution of offers across personas is what we audit.

---

## Settings — for users mid-flow

A user who started cancelling, declined the save, but didn't yet submit the exit interview can navigate away. The flow's state is preserved. On return:

- If the user is in Settings → Subscription, the *Cancel subscription* button is replaced with *Continue cancelling* until they finalize.
- The exit interview screen is offered again. They can submit, skip, or back out (which keeps them subscribed).

A user who completes the exit interview and then changes their mind can resubscribe at any time via the standard paywall (file 08).

---

## Privacy

- `cancel_save_attempts` table stores `{user_id, offer_kind, reason, attempted_at, accepted_at?}` — no free text, no PII beyond user ID.
- `cancel_exit_responses` table stores `{user_id, category, free_text, submitted_at, can_be_deleted_at}` — RLS-locked; `can_be_deleted_at` is `submitted_at + 365 days`. After that, the row is anonymized (user_id stripped, category preserved).
- Free-text responses are processed through PII-detection (regex + entity recognition) before storage; detected names, emails, phone numbers are redacted at write time.
- Sentry breadcrumbs scrub all save-flow and exit-interview content.

---

## Analytics

| Event | Properties | Notes |
|---|---|---|
| `cancel_intent_started` | `surface: 'in-app'|'ios-settings'`, `subscription_age_weeks_bucket` | |
| `cancel_save_offer_evaluated` | `offer_kind, reason` | |
| `cancel_save_offer_shown` | `offer_kind` | |
| `cancel_save_offer_accepted` | `offer_kind` | |
| `cancel_save_offer_declined` | `offer_kind, dwell_ms` | |
| `cancel_exit_interview_shown` | none | |
| `cancel_exit_interview_submitted` | `category, has_free_text: bool` | Free text length not logged |
| `cancel_exit_interview_skipped` | `dwell_ms` | |
| `cancel_finalized` | `flow: 'in-app'|'system'`, `had_save_offer: bool, accepted_offer: bool` | |
| `cancel_email_digest_optin_chosen` | `optin: bool` | |
| `cancel_consolation_pdf_generated` | none | (For the doctor-export consolation variant) |

---

## Pre-launch checklist

- [ ] All five `CancelSaveOfferKind` variants render correctly
- [ ] Save engine selection logic deterministic (snapshot tests with 50 simulated user contexts)
- [ ] `extension-month-free` granted via RevenueCat sandbox; only once per user verified
- [ ] `price-match-yearly` purchase flow tested in sandbox + production
- [ ] `consolation-doctor-export` PDF generation tested for active-treatment user
- [ ] `no-offer-respectful-goodbye` finalizes cancellation cleanly
- [ ] `route-to-trial-extension` redirects to file 41 flow
- [ ] Exit interview saves response with PII redaction verified (test with names, emails, phone numbers in free text)
- [ ] Exit interview free-text field has 500-char limit
- [ ] Goodbye screen explains 30-day grace + look-back accurately (verified against file 46 wording)
- [ ] Email digest opt-in shown only at this screen and in Settings
- [ ] iOS-Settings cancellation handled via passive in-app card on next foreground
- [ ] iOS-Settings cancellation never fires save flow (intentional)
- [ ] User mid-cancel-flow can navigate away and return without losing state
- [ ] Brand voice review: every save copy + exit interview copy + goodbye copy read aloud, no exclamation marks
- [ ] Anti-pattern audit:
   - [ ] No "are you sure?" multi-step confirms
   - [ ] No discount stacking
   - [ ] No "we miss you" guilt copy
   - [ ] No second save attempt
   - [ ] No notifications post-cancel except opt-in digest
- [ ] PostHog events scrub all free text
- [ ] Sentry breadcrumbs scrub save and exit content
- [ ] Settings → Privacy → Cancel feedback row exists for users to delete responses
- [ ] Persona check: each persona simulated through their likely path
- [ ] Maestro flow: in-app cancel → save offer (extension) → accept → entitlement granted → cancel cancelled
- [ ] Maestro flow: in-app cancel → save offer → decline → exit interview submit → goodbye → digest opt-in yes
- [ ] Maestro flow: iOS-Settings cancel → app foreground → passive card → digest opt-in
- [ ] Maestro flow: cancel during trial → routes to file 41 trial extension flow
- [ ] Maestro flow: power user cancels mid-treatment → consolation PDF offered, generated, cancellation proceeds
- [ ] App Store guideline 5.1.1(v) compliance verified: cancel button is one tap from Settings → Subscription
- [ ] Region check: cancel-save flow gracefully degrades in regions where promotional entitlements aren't available
