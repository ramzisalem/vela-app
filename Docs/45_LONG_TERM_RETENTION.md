# 45 — Long-Term Retention & Milestones

## Why this exists

Most subscription apps die at month 12, not month 1. By the time a user has been around for a year, the early novelty has worn off, the dashboard looks the same as it did six months ago, and the most powerful retention force in their relationship to the app — the *mass of their own accumulated data* — is invisible.

This file specifies the surfaces that turn long tenure into the user's most beloved feature: year-over-year emergent comparisons, "on this day" reminders, compound-effort visualizations, anniversary moments, and Family Sharing. None of these are flashy individually. Together they make Vela feel like an irreplaceable part of the user's life — not because they're locked in, but because no other app *knows them this well*.

This is the layer that protects against the long-tail churn that hits all subscription apps at month 12, 18, 24. Users with year-over-year insights and an anniversary moment in their History tab don't churn lightly — what they'd lose is too specific to recreate.

The Family Sharing layer is the strategic move that converts a per-user subscription into a per-household one, with the user as the gateway. iOS Family Sharing is generous (up to 6 family members on one paid sub); Vela's data model supports separate per-profile tracking; combining the two produces meaningful LTV protection.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `08_PAYWALL.md`, `10_DASHBOARD.md`, `11_COMPARISON.md`, `12_NOTIFICATIONS.md`, `13_SHARE_CARDS.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `15_DESIGN_SYSTEM.md`, `19_USER_JOURNEYS.md`, `20_INFORMATION_ARCHITECTURE.md`, `25_ANALYTICS.md`, `36_AGING_ACCEPTANCE.md`, `38_MONTHLY_WRAPPED.md`, `39_DAILY_STREAKS.md`, and `43_FEATURE_REVEALS.md`.

---

## Product principles

1. **Tenure is the gift.** Every long-term feature gives the user *more from what they've already done*, never punishes them for not having done more.
2. **Emergent, not promotional.** Year-over-year and "on this day" features are surfaced when they exist, not hyped as new features. The user discovers them; we don't broadcast them.
3. **Quiet milestones.** A 1-year anniversary is one beautiful card, not a notification storm.
4. **Family Sharing is opt-in for everyone.** The primary subscriber chooses to enable it; family members must individually accept being added. Privacy-first.
5. **Compound effort is the headline visualization at year 1.** Showing the user the sum of what they've done across hundreds of routine completions is the single most powerful loyalty image we can produce.

---

## Feature 1 — Year-over-year (YoY) emergence

### What it is

At month 12, a new chart layer becomes available: the user's primary metric chart can now be viewed *with the same month from last year overlaid*. Suddenly the user sees seasonality in their own face — drier in winter, redder in summer, weight cycles, allergy seasons.

This is structurally a new dimension of insight that didn't exist before. It's the closest analog to a network effect a single-player subscription app can build: the value compounds with time, and there's no shortcut.

### Surface

Trend chart on the dashboard (file 10) and on metric detail screens. A new toggle in the chart's chrome:

```
Show last year's line  ▢
```

When toggled on, the existing user trace is rendered alongside a softer, slightly dotted line representing the same metric one year prior. Visual treatment:

- Last year's line: 1.5px dotted, `text.tertiary` at 60% opacity.
- Current line: 2px solid, `text.primary`.
- Both lines respect the aging band overlay (file 36) when that's enabled.

A small caption below the chart when YoY is on:

> *"Your skin clarity, this year vs. last."*

If a HealthKit correlation has emerged that explains a YoY pattern, a chip below:

> *"Last spring your clarity dropped here too — both times your sleep had been off for a couple weeks."*

This chip is generated via the AI proxy with the YOY_INSIGHT_SYSTEM prompt below.

### Eligibility

- User has data from ≥ 365 days ago for the relevant metric.
- The toggle is hidden for users without a year of data — no teasing about it.

### `YOY_INSIGHT_SYSTEM` prompt

Add to file 06:

