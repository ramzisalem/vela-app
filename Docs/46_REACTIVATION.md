# 46 — Reactivation Engine

## Why this exists

A user who churned isn't gone. They're a user who has Vela's data, knows what Vela does, and has decided — for now — that it isn't worth paying for. A subset of them will come back, *if* we hold the door open. Most subscription apps slam it shut: the second the user cancels, their data goes dark, the app becomes unusable, and any return requires re-onboarding from scratch. Vela does the opposite.

The reactivation engine has four parts:

1. **30-day data preservation** — even after cancellation, full data access for 30 days. Reduces "I'll lose everything" anxiety, increases the upside of returning.
2. **The "look back" mode** — after 30 days, the data shifts into a free, read-only viewer. Users can see their old scans, charts, diary entries, and Wrapped retrospectives forever. Forward-looking features are paywalled, but the past stays open.
3. **The lapsed-user email digest** — once a month, opt-in: *"Here's where your face was when you stopped."* One image, one paragraph, one soft door-back-in.
4. **The win-back free scan** — at 90 days lapsed, users get a free single-scan + AI insight gift. *"Run a single scan on us. See what's changed."* No subscription required for the moment of curiosity.

This is a generous strategy. It pays for itself in returning users, word-of-mouth, and brand goodwill. The opposite — locking everything immediately — produces short-term retention metrics that look better and a long-term brand that looks worse.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `08_PAYWALL.md`, `10_DASHBOARD.md`, `11_COMPARISON.md`, `12_NOTIFICATIONS.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `15_DESIGN_SYSTEM.md`, `19_USER_JOURNEYS.md`, `21_BRAND_SYSTEM.md`, `25_ANALYTICS.md`, `30_DEEP_LINKING.md`, `38_MONTHLY_WRAPPED.md`, and `47_CANCEL_SAVE.md`.

---

## Product principles

1. **Data persistence is the brand promise.** The user's scans, diary, and history are theirs forever — even if they're not paying. Vela never holds them hostage.
2. **Re-engagement is gentle.** No daily nags, no guilt copy, no "we miss you" notifications.
3. **Returns are friction-free.** A user who comes back after 6 months should resume where they left off in one tap — no re-onboarding, no re-paywall storm.
4. **Email is opt-in.** Users who don't want the digest don't get it. The choice is made at cancellation, not pre-set on signup.
5. **One free moment of curiosity is the best win-back.** Discount offers are transactional and feel cheap. A free scan respects the user's intelligence.

---

## The lapsed-user lifecycle

```
PAID → CANCEL ───────────────────────────────────────────────────────────────
  │
  │ Day 0 (cancel)
  │   • Subscription set to expire at next billing date
  │   • Standard cancel-save flow ran (file 47)
  │   • Cancellation reason logged
  │
  │ Day 1–30 after cancellation (or after billing-end, if user pre-cancelled)
  │   • Full app access continues
  │   • A passive banner: "Your subscription ended. You have full access for 30 days."
  │   • New scans + new routine completions still work
  │   • New paid features (treatment tracking, experiment mode) lock at billing-end
  │
  │ Day 30
  │   • Transition to "look back" mode (read-only)
  │   • Notification: "Your data is now in read-only mode. Pick up anytime."
  │
  │ Day 30+ — "Look back" mode
  │   • App opens to their old dashboard, history, scans
  │   • All forward-looking features paywalled
  │   • Settings shows "Resume Vela" button
  │
  │ Day 30, 60, 90, 120 — Lapsed-user email digest (opt-in)
  │   • Monthly until user resumes or opts out
  │
  │ Day 90 — Win-back free scan offer
  │   • One-time gift: a single fresh scan + AI insight, no subscription needed
  │   • Available for 14 days from the offer date
  │
  │ Day 365+ — Annual retrospective email (opt-in)
  │   • Once-a-year gentle "where you were" digest
  │
  │ Day 730 — Final "your data is here" reminder
  │   • One last touch; user can resume or unsubscribe forever
  │
