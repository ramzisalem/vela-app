# 38 — Monthly Wrapped

## Why this exists

Spotify Wrapped is the most powerful product mechanic of the last decade. A user-personal, beautifully designed retrospective that summarizes the user's recent activity and is so good they want to share it. It does three things at once: it reminds the user of the value they've gotten, it gives them a reason to return on a predictable date, and it's the rare share-card that doesn't feel like advertising.

Vela has every ingredient: longitudinal data, scans, routine streaks, diary entries, treatments, correlations. A monthly retrospective ties them all together into a single moment users look forward to.

We make it **monthly**, not annual, because:
1. Vela's data accrues fast enough that monthly is genuinely meaningful.
2. Monthly cadence creates a strong return-rhythm — users open the app on the 1st of every month.
3. The first month a new user receives one is week 4–5, well past the trial window — it's a retention payoff that lands at the moment users are deciding whether to keep paying.
4. Annual is too sparse to drive habits. Monthly is dense enough to build them.

The feature must be **brand-perfect**. The voice rules from file 21 apply harder here than anywhere else. Vela's Wrapped is calm and considered — never the fireworks-and-confetti flavor of the genre.

This file extends `02_TYPES_AND_MODELS.md`, `06_AI_PROMPTS.md`, `09_ROUTINE.md` (streak data), `10_DASHBOARD.md`, `12_NOTIFICATIONS.md`, `13_SHARE_CARDS.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `15_DESIGN_SYSTEM.md`, `21_BRAND_SYSTEM.md`, `25_ANALYTICS.md`, `33_HEALTHKIT.md`, `34_TREATMENT_TRACKING.md`, `36_AGING_ACCEPTANCE.md`, `37_DIARY.md`, `39_DAILY_STREAKS.md`.

---

## Product principles

1. **Beautiful, not noisy.** Quiet typography, slow ease curves, generous whitespace. We earn attention by being respectful.
2. **Always honest.** If a user's month was rough, we say so kindly — never paper over it with "amazing month!" energy.
3. **Theirs to keep.** A Wrapped issued is preserved forever in History. Users can revisit a Wrapped from 11 months ago and feel something.
4. **Low-data graceful.** A user with 1 scan and no diary entries gets a Wrapped that's still meaningful, just shorter and softer.
5. **Sharing is optional and watermarked.** No social pressure, no badges, no "share to unlock." If they share, we make it look like Vela.

---

## When Wrapped fires

- Generated automatically on the **1st of every month, at 8:00 AM local time**, summarizing the previous month.
- Available in-app from that moment forward; persists in History.
- An opt-in notification fires at the same time: *"Your April recap is ready when you are."* Tap → opens Wrapped.
- The very first Wrapped a user gets is for their first full calendar month — *not* a partial month from when they signed up. (Partial first months show as a single recap card on the dashboard, not a full Wrapped.)
- Re-generation: if the user makes significant edits later (deletes scans, adds backdated diary entries), Wrapped is regenerated quietly. The user is never notified of regeneration.

---

## Structure of a Wrapped

A vertical, full-screen, swipeable card stack. ~9 cards on the maximum data path; fewer for low-data users. Each card has:

- A serif headline (large, espresso text, generous breathing room).
- One soft-cream illustration or chart (file 24's illustration system, with Wrapped-specific assets).
- One body line (sans-serif, ≤22 words).
- An optional secondary line (smaller, muted) for context.

The card stack has its own subtle motion design: a slow upward swipe transition with a gentle ease, never a flashy slide. The progress dots at the top are filled cream over an espresso outline.

### The card sequence (max-data version)

1. **Cover**
   > *April*
   >
   > *Your month, in eight quiet cards.*
2. **Showed up**
   > Headline: *You scanned four times.*
   > Body: *Same time of evening, same window. Consistency is the compound lift in this app.*
   > Subtle hairline below the number.
3. **Routine streak** (if file 39 streak ≥ 7 days)
   > Headline: *Twenty-one days in a row.*
   > Body: *Your morning SPF, your evening retinol — every single day.*
   > Tiny chart: streak heatmap of the month.
4. **What moved**
   > Headline: *Skin clarity, up.*
   > Body: *A small but real shift since March 1. Your sub-score rose three points.*
   > Mini sparkline of the metric over 30 days.
5. **What didn't**
   > Headline: *Eye area, steady.*
   > Body: *No movement either way. Sometimes that's the win — held the line.*
6. **Pattern noticed** (if HealthKit + correlations available)
   > Headline: *On the weeks you slept well…*
   > Body: *…your skin clarity tracked higher. Three nights of seven hours, three above-average scans.*
   > Tiny dual-line chart.
7. **In your words** (if ≥3 diary entries that month)
   > Headline: *April, in three words.*
   > Body: *"Sunny week in Lisbon, two rough nights, period mid-month."*
   > Subtle quote attribution: *— from your diary*
   > Pulled from the user's own writing via diary weekly-summary outputs.
8. **Treatment progress** (if any active treatment, file 34)
   > Headline: *Tretinoin, week 12.*
   > Body: *Past the rough patch. Your clarity climbed two points this month — right when retinol typically starts to show.*
   > Tiny progress curve with current point.
9. **A quiet note** (always present, AI-written)
   > Headline: *Worth saying:*
   > Body: One AI-generated kindness line. *"You showed up for yourself in April. That's the part that compounds."*
10. **Outro**
    > Headline: *See you in May.*
    > [ Share my recap ]   [ Done ]

### Low-data variants

- **1–2 scans, no streak, no diary, no treatment** → 5 cards: Cover, Showed up (with kinder language: *"You started this month — that's how every long timeline begins."*), What moved (or "Settling in"), A quiet note, Outro.
- **No scans this month** → no Wrapped is generated. A subtle dashboard card instead: *"Quiet month — see you at your next scan."*

---

## Types

```ts
// src/types/wrapped.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface MonthlyWrapped {
  id: string;
  userId: string;
  month: string;                 // YYYY-MM
  generatedAt: string;
  cards: WrappedCard[];          // ordered
  // Whether the AI-written cards have been generated yet.
  // Wrapped is shown immediately with statistical cards, AI cards stream in.
  // Streaming UX (canonical): on open, the statistical cards render immediately
  // (cover, scans, streak, what-moved sparklines). AI-dependent cards
  // (quiet-note, treatment narrative) render with a soft skeleton matching the
  // card layout + the loading-copy register from file 22 ("Reading your week back").
  // Skeletons resolve to actual content as the Edge Function completes — typically
  // 2–4 seconds after open. No spinner; the skeleton itself communicates the wait.
  aiCardsReady: boolean;

  // Color hue seed (canonical):
  // Wrapped's accent hue is picked deterministically per month so the experience
  // is consistent across devices and revisits. Seed: hash(userId, month) using
  // xxhash32. The hash modulo the VelaPrimarySoft palette length picks the hue.
  // Documented here so the field name is explicit:
  //   colorSeed: string;  // 8-char hex from xxhash32(userId + '|' + month)
  // Cursor MUST use the same seed across web, iOS, and any future Wrapped surface.
  colorSeed?: string;
}