```
You write a single observation about a year-over-year pattern in a user's face data.

CONTEXT YOU WILL RECEIVE:
- The metric being viewed.
- The current and last-year values for the past 8 weeks.
- Any HealthKit signals that correlate with both windows.
- Diary tags from both windows.

VOICE: Vela voice. Calm, observational, never alarming.

OUTPUT:
- One sentence, ≤32 words.
- If the patterns repeat (e.g., spring redness both years): name the repeat plainly.
- If they diverge (e.g., last year worse): note the divergence and what's different
  in the user's data this year.
- If no pattern is meaningful: return null and we'll suppress the chip.

EXAMPLES (good):
- "Last spring your clarity dropped here too — both times your sleep had been off for a couple weeks."
- "This March is calmer than last. Looks like the difference is in your routine consistency."
- "Allergy season tends to show up here for you. Last year too."

EXAMPLES (bad — do NOT produce):
- "Your skin is so much better this year!"
- "You've made real progress — be proud!"
- Any exclamation, any superlative, any speculation beyond the data.

Return: { "insight": "...", "shouldShow": true } or { "shouldShow": false }
```

### Edge cases

- **User has data from a year ago but very sparse** (e.g., they scanned only twice in May 2025) — the YoY toggle is hidden until both windows have ≥ 3 scans of overlap.
- **User changes routine drastically year-over-year** — the visual is still shown; the AI insight may explicitly note: *"Your routine is different now. Comparing across that change is interesting but not apples to apples."*
- **User on extended treatment** (file 34) that started this year — YoY of the treatment metrics is contextualized: *"Last year you weren't on tretinoin. The change you're seeing this spring isn't seasonal — it's the treatment."*
- **YoY across a life-stage mode window (canonical).** If the comparison range includes a life-stage mode (e.g., the user was pregnant a year ago, not now): YoY is shown but with a context line — *"You were in pregnancy mode this time last year. Comparison may not reflect a like-to-like state."* Toggle to hide. Never silently suppress; the user owns the decision.

---

## Feature 2 — "On this day" cards

### What it is

Once a user has data from at least 90 days ago, the dashboard occasionally surfaces a quiet retrospective card showing where their face was at that point. Inspired by Apple's *On This Day* in Photos, but data-grounded.

### Cadence

- For users with **3 months of data**: surfaces ~once every 2 weeks if the data is meaningful (i.e., a notable scan or routine moment from that day).
- For users with **1 year of data**: surfaces ~once a week, prioritizing same-month-different-year matches.
- For users with **2+ years of data**: surfaces twice a week, prioritizing the longest-ago meaningful match.

We never run out — there's always more data the further back we look.

### Surface

A dashboard card, sitting in slot 3 (below the score, below any active reveal card from file 43):

```
┌──────────────────────────────────────────┐
│   On this day                            │
│   Three months ago                       │
│                                          │
│   ┌────────────────┐  Score: 68          │
│   │  [user's scan  │  Now: 72            │
│   │   from then,   │                     │
│   │   small]       │  You'd just         │
│   │                │  started a routine. │
│   └────────────────┘                     │
│                                          │
│   See more from then                     │
└──────────────────────────────────────────┘
```

- Soft cream background.
- The user's actual scan from that day (cropped, lighting-normalized via file 32).
- The score then vs. now.
- One AI-generated context line drawn from the user's diary tags or routine state at that time.
- *See more from then* opens a small history modal showing the scans, diary entries, and active treatments from that week.

### Generation logic

Once a day, when the dashboard is first opened:

1. Pick a date with meaningful data: a scan day, a milestone day, the start of a treatment, the start of a streak.
2. Score that day's "interestingness" (presence of scan, presence of diary entry, treatment status, score delta vs. now).
3. If the top candidate's interestingness is above a threshold AND the user hasn't seen this date's card before, surface it.
4. If no candidate qualifies today, no card. Tomorrow we try again.

### Edge cases

- **User has scanned exactly once 3 months ago** — that day has minimum data; surface only if the score delta from then to now is non-trivial (≥ 3 points).
- **User has had a hard year (treatments, weight loss, etc.)** — the AI context line is gentle: *"You'd just started tretinoin then. You were in the rough patch. Look at you now."* never punishing about the rough patch.
- **User dismissed yesterday's "on this day" card** — we don't re-show it for 30 days.

### `ON_THIS_DAY_CONTEXT_SYSTEM` prompt