RESUME ──────────────────────────────────────────────────────────────────────
```

---

## Phase 1 — The 30-day full-access window

### What changes at cancellation
At the moment a user's paid subscription ends (either after their final billing period or immediately if they were on trial):

- The `subscription_status` flips from `active` to `lapsed-grace`.
- A passive banner appears at the top of the dashboard: *"Your subscription ended. You have full access for 30 days, then your data goes into read-only mode."*
- Standard subscription state is dimmed in Settings; *"Resume Vela"* CTA appears.

### What works during the grace window
- All scans, comparisons, dashboards, charts, Wrapped, diary, treatments — fully usable.
- New scans count and update the user's data.
- New diary entries persist.
- Daily streak continues (file 39 doesn't gate on subscription state during grace).
- HealthKit correlations continue.
- Aging band overlays render.

### What doesn't work
- Trial-ended users can't access content gated to "active subscription" features that they hadn't yet received (e.g., experiment mode if the gate was at week 14 and they cancelled at week 8).
- Treatment tracking (file 34) for new treatments cannot be started; existing treatments can be viewed but not modified.

### Why the 30 days

A meaningful portion of users return within 30 days — they had a bad month, didn't see value, then changed their minds when the routine recommendations they were running showed up on their face. We catch them.

A user who cancels and immediately gets locked out at day 0 has a much higher activation energy to return. Reducing that activation energy is the cheapest retention move available.

### Resume flow during grace

A user who taps *Resume Vela* during the grace window:
- Goes through standard RevenueCat subscription purchase.
- Skips re-onboarding entirely (no questions, no first scan).
- Returns to their existing dashboard with all data intact.
- No loss of streak, no loss of routine, no loss of progress.

Resume completion fires a one-time card on the dashboard:

> *"Welcome back. Your routine, your scans, your streak — everything's where you left it."*

---

## Phase 2 — The "look back" mode

After 30 days lapsed, the app transitions to a read-only "look back" mode.

### What look-back mode is

The user can still open Vela. Everything they accumulated is still there. They can:

- View their entire dashboard with all scans and trends.
- Open any old comparison.
- Read their Wrapped retrospectives (every monthly Wrapped they've ever received).
- View their diary entries (decrypted on their device).
- See their old routine.
- View their treatment timelines.
- Browse their experiment results and verdicts.
- Use the "On this day" feature.

### What look-back mode is not

The user **cannot**:

- Take a new scan (the capture screen is replaced with a paywall).
- Add a new diary entry (the entry sheet is replaced with a soft "Resume to continue your story" card).
- Mark routine tasks complete (the routine card is replaced with the user's last completed routine, frozen).
- Generate new Wrapped (their last existing Wrapped is the most recent).
- Run new experiments.
- Receive new HealthKit correlations.
- Get notifications other than the monthly digest.

### Visual treatment

The dashboard in look-back mode has subtle visual cues that this is not a live state:

- A persistent banner at the top: *"Look-back mode. Your data is here whenever you want to come back."*
- A small *"Resume Vela"* link in the header.
- Charts gain a subtle dot-pattern background fill (not aggressive — a soft 4% opacity stipple) to indicate "frozen" state.
- The streak chip shows the user's longest-ever streak number with a tag *"Saved at end of last subscription."*

The app remains beautiful in look-back mode. It does not feel punitive.

### Settings in look-back mode

```
┌────────────────────────────────────────┐
│   Settings                             │
│                                        │
│   ─────────────────────────────────    │
│   Vela                                 │
│   Look-back mode                       │
│   ┌──────────────────────────────────┐ │
│   │     Resume Vela                  │ │
│   └──────────────────────────────────┘ │
│                                        │
│   ─────────────────────────────────    │
│   Your data                            │
│                                        │
│   Export my data                    >  │
│   Delete my data                    >  │
│   Lapsed user email digest          >  │
│                                        │
│   ─────────────────────────────────    │
│   About                                │
│                                        │
│   Privacy and data                  >  │
│   Help                              >  │
│                                        │
└────────────────────────────────────────┘
```

The bulk of Settings is hidden — only what matters for a lapsed user. *"Resume Vela"* is the most prominent affordance.

### Resume flow from look-back

Same as Phase 1 resume — no re-onboarding, full data restored, RevenueCat handles entitlement. Welcome-back card on dashboard.

---

## Phase 3 — The monthly digest email

The single most cost-effective retention channel any subscription app has.

### Opt-in

At cancellation (in file 47's exit interview flow), the user is asked:

> *"Want a once-a-month note from us — just where your face is now? You can unsubscribe anytime."*
>
> *[ Yes, send them ]   [ No thanks ]*

Default: no. We don't pre-check the box. If the user accepts, an `email_digest_optin: true` flag is set on the `profiles` row. If declined, the flag is `false` and we never send the digest emails (transactional emails like account confirmations are unaffected).

### Cadence

- Digest emails fire on the **same date** of each month as the user's cancellation date.
- First email: 30 days after cancellation.
- Subsequent: monthly until they resume, opt out, or hit 24 months lapsed.
- After 24 months: a final email and stop.

### Email content

Each email is a single, beautifully designed message:

```
Subject: Your March from Vela
Preview: Just where your face is now, and where it was a year ago.