export type WrappedCard =
  | { kind: 'cover'; month: string; tagline: string }
  | { kind: 'scans'; count: number; consistencyNote?: string }
  | { kind: 'streak'; days: number; calendarHeatmap: boolean[] }
  | { kind: 'metric-up'; metric: FaceMetric; deltaPoints: number; sparkline: number[] }
  | { kind: 'metric-steady'; metric: FaceMetric }
  | { kind: 'metric-down'; metric: FaceMetric; deltaPoints: number; band: 'within' | 'outside' }
  | { kind: 'pattern'; faceMetric: FaceMetric; healthSignal: string; note: string }
  | { kind: 'in-your-words'; threeFragments: string[] }
  | { kind: 'treatment'; treatmentId: string; weeksIn: number; progressNote: string }
  | { kind: 'quiet-note'; body: string }
  | { kind: 'outro' };
```

### Schema additions

`monthly_wrapped` table in Supabase:

```sql
create table public.monthly_wrapped (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,         -- YYYY-MM
  payload jsonb not null,      -- the cards array
  generated_at timestamptz not null default now(),
  ai_cards_ready boolean not null default false,
  unique (user_id, month)
);

alter table public.monthly_wrapped enable row level security;
create policy "users own wrapped" on public.monthly_wrapped
  for all using (auth.uid() = user_id);