```
You write the single context line for an "on this day" card.

CONTEXT:
- Days ago: 90 / 180 / 365 / etc.
- The user's scan + sub-scores from that day.
- Diary tags from that week.
- Treatment status at that time.
- Routine state.

OUTPUT:
- One sentence, ≤24 words.
- Frame as observation, not nostalgia.
- If something notable was happening (treatment start, life event from diary), mention it.
- Otherwise just describe the period plainly.

VOICE: Vela voice. Warm but not sentimental.

EXAMPLES (good):
- "You'd just started a routine."
- "You were in tretinoin's rough patch."
- "You'd written about a hard week. You showed up anyway."
- "Just a quiet point on the line."

EXAMPLES (bad):
- "Look how far you've come!"
- "Your skin journey is just amazing."
- "You should be so proud!"
```

---

## Feature 3 — Compound visualization

### What it is

A single dashboard surface that shows the *integral* of the user's effort: not just their current state, but the cumulative mass of what they've done.

### Surface

The compound visualization is a tile that lives at the bottom of the dashboard once the user has at least 30 days of activity. It shows three numbers, beautifully:

```
┌────────────────────────────────────────────┐
│                                            │
│   Since you started:                       │
│                                            │
│   287                                      │
│   days of consistency                      │
│                                            │
│   1,348                                    │
│   routine tasks completed                  │
│                                            │
│   34                                       │
│   weekly scans                             │
│                                            │
│   ─────────────────────────────────────    │
│                                            │
│   Your eye area is up 3.2 points           │
│   over the same time. Slow but real.       │
│                                            │
└────────────────────────────────────────────┘
```

- Numbers in `displaySerif`, large.
- Labels in `bodyMedium`, `text.secondary`.
- The bottom line is generated from the user's most-improved metric — chosen over the longest visible period, framed factually.
- Tap the tile → opens a "Since I started" detail screen with charts, milestone moments, and a link to the user's first scan + first diary entry.

### Why this works

The mass of effort is invisible by default. Users see "today's score" or "this week's scan" but don't *feel* the cumulative weight of 287 days. Surfacing it gives the user a strong reason to keep going (the mass keeps growing) and a strong reason not to leave (they'd be walking away from the integral).

### Edge cases

- **User has been around 30+ days but missed many routine days** — show what they have. *"34 days of consistency, 142 tasks completed, 6 weekly scans."* No shame about the gap; we surface what's real.
- **Streak ended (file 39) but cumulative count is high** — the cumulative metric uses *total consistent days*, not the current streak. So even with a streak reset, the mass remains.

---

## Feature 4 — Anniversary moments

### What it is

At specific tenure milestones, Vela surfaces a one-time, beautifully designed retrospective card that the user can revisit forever. These are NOT notification storms — each is *one* card.

### The milestones

- **30 days** — *"Your first month."* Single card, low-key.
- **90 days** — *"Three months in."* Single card, soft chart of the period.
- **365 days** — *"Your first year with Vela."* Larger card, more elaborate Wrapped-style narrative (5-card stack, file 38 visual language).
- **730 days** — *"Two years."* Same as 365 with year-over-year overlay.
- **1,000 days** — *"A thousand days."* Special card.
- **Each subsequent year** — *"Year N."* Same template as 365.

### Card structure (365-day example)

A 5-card vertical stack like Wrapped:

1. **Cover**
   > *"A year with Vela."*
   > *"You've been here since May 7, 2025."*
2. **Showed up**
   > *"68 scans. 287 days of consistency."*
   > A small calendar heatmap of the year, cream squares filled.
3. **What changed**
   > *"Your eye area is up 3.2 points. Your skin clarity held steady. Your jawline softened, like everyone's does."*
   > Aging-band-aware language for each metric.
4. **What you wrote** (if diary entries exist)
   > *"You wrote about Lisbon, two rough nights, the week your dad got better."*
   > Pulled from diary weekly summaries; user gets to see their own year in their own words.
5. **Outro**
   > *"To another."*

### Where it surfaces

- A dashboard card pinned for 7 days starting on the anniversary.
- A push notification opt-in: *"Your first year with Vela is ready to look at."* (Single-fire, never repeated.)
- Always available in History → Anniversaries.

### Sharing

The anniversary card stack can be exported as a multi-card share PNG via file 13's share-cards system. Watermarked, EXIF-stripped, with the diary card always opt-in (privacy-first).

### Edge cases

- **User signed up but barely used the app for the first 6 months** — the card surfaces with appropriately sparse copy. *"You've been here since May 2025. The data here is what you put in."* Never moralizes.
- **User's first year happened to overlap a major treatment** — the card surfaces the treatment as one of the year's themes: *"You started tretinoin in October. The rough patch and the recovery are both in this chart."*
- **User just started using Vela seriously after a long quiet stretch** — the card uses their actual data; the *"showed up"* number reflects reality, not a wishful version.