────────────────────────────────────────

[Vela wordmark, small]

Hey [Name],

It's been [N] months since you stepped back from Vela. We hope you're well.

Here's where your face was when you paused:

[A simple chart: their last 8 weeks of overall score before cancelling]

And here's where your face was a year ago this month:

[Same chart, year-over-year if data exists]

If you'd like to come back, your routine, your scans, and everything else
is right where you left it. Just open Vela.

[ Open Vela ]

────────────────────────────────────────

You can stop these emails anytime by tapping here.

```

The email is **plain**. No flashy graphics, no emojis (except in fallback subject lines for clients that don't support unicode), no urgency.

### Email service

A new Supabase Edge Function `send-lapsed-digest` runs as a daily cron, processing users whose cancellation anniversary is today. The function:

1. Queries users with `subscription_status IN ('lapsed-grace', 'lapsed-readonly')` and `email_digest_optin = true` and last_digest_sent_at < today's anniversary.
2. For each user, fetches their dashboard data snapshot for the last 8 weeks pre-cancel.
3. Renders the email via a templating service (Postmark / Resend / similar — pick one, see "Implementation" below).
4. Sends the email and stamps `last_digest_sent_at`.

### Personalization

The email's *content* is data-driven — the chart is the user's actual data — but the *copy* is templated. We do not generate per-user AI copy for emails because (a) it adds cost, (b) emails are seen out of context, and (c) the brand-voice safety net is harder to maintain at scale across a transactional channel.

Approved templated lines:
- *"Just where your face is now."*
- *"Your routine is still here."*
- *"Everything's where you left it."*
- *"If you'd like to come back, just open Vela."*

Forbidden lines (linted at template-CI time):
- *"We miss you."*
- *"Come back!"*
- *"You're missing out."*
- *"Limited time offer..."*
- *"Don't lose your data!"*

### Life-stage mode awareness in digest emails

If the user was in a life-stage mode during the period the digest covers, the templated copy adjusts:

| Mode at lapse | Subject line | Body adjustment |
|---|---|---|
| `pregnancy` / `postpartum` | "Your <Month> from Vela" (unchanged) | "Your face moved a lot during pregnancy/postpartum. The recap is a record of that — no expectations attached." |
| `cancer-recovery` | "Where things were when you stepped back" (subject changes — "from Vela" feels promotional in this state) | The chart shows the period; no AI commentary on the data. Plain summary only. |
| `menopause` / `hrt-*` | "Your <Month> from Vela" (unchanged) | Standard body |

Mode-aware copy lives in the same Postmark template; the variant is selected server-side from the user's mode state at the time the digest is generated.

### Look-back mode preserves life-stage state

A user in look-back mode keeps their life-stage mode visible. Charts render with the mode's overlay (or lack thereof) per file 48. This means a returning user sees their data the way they last saw it — not in a "neutral" state that doesn't match their memory. If they re-subscribe, modes pick up where they left off.

### Win-back free scan inheritance

When a user redeems the day-90 win-back free scan, the scan inherits:
- The user's last active scoring framework
- The user's last active life-stage modes (if any)
- The user's last routine state (frozen during look-back) for AI prompt context only — not for routine task display

The free scan gets its own dashboard render with full mode-aware behavior. After the scan, the lapsed-readonly state resumes normally.

### Privacy in emails

- Emails contain only: user's first name, the chart, the soft message. No diary content, no treatment names, no specific health correlations.
- The chart is rendered server-side as a static PNG using a deterministic chart library; no client tracking pixels.
- The unsubscribe link is one-click; it sets `email_digest_optin: false` and shows a confirmation page.

### Implementation

- Email delivery via Postmark (transactional email service with high deliverability).
- Templates stored as MJML files in the Supabase Edge Function repo.
- Charts rendered via a server-side D3 + headless Chrome pipeline OR a precomputed PNG generated via the existing chart component running in a Lambda/Edge Function with a JSDOM polyfill.
- Subject-line personalization based on the user's chosen anchor or month name.

### Edge cases

- **User opted in but the email bounced** — Postmark hard-bounce events trigger an automatic opt-out and a Sentry alert.
- **User changes email address** — the digest follows the email of record on the Supabase auth user.
- **User in EU / GDPR jurisdiction** — same opt-in mechanic; explicit consent at cancellation. Unsubscribe is one-click. Privacy policy explicitly mentions the digest.
- **User has no data from a year ago** — the year-over-year chart is omitted; the email shows just the recent 8 weeks.
- **User has been lapsed > 24 months** — final email sent, opt-in flag cleared, no further communication.
- **Email service provider outage** — retry queue with exponential backoff; if still failing after 24 hours, skip this month's digest for affected users.

---

## Phase 4 — The win-back free scan

At day 90 lapsed, users in `lapsed-readonly` who are still opted in to the digest receive a special offer: a single free scan, with AI insight, no subscription needed.

### How it works

The day-90 digest email is different. Subject: *"On us — a single scan to see what's changed."*

Body:
```
Hey [Name],