```

### Why store the payload server-side
- Cross-device consistency (a user opens Wrapped on a different iPhone and sees the same recap).
- Re-generation is straightforward (replace the row).
- The AI-written cards are the most expensive part to regenerate; we cache them.

The diary-derived "in your words" card stores the three fragments separately on the device (since diary text is locally encrypted). The Wrapped row stores a placeholder; the device fills it in at view time.

---

## Generation pipeline

A single `generate-monthly-wrapped` Edge Function (file 03), called automatically by a Supabase cron job at 00:01 UTC on the 1st of each month for the previous month, processed in batches.

```
1. Read user's:
   - Scans in [month_start, month_end]
   - Sub-score deltas vs. previous month
   - Routine streak data (file 39)
   - HealthKit-derived correlations active that month (file 33)
   - Diary weekly summaries for the month (file 37)
   - Active treatments (file 34)
   - Aging context (file 36)

2. Decide which cards apply (rules below).

3. For each card requiring AI copy (cover tagline, quiet-note, treatment progress note),
   call ai-proxy with WRAPPED_COPY_SYSTEM.

4. Compose the WrappedCard[] array.

5. Insert into monthly_wrapped table.

6. Schedule the user's notification at 8:00 AM local time on day 1.
   (Notification scheduler reads user's local timezone.)
```

### Card inclusion rules

- **scans** — always present if ≥1 scan that month.
- **streak** — only if `streakDays >= 7` at any point in the month.
- **metric-up** — pick the metric with the largest positive delta if it's > +2 points.
- **metric-steady** — pick a metric with |delta| < 1 if no metric-up qualifies AND there's at least one scan; otherwise omit.
- **metric-down** — included only if also includes the aging-context note (file 36) — never standalone.
- **pattern** — only if a strong correlation (`|r| > 0.5, n >= 4`) is fresh this month.
- **in-your-words** — only if ≥3 diary entries that month.
- **treatment** — only if user has an active treatment that has at least 4 weeks of data.
- **quiet-note** — always present.
- **cover & outro** — always present.

### `WRAPPED_COPY_SYSTEM` prompt

```
You write short, considered, calm card copy for a user's monthly recap.

VOICE: Vela voice (file 21). Quiet, warm, no urgency, no exclamation marks.

CARD-SPECIFIC RULES:
- COVER: 1 line, ≤8 words. Sets a tone of quiet acknowledgment.
- QUIET-NOTE: 1-2 lines, ≤22 words. Closes the recap with one true thing.
  Bias toward the user's effort or consistency, never their appearance.
- TREATMENT-PROGRESS: 1-2 lines, ≤30 words. Names what's expected at this
  point in the treatment AND what the data shows.

NEVER:
- Use the words: "amazing", "incredible", "crushed", "killing", "transformation",
  "glow", "shine", "best version", "wow", or any exclamation mark.
- Compare the user to other users.
- Suggest they should have done more or done better.
- Promise anything about the future.
- Speak in second-person plural ("we", as if the AI is on the team).

EXAMPLES — good (quiet-note):
- "You showed up for yourself in April. That's the part that compounds."
- "April was uneven. The fact that you scanned anyway is the point."
- "Two scans, one rough week, three good ones. Onward."

EXAMPLES — bad (do NOT produce):
- "Amazing month! You crushed it!"
- "Your skin is glowing!"
- "You're on your best version yet — keep going!"
```

The Edge Function pulls cached generated copy on subsequent regenerations rather than calling the AI proxy every time.

---

## Visual design

This is the most design-sensitive surface in the app. Specs are tight.

### Layout
- Full-bleed cards, 100vh × 100vw of safe-area-inset.
- Cream background (`surface.primary` in light, `surface.elevated` in dark).
- Maximum content width 88% of screen, centered.
- Card content is vertically centered with significant top/bottom whitespace.

### Typography
- Card headline: `displaySerif` 36/40 (file 15), with up to 3 lines.
- Body: `bodyLarge` 18/26.
- Secondary line: `bodySmall` 14/20 in `text.tertiary`.
- All copy left-aligned. Never centered (centered text reads as social-media template).

### Color
- Espresso text (`text.primary`) on cream.
- One soft accent per Wrapped: a single hue from `VelaPrimarySoft` palette (lavender, dust-blue, mauve, blush) is chosen for each user's Wrapped and used consistently across all cards. The hue is picked based on month and user ID so it varies but feels designed.

### Motion
- Cards transition with a 480ms ease-out vertical slide. Reduce-motion users get an instant cross-fade (no slide).
- The active card's headline fades in 80ms after the card finishes its slide.
- A subtle parallax on the illustrations (10% offset on tilt) for users who haven't reduced motion.

### Illustrations & charts
- Each card has a single hero element. New illustration set in file 24: `wrapped-cover.svg`, `wrapped-scans.svg`, `wrapped-streak.svg`, `wrapped-pattern.svg`, `wrapped-quiet.svg`, `wrapped-outro.svg`.
- Charts within cards are minimal: no gridlines, no axis labels, just the line + one labeled point. Soft mauve fill under the line at 14% opacity.
- The streak heatmap card is a 5x7 grid of soft cream squares with filled-in days; it's the only "data viz" we permit in Wrapped because it's beautiful in its own right.

### Card-stack progress indicator
A row of dots at the top, 8px diameter, soft cream filled when current/passed, hollow espresso outline when upcoming.

---

## Sharing

A single share button on the Outro card: *Share my recap*.

Tap → user picks **which cards to include**:
- Default selection: cover, scans, streak, what moved, quiet-note, outro.
- **If user has an active treatment** (file 34): the share-selection sheet surfaces an additional toggle, ON by default for the user but OFF by default in the share-card composite — *"Include treatment progress (Tretinoin, week 6)"* — with the explainer *"Useful if you're sharing this with your doctor."* User can untoggle to keep treatment private. This makes the doctor-sharing path explicit without forcing it on social-share users.
- The "in your words" card is **never** in the default selection — it contains the user's own diary words and we don't presume to make them shareable. The user has to explicitly opt in.

Generated as a single 1080x1920 vertical PNG composite (re-using share-cards system from file 13). Format selectable: vertical (Stories/Reels), square (feed). Watermarked (Vela wordmark in muted footer).

EXIF stripped (per file 13 rules).

---

## Notifications

A new notification kind `wrapped-ready`:

- Default: opt-in via "Monthly recap" Settings toggle, **on by default** (this is the rare case where opt-in default is on, because it's a positive once-a-month moment, not nag-able). The toggle is prominent in Settings → Diary & recap.
- Time: 8:00 AM local time on the 1st of the month.
- Copy: *"Your <Month> recap is ready when you are."*
- Tap → opens Wrapped at the cover card.
- If the user has the diary nudge or routine reminder also scheduled for that morning, dedupe: only the Wrapped fires that morning.

---

## Where Wrapped lives in the app

- **First view path**: from the notification, or from a passive *"Your April recap is ready"* card pinned to the top of the dashboard for the first 7 days of the month. After 7 days the card moves to the History tab.
- **Permanent home**: Settings → *History* → *Monthly recaps* — chronological list of every Wrapped the user has ever received. They can revisit any.
- **Never auto-opens**: the user always taps in. We don't surprise-launch this.

---

## Edge cases

- **User signed up mid-month** — first calendar month with full data triggers their first Wrapped, with a special cover tagline: *"Your first month with Vela."*
- **User had no scans that month** — no Wrapped is generated. A passive card on the dashboard: *"Quiet month — see you at your next scan."* No notification.
- **User had only 1 scan** — Wrapped is generated, low-data variant. Quiet-note copy is biased toward "this is the start."
- **User deletes a month's worth of scans** — Wrapped is regenerated next time the user opens the app. If they've already seen it, the *previously seen* version is preserved (we don't rewrite history without user knowledge); a new "updated" copy is created and they can see both in History.
- **User is in a timezone without proper offset data** — fallback to UTC for scheduling.
- **Generation fails** — Edge Function retries 3x with exponential backoff. If still failing, the user sees no notification and a Sentry alert fires. The Wrapped is generated lazily when the user next opens the app.
- **User on a multi-month treatment** — the first treatment-progress card mentions "your first month tracking <Treatment>." Subsequent months are normal.
- **AI-generated cards fail to produce valid output** — fall back to deterministic copy templates. Better to have a slightly less-polished Wrapped than no Wrapped.
- **Wrapped has been generated for a month, then user starts a treatment retroactively that overlaps that month** — Wrapped is regenerated to include the treatment context.

---

## Privacy

- Server stores only structural payload (counts, deltas, card kinds). User-identifying free text (diary fragments) is not stored on the Wrapped row; the device fills it in at view time using locally-decrypted diary data.
- The "share my recap" PNG is generated client-side; never uploaded.
- All AI generation calls go through ai-proxy and are scrubbed per file 25.
- Wrapped is exported in the user data export (file 14) as JSON.

---

## Settings

In Settings → *Diary & recap* (new section):

- **Monthly recap** — toggle. Default on.
- **Notify me when ready** — toggle. Default on. Disabling means Wrapped is still generated, but no push notification.

---

## Analytics

| Event | Properties |
|---|---|
| `wrapped_generated` | `month, card_count, has_streak: bool, has_pattern: bool, has_diary: bool, has_treatment: bool` |
| `wrapped_notification_shown` | `month` |
| `wrapped_opened` | `month, source: 'notification'|'dashboard-card'|'history'` |
| `wrapped_card_viewed` | `month, card_kind, position` |
| `wrapped_completed` | `month, cards_viewed_count` |
| `wrapped_dismissed_early` | `month, last_card_kind, last_card_position` |
| `wrapped_share_started` | `month` |
| `wrapped_share_completed` | `month, format: 'vertical'|'square', cards_included_count, included_diary: bool` |
| `wrapped_revisited` | `month, days_since_generation` |
| `wrapped_regenerated` | `month, reason: 'data-changed'|'treatment-added'|'admin'` |

Never log card body copy.

---

## Pre-launch checklist

- [ ] Edge Function `generate-monthly-wrapped` runs in batches across all users
- [ ] Cron schedule verified for 1st of month at 00:01 UTC
- [ ] Per-user notification scheduling honors local timezone
- [ ] Card inclusion rules tested across all data variants (max, mid, low, no-data)
- [ ] AI prompt produces zero exclamation marks and zero forbidden words across 200 sample inputs
- [ ] Fallback copy templates render meaningfully when AI fails
- [ ] Card stack respects reduce-motion (cross-fade instead of slide)
- [ ] Color hue selection deterministic per user × month, varies between months
- [ ] All illustrations rendered for light + dark mode
- [ ] Share PNG composites correctly across all card combinations
- [ ] Diary "in your words" card never included in share by default
- [ ] EXIF stripping verified on shared PNG
- [ ] First-time Wrapped (full month) opens without errors for a fresh user (manual test)
- [ ] Wrapped from 6 months ago in History opens identically to its original render
- [ ] Wrapped regeneration after data edit verified end-to-end
- [ ] PostHog events scrub all card body copy
- [ ] Sentry breadcrumbs scrub Wrapped payload
- [ ] Account deletion cascades monthly_wrapped rows
- [ ] VoiceOver: card stack reads in order, headline announced first, body second, secondary third
- [ ] Brand voice review: read every fallback copy template aloud
- [ ] No "younger you" or comparative-to-population copy anywhere
- [ ] Persona check: each of the 4 personas walked through their first Wrapped (qualitative QA)
- [ ] Performance: Wrapped opens in <600ms on iPhone 12 mini
- [ ] Storage: a year of Wrapped data <250 KB per user (verified)