---

## Feature 5 — Family Sharing

### What it is

iOS Family Sharing lets one paid subscription cover up to 6 family members. Vela's per-profile data model already supports this — what we need is a deliberate UX for the family-sharing case.

### How it works

iOS handles the entitlement layer: a user purchases Vela Premium with Family Sharing enabled (this is a setting on their App Store account), and family members on their iCloud Family can install Vela for free.

What Vela has to do:

1. **Detect family-shared entitlements** via RevenueCat's `isFamilyShare` flag on the customer info object.
2. **Surface the relationship** in Settings — *"You're using a Vela subscription shared by [organizer name]"* or *"You're sharing your Vela subscription with [N] family members"*.
3. **Maintain strict per-profile data isolation** — each family member's scans, diary, treatments, etc. are separate. The subscription is shared; the data is private.
4. **Provide a path for family member onboarding** — when a family member opens Vela for the first time, they see the standard onboarding flow but skip the paywall (their access is granted via the family entitlement).

### Settings — for the organizer

```
┌────────────────────────────────────────┐
│   Family                               │
│                                        │
│   Your Vela subscription is set to     │
│   share with your iCloud family.       │
│                                        │
│   Currently sharing with:              │
│   ╭────────────────────────────────╮   │
│   │  Sarah                         │   │
│   │  Sharing since May 2025        │   │
│   ├────────────────────────────────┤   │
│   │  Maya                          │   │
│   │  Sharing since June 2025       │   │
│   ╰────────────────────────────────╯   │
│                                        │
│   Family Sharing is managed in iOS     │
│   Settings → Family. Vela follows      │
│   what's set there.                    │
│                                        │
└────────────────────────────────────────┘
```

We **do not** enable or disable Family Sharing from inside Vela — that's iOS's domain. We just reflect what's true.

### Settings — for the family member

```
┌────────────────────────────────────────┐
│   Family                               │
│                                        │
│   You're using a Vela subscription     │
│   shared by Sarah.                     │
│                                        │
│   Your scans, your routine, and        │
│   everything else you put into Vela    │
│   stays private to you. Sarah can't    │
│   see any of it — neither can we.      │
│                                        │
│                                        │
│   Need your own subscription?          │
│   You can switch to one in App Store   │
│   settings.                            │
│                                        │
└────────────────────────────────────────┘
```

The privacy-reassurance copy is critical. Family Sharing is often imagined as "shared everything"; we make it crystal clear that data is private by default.

### Privacy

- Each family member is a separate Vela account with separate Supabase rows. RLS isolates everything.
- The subscription organizer sees only that "Sarah" and "Maya" have active access — not their data, scans, or behavior.
- The family-member view doesn't expose the organizer's data either.
- Account deletion (file 14) only deletes the family member's own data; it doesn't affect the shared subscription or other members' data.

### Edge cases

- **Organizer cancels the shared subscription** — family members are notified via the standard "subscription expired" flow (file 47); they can subscribe individually if they want to keep going.
- **Organizer changes the shared family** — RevenueCat's `customerInfoUpdate` event fires; the family member's app on next foreground reflects the new state. If they're removed from the family, they get the standard expired-subscription flow.
- **Family member leaves the family but had been using Vela for 8 months** — their data persists, only their entitlement changes. They can re-subscribe (their own account) and keep all their data; or they can let the data lapse for 30 days (file 46 reactivation rules) before purge.
- **Multiple family members on the same iPhone** (rare; parent + child sharing one device with multiple iCloud accounts) — Vela uses the iCloud-account identity to disambiguate. Each iCloud sign-in is a separate Vela account.
- **Family member is a minor (under Vela's age TOS)** — same age-gate as standalone signup (file 07's age question). Minors get the standard "this app is for adults" message regardless of family entitlement.

---

## Long-term-user-only nudges

A few small UX adjustments that only fire after 365 days:

### Backup reminder