It's been three months. You've gone through a season — your skin probably has too.

If you'd like, we'd like to give you a single scan, on us. No subscription required.
You'll get one fresh dashboard, one AI observation about how your face is now, and
a free comparison with the last scan you took before you paused.

[ Scan once on us ]

The offer is good for 14 days. After that it expires, but everything else stays
the same — your data is still here whenever.

```

The CTA opens Vela with a special deep link (`vela://winback/scan`) that:
- Lifts the lapsed-readonly capture lock.
- Shows a one-time scan flow with a thank-you screen at the end.
- Renders the AI insight (using the standard scoring + score-explanation prompts).
- Shows the scan + the comparison alongside the last pre-cancel scan.
- After the scan, a soft *Resume Vela* card.

After the free scan:
- The lapsed-readonly state remains. The user can continue to view this scan in look-back mode but can't take another one without resubscribing.
- A small toast: *"That was on us. The next one's a subscription away — no rush."*

### Why this works

The single biggest barrier to a lapsed user resubscribing is the imagination gap: they've forgotten what their face looks like now, what's improved, what's drifted. The win-back scan closes that gap with no commitment. Conversion to paid within 30 days of the win-back scan is materially higher than any discount offer.

### Eligibility

- Lapsed for ≥ 90 days.
- Opted in to email digest.
- Has not previously redeemed a win-back free scan.
- Subscription state is `lapsed-readonly` (not `lapsed-grace` — the grace user already has full access).
- Has at least one pre-cancel scan to compare against.

### Edge cases

- **User redeems and immediately resubscribes within 24 hours** — they keep the scan they took during the offer, plus full access. The win-back scan counts as their newest data point.
- **User redeems but doesn't resubscribe** — the offer's done. We don't re-offer; one win-back scan per lapsed user, ever.
- **User in a region where Vela isn't sold** — offer not extended; instead, they get the standard digest email.
- **Win-back deep link is shared by the user with a friend** — the deep link is single-use per account, expires 14 days after issue, and is bound to the email of record. Sharing won't grant the friend access.
- **User opts out of digest emails before day 90** — they don't receive the win-back offer. To receive it, they need to be opted in.

---

## Phase 5 — Annual retrospective + final touch

### Day 365 — annual retrospective

Once a year on the cancellation anniversary, opted-in users receive a slightly more elaborate digest:

```
Subject: A year since you paused Vela.

Body:
A year ago today, you stepped back from Vela. Time moves.

Here's where your face was on this date last year, and the year before, if you have data:

[Multi-year chart]

Your routine, your scans, your Wrapped retrospectives — they're all still here.

[ Open Vela ]
```

### Day 730 — final touch

```
Subject: Two years on — your data is still here.

Body:
We don't want to keep emailing you, so this is the last one. Your Vela data
is still here whenever you want it. Just open Vela.

[ Open Vela ]

If you'd rather we delete your account and data permanently, you can do that
right here:

[ Delete my data ]

```

After day 730:
- The opt-in flag is cleared.
- No further emails are sent.
- The user's data remains in Vela's database (look-back mode is permanent until the user explicitly deletes their account).

---

## Resume flow at any phase

Resuming Vela is the same regardless of phase:

1. Tap *Resume Vela* (in app, email, or anywhere else).
2. App opens to the standard paywall (file 08).
3. Tap *Subscribe*.
4. RevenueCat handles purchase.
5. App immediately re-grants access; subscription state flips to `active`.
6. Dashboard renders with **all preserved data restored**.
7. A welcome-back card on the dashboard for 7 days:

> *"Welcome back. Your routine, your scans, your streak — everything's where you left it."*

The welcome-back card is the single most important UX moment in the resume flow. It must feel reassuring, not corporate. The user must immediately understand that nothing is lost.

### Special case: streak handling on resume

If the user's streak ended during the lapsed period (which it almost certainly did because routine completions can't happen in lapsed-readonly), the welcome-back card has an additional line:

> *"Your longest streak of 87 days is saved. New rhythm starts today."*

We never punish them for the gap. The longest streak is preserved as a permanent personal record; the current count starts fresh from today.

---

## Settings — for lapsed users

In `lapsed-grace` state:

```
Settings
─────────────────────────────────
Subscription
  Lapsed grace mode — 12 days remaining
  [ Resume Vela ]

Your data
  Export my data                 >
  Delete my data                 >
  Lapsed user email digest:
    Yes, send me a monthly note  ▢

About
  Privacy and data               >
  Help                           >
```

In `lapsed-readonly` state:

```
Settings
─────────────────────────────────
Vela
  Look-back mode
  [ Resume Vela ]

Your data
  Export my data                 >
  Delete my data                 >
  Lapsed user email digest:
    Yes, send me a monthly note  ▢

About
  Privacy and data               >
  Help                           >
```

The user can toggle the email digest preference at any time. Off → cancel future emails. On (after previously off) → resume next anniversary cycle.

---

## Hard-deletion vs lapsed-readonly

A user in `lapsed-readonly` can choose between three paths at any point:

1. **Resume Vela** — return to active.
2. **Stay in look-back mode** — do nothing; data persists indefinitely.
3. **Delete my data** — initiates the standard two-step account deletion flow (file 14). All scans, diary, treatments, experiments, Wrapped, and streak data are deleted.

Hard deletion is final. Vela does not preserve data after explicit deletion request, even for the lapsed-readonly use case.

The Settings → *Delete my data* row is honest about consequences:

> *"Deleting your data removes all your scans, diary entries, routines, and history from Vela's servers and your device. This can't be undone."*

---

## Privacy

- Lapsed users' data is encrypted at rest with the same encryption as paid users (no downgrading).
- Email digests contain no diary content, no treatment names, no health correlations — only the user's first name and a chart.
- Year-over-year emails reference data the user already has access to; no new analysis is performed beyond what the digest function generates.
- The win-back scan goes through the standard AI proxy with PII stripping per file 25.
- Lapsed user analytics events are a subset of standard events — no new PII channels are introduced.