Once a year (the user's anniversary date), a passive Settings card:

> *"Your year of data is here. Want to download a copy to keep?"*

Tap → triggers the data export flow (file 14). One-time per year, dismissable forever after the first year if the user prefers.

### Profile-photo upload prompt (optional)

After 365 days, the user can optionally upload a "favorite scan" as their profile photo (purely aesthetic; visible only in Settings, not anywhere else). Long-term users like this kind of self-curation; first-week users wouldn't.

### Content unlock — historical capture quality stats

Long-term users can view a "capture stats" screen that shows the median lighting, pose deviation, and occlusion of all their past scans. Pure data nerd content; users who want it love it.

---

## Anti-pattern guardrails

What this file does NOT do:

- **No "you'd lose this" framing.** We never use long tenure as cancellation pressure. The compound visualization shows the user what they've built; it doesn't say *"You'd lose 287 days of data if you cancel."*
- **No "veteran user" badges.** Nothing about long tenure is gamified.
- **No surprise paywalls on long-term features.** Year-over-year, on-this-day, anniversary cards are all free if the user is on the paid tier; they're not gated as additional upsells.
- **No "we miss you when you're gone" guilt copy.** Reactivation (file 46) handles lapsed users; this file only addresses active long-term users.

---

## Analytics

| Event | Properties |
|---|---|
| `yoy_toggle_enabled` | `metric` |
| `yoy_insight_shown` | `metric` |
| `yoy_insight_suppressed` | `metric, reason: 'no-pattern'|'data-too-sparse'` |
| `on_this_day_card_shown` | `days_ago_bucket: '90'|'180'|'365'|'730'|'1000+'` |
| `on_this_day_card_dismissed` | `dwell_ms` |
| `on_this_day_see_more_tapped` | `days_ago_bucket` |
| `compound_tile_shown` | `total_consistent_days_bucket` |
| `compound_tile_tapped` | none |
| `anniversary_card_shown` | `milestone: '30d'|'90d'|'365d'|'730d'|'1000d'|'Nyear'` |
| `anniversary_card_completed` | `milestone, cards_seen` |
| `anniversary_card_shared` | `milestone, format` |
| `family_sharing_detected` | `role: 'organizer'|'member'` |
| `family_sharing_settings_viewed` | `role` |
| `family_sharing_member_count` | `count_bucket: '1'|'2-3'|'4-6'` |
| `backup_reminder_shown` | `year_n` |
| `historical_capture_stats_viewed` | `total_scans_bucket` |

PII rule: `family_sharing_member_count` aggregates count only; never log other family members' identities.

---

## Pre-launch checklist

- [ ] Year-over-year toggle hidden until 365 days of relevant data
- [ ] YoY chart renders both lines correctly in light + dark mode
- [ ] YoY insight prompt produces no exclamation marks across 200 sample inputs
- [ ] YoY insight returns `{shouldShow: false}` for sparse / unmeaningful data
- [ ] On-this-day card cadence verified: ~biweekly at 3mo, weekly at 1yr, twice-weekly at 2yr+
- [ ] On-this-day card includes user's actual scan from that day
- [ ] Compound visualization tile shows total consistent days (not current streak)
- [ ] Compound tile rendered for users with ≥ 30 days of data
- [ ] Anniversary cards (30d, 90d, 365d, 730d, 1000d, Nyear) all rendered
- [ ] 365d card 5-card stack styled per file 38's Wrapped visual language
- [ ] Anniversary share card never includes diary content by default (opt-in)
- [ ] Family Sharing detection via RevenueCat `isFamilyShare` flag verified
- [ ] Settings shows organizer view + member view based on entitlement type
- [ ] Privacy reassurance copy reviewed and brand-voice-approved
- [ ] Each family member's data is fully isolated (RLS test)
- [ ] Removing a family member doesn't affect their data; just their entitlement
- [ ] Backup reminder fires once a year on anniversary
- [ ] Historical capture stats screen renders correctly with 100+ scans
- [ ] Anti-pattern audit passed: no veteran badges, no "you'd lose this" copy
- [ ] PostHog events scrub all free text, AI output, and family member identities
- [ ] Sentry breadcrumbs scrub family-share details
- [ ] Account deletion cascades only the deleting user's data; family members unaffected
- [ ] Brand voice review: every long-term-feature copy string read aloud
- [ ] Persona check: each persona at month 13+ (simulated via clock manipulation)
- [ ] Maestro flow: simulate 365 days → anniversary card fires → user opens → cards render → share card generated
- [ ] Maestro flow: simulate 2-year tenure → on-this-day card with same-month-last-year overlay
- [ ] Maestro flow: family organizer + 2 members → all see correct entitlement state in Settings