---

## Analytics

| Event | Properties | Notes |
|---|---|---|
| `lapsed_grace_entered` | `had_subscription_days, lapsed_via: 'cancel'|'expiry'|'failed-payment'` | |
| `lapsed_readonly_transitioned` | `days_since_cancel: 30` | |
| `lapsed_resume_attempted` | `from_phase: 'grace'|'readonly'`, `from_surface: 'app'|'email'|'deep-link'` | |
| `lapsed_resume_completed` | `from_phase, days_since_cancel` | |
| `lapsed_email_digest_optin_changed` | `to: bool, source: 'cancel-flow'|'settings'` | |
| `lapsed_email_digest_sent` | `cycle_n, has_yoy_data: bool` | Server-side |
| `lapsed_email_digest_opened` | `cycle_n` | Via tracking pixel only if user has opted in to that |
| `lapsed_email_digest_clicked` | `cycle_n, link: 'open-vela'|'unsubscribe'` | |
| `lapsed_winback_offer_sent` | `cycle: 'd90'` | |
| `lapsed_winback_scan_redeemed` | `days_since_offer` | |
| `lapsed_winback_resumed_paid` | `days_since_winback_scan` | |
| `lapsed_annual_retrospective_sent` | `year_n` | |
| `lapsed_final_email_sent` | none | |
| `lapsed_data_hard_deleted` | `days_in_lapsed` | |

PII rule: never log first names, emails, or any free text in events. The email service has its own internal logs scrubbed per Postmark's GDPR config.

---

## Pre-launch checklist

- [ ] 30-day grace window correctly preserves all functionality
- [ ] Lapsed-readonly transition at day 30 verified via clock manipulation
- [ ] Look-back mode dashboard renders with subtle dot-pattern visual cue
- [ ] Look-back mode settings show only relevant rows
- [ ] Look-back mode capture screen replaced with paywall
- [ ] Look-back mode diary entry attempt shows soft "Resume to continue" card
- [ ] Look-back mode preserves all read-only data: scans, history, Wrapped, diary, treatments, experiments
- [ ] Resume flow skips re-onboarding, restores all data
- [ ] Welcome-back card on dashboard for 7 days post-resume
- [ ] Streak welcome-back copy includes "longest streak preserved" if applicable
- [ ] Email digest opt-in default OFF; checkbox in cancel flow not pre-checked
- [ ] Postmark integration tested with sandbox sender
- [ ] Email templates rendered correctly across iOS Mail, Gmail, Outlook
- [ ] Year-over-year chart renders correctly when data exists
- [ ] Email content audit: no exclamation marks, no urgency, no guilt copy
- [ ] One-click unsubscribe works without auth
- [ ] Hard-bounce handling: automatic opt-out + Sentry alert
- [ ] Win-back offer fires at day 90 with proper deep link
- [ ] Win-back scan flow runs without subscription, captures one scan, locks back to readonly
- [ ] Win-back scan deep link is single-use, account-bound, 14-day expiration
- [ ] Annual retrospective fires at day 365
- [ ] Final email fires at day 730 and clears opt-in flag
- [ ] Hard-delete flow works from look-back mode
- [ ] Privacy primer updated to mention 30-day grace + look-back mode + email digest in plain language
- [ ] PostHog events scrub all identifying data
- [ ] Sentry breadcrumbs scrub email content
- [ ] Brand voice review: every email template + every welcome-back string read aloud
- [ ] Persona check: each persona walked through cancel → grace → readonly → email digest → win-back → resume
- [ ] Maestro flow: cancel during paid → grace → use app for 25 days → readonly → resume from email
- [ ] Maestro flow: cancel → 90 days lapsed → win-back email → redeem free scan → resume to paid
- [ ] Region check: digest emails respect GDPR opt-in rules in EU regions
- [ ] Edge case: user changes email after cancellation; digest follows new email
