# 39 — Daily Streaks

## Why this exists

Habits compound. Skin care that's done 26 days a month for a year does more than skin care that's done 3 days a week for the same year. Without a gentle reinforcement loop, most users abandon the routine before they see the result. Streaks are the proven mechanism for closing that gap.

But streaks are also one of the easiest features to ship badly. The Snapchat / Duolingo / fitness-app style — flames, panic-red badges, "Don't break your streak!" notifications, freeze-or-pay-up monetization — directly contradicts everything Vela stands for. They induce anxiety, punish life events, and reward compulsion over consistency.

Vela's streaks are the opposite. They reward showing up, forgive humanly, and never produce the feeling that you've let yourself or the app down. The visual treatment is warm and quiet. The notifications are a sentence, never an alarm. Missing a day is treated like missing a yoga class — fine, see you tomorrow.

The streak feature exists because it works as motivation. The way it's designed exists because Vela has self-respect about who it is.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `09_ROUTINE.md`, `10_DASHBOARD.md`, `12_NOTIFICATIONS.md`, `15_DESIGN_SYSTEM.md`, `21_BRAND_SYSTEM.md`, `22_FEEDBACK_SYSTEM.md`, `25_ANALYTICS.md`, `28_ACCESSIBILITY.md`, and is referenced by `38_MONTHLY_WRAPPED.md`.

---

## Product principles

1. **Reward presence, never panic.** A streak number is a small, calm fact. It is never used to threaten loss.
2. **Define "consistent" honestly.** A day counts if the user did *most* of their routine. Not all-or-nothing.
3. **Forgive abundantly.** Freezes are generous and automatic. Streaks pause for sickness, travel, life — without the user having to ask.
4. **Quiet visual language.** No flames. No fireworks. No red. Streaks live inside the app's existing cream-and-espresso palette.
5. **Notifications are help, not pressure.** One gentle nudge a day if the user has opted in, and it stops if it isn't working.
6. **No gamification metagame.** No XP, no levels, no badges to unlock, no leaderboards.

---

## Definitions

### A "consistent day"

A day counts toward the streak if **the user completes at least 80% of their scheduled routine tasks for that day**, or marks every scheduled task either Complete or Skipped (an explicit choice — see file 09).

> **Why 80% and not 100%:** real users miss things. If a person nails 7 out of 8 tasks every single day, they have a habit. Forcing 100% creates the perverse incentive of removing tasks from the routine to keep the streak alive. 80% is consistent enough to drive the actual outcome we care about.

> **Why not just count any task completion:** that creates "minimum-effort streak farming" — tap one task, leave the rest. Defeats the point.

### Skipped vs missed

From file 09's task semantics:

- **Complete** — user marked the task done.
- **Skip** — user explicitly tapped "skip for today" (a small affordance next to each task).
- **Miss** — task was scheduled, day ended, neither completed nor skipped.

For streak math:
- **Complete + Skip count toward consistency** when the user explicitly engaged.
- **Miss does not count.**
- **A day where the user explicitly skips every task** does not count toward the streak — that's not consistency, it's bowing out.
- **A day with 80%+ Complete OR (Complete + Skip ≥ 80% with at least one Complete)** counts.

### A "streak"

A run of consecutive consistent days. Tracked per-user, increments at end-of-day-local-time.

### Freezes

Days that don't break a streak even though they didn't meet the threshold.

- **Automatic freezes** — the user gets 1 freeze per week (max), automatically applied when needed. They never have to claim it. They are told it was used. Unused freezes do *not* roll over.
- **Diary-tagged freezes** — when a diary entry has tags `sick`, `pregnant`, `postpartum`, `big-life-event`, `travel`, OR `excludeFromAnalysis: true`, that day (and possibly the days around it) are treated as freezes regardless of the weekly cap.
- **Calendar freezes** — major holidays in the user's locale (Christmas Day, Thanksgiving in the US, Eid, Lunar New Year first day, etc.) are auto-freezes for everyone. Configurable in Settings.

> **Trade-off:** generous freezes mean a streak number isn't a strict consecutive-day count. We tell users this plainly: "21 days of consistency — with Vela's flexibility for sick days and travel." The streak is *real consistency,* which is the actual goal.

### Streak doesn't "break" — it ends

Vela never says *"You broke your streak"* or shows a sad mascot. When a streak ends:

- The number is preserved in the user's history as a "longest streak."
- The current count goes to 0.
- Copy on the user's next routine open: *"New rhythm starts today."* That's it.
- No mournful notification fires. No regret-bait.

---

## Types

```ts
// src/types/streak.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface StreakState {
  userId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  longestStreakEndedAt?: string;          // ISO date
  lastConsistentDate?: string;            // YYYY-MM-DD, last day that counted
  weeklyFreezesUsedThisWeek: number;      // resets every Monday local time
  totalConsistentDays: number;            // lifetime
  totalFreezesUsed: number;               // lifetime, for analytics
  startedAt: string;                      // when current streak started
  // Surface tone: when the user has just ended a streak,
  // we soften the surface for ~24h.
  recentlyEnded: boolean;
}

export interface StreakDayRecord {
  userId: string;
  date: string;                           // YYYY-MM-DD
  consistencyPct: number;                 // 0–100 (completed+skipped) / scheduled
  consistent: boolean;                    // did this day count?
  freezeApplied: 'none' | 'weekly-auto' | 'diary-tag' | 'holiday';
  freezeReason?: DiaryUserTag | 'holiday-name';
}

export interface StreakSurfacePreferences {
  // The user can dial down the prominence of streaks at any time.
  // We respect this fully — no nags.
  visibility: 'standard' | 'subtle' | 'hidden';
  showOnDashboard: boolean;
  notificationsEnabled: boolean;
  notificationTime: string;               // HH:MM local
}
```

### Schema additions

`streak_states` and `streak_day_records` tables in Supabase, mirroring the WatermelonDB local schema. Standard RLS rules.

```sql
create table public.streak_day_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  consistency_pct smallint not null,
  consistent boolean not null,
  freeze_applied text not null default 'none',
  freeze_reason text,
  primary key (user_id, date)
);

alter table public.streak_day_records enable row level security;
create policy "users own streak days" on public.streak_day_records
  for all using (auth.uid() = user_id);
```

`streak_state` is a single row per user, kept in `profiles` table as a column or separate table — at implementation, decide based on which simplifies caching. The local-first read path is the WatermelonDB row; Supabase is sync target only.

---

## End-of-day computation

Runs locally on the device at the user's local midnight (or when the app next foregrounds after midnight, whichever is first).

```ts
// Pseudocode
function computeEndOfDay(date: string, scheduledTasks: Task[], log: TaskLog[]) {
  const completed = log.filter(l => l.status === 'completed').length;
  const skipped = log.filter(l => l.status === 'skipped').length;
  const scheduled = scheduledTasks.length;

  // No tasks scheduled? No streak math today (rare; user might have customized).
  if (scheduled === 0) return { skipped: true };

  const engaged = completed + skipped;
  const consistencyPct = (engaged / scheduled) * 100;
  const allSkipped = skipped === scheduled;

  // Engagement floor: must complete at least one task.
  if (allSkipped || completed === 0) {
    return applyFreezeIfAvailable(date, consistencyPct);
  }

  if (consistencyPct >= 80) {
    return { consistent: true, consistencyPct, freezeApplied: 'none' };
  } else {
    return applyFreezeIfAvailable(date, consistencyPct);
  }
}

function applyFreezeIfAvailable(date: string, consistencyPct: number) {
  // Check diary tags first
  const diaryFreeze = checkDiaryFreezeFor(date);
  if (diaryFreeze) {
    return { consistent: true, consistencyPct, freezeApplied: 'diary-tag',
             freezeReason: diaryFreeze };
  }
  // Check holiday calendar
  const holidayFreeze = checkHolidayFreezeFor(date, userLocale);
  if (holidayFreeze) {
    return { consistent: true, consistencyPct, freezeApplied: 'holiday',
             freezeReason: holidayFreeze };
  }
  // Check weekly auto-freeze budget
  if (state.weeklyFreezesUsedThisWeek === 0) {
    return { consistent: true, consistencyPct, freezeApplied: 'weekly-auto' };
  }
  // No freeze available — streak ends.
  return { consistent: false, consistencyPct, freezeApplied: 'none' };
}
```

Updates `streak_states` and inserts a `streak_day_records` row.

---

## Visual treatment

The streak surface is among the most easily overdone in the genre. Specs are tight.

### The streak number on the dashboard

A small chip below the routine card on the home screen:

```
┌────────────────────────────────────────────────────────┐
│  Today's routine                                       │
│  [ task list ]                                         │
│                                                        │
│       ✿  21 days of consistency                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- **No flame icon.** A small soft mark — a single warm-pink dot, or a tiny serif glyph (like "·" with a soft glow ring). Never a flame, never a fire emoji, never a multiplier.
- **Number** in `headlineSerif` 22pt, espresso text.
- **Body word** (`days of consistency`) in body sans-serif, `text.secondary`.
- The chip has no background — just text on the cream surface. It does not call for attention.
- **Tap** → opens the streak detail sheet (see below).

### Streak detail sheet

Bottom sheet with calm, useful information:

> **21 days of consistency**
>
> *Started on April 16. Your longest yet.*
>
> ─────────────────
>
> *(small calendar heatmap of the past 30 days, cream squares filled in for consistent days, ghosted for freezes, blank for misses)*
>
> ─────────────────
>
> **What counts as consistent**
>
> A day where you completed most of your scheduled routine tasks. Vela gives you a freeze each week for the days life gets in the way — automatic, no need to claim it.
>
> **Used this week**
>
> One auto-freeze on Tuesday. *(or "None used.")*
>
> *[ Make streaks less prominent ]*

### When a streak ends

The home screen surface softens to acknowledge the day is reset, *without* mourning:

```
┌────────────────────────────────────────────────────────┐
│  Today's routine                                       │
│  [ task list ]                                         │
│                                                        │
│       New rhythm starts today.                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- No "Streak ended" banner.
- The chip just changes its body word: from *"X days of consistency"* to *"New rhythm starts today."*
- The previous longest streak is preserved in the streak detail sheet.
- After 24 hours, the chip switches to *"1 day"* if the user was consistent today.

### Streak count in Wrapped (canonical)

When Wrapped (file 38) shows the streak card, the count it shows is the **same number the dashboard chip shows** — i.e., consecutive consistent days INCLUDING freeze-applied days. The card's secondary line acknowledges any frozen days from the period:

> *"21 days of consistency."*
> *"Including 3 days paused for travel."* (only when freezes were applied; omitted otherwise)

This keeps the user-facing number consistent across surfaces. A user who sees "21" on the dashboard never sees "18" in Wrapped. Behind the scenes, Wrapped reads `currentStreakDays` from `StreakState` directly.

### Hidden-streak escape hatch (one-time reveal)

A user feeling pressured by streaks needs to know they can hide them. File 43's reveal calendar surfaces a one-time card on the day the user hits a 7-day streak:

> **Seven days in.**
>
> *"You've made this a habit. (And if streaks feel like pressure, you can hide them in Settings → Daily routine.)"*
>
> *[ Got it ]*

The card is shown once, dismissable forever. This surfaces the visibility toggle EARLY rather than letting users discover it only after feeling pressured for weeks.

### Visual milestones

When a user reaches a milestone (7, 14, 21, 30, 60, 90, 180, 365 days), the chip on the dashboard adds a small additional line for that day only:

> *21 days of consistency*
> *Three weeks. That's a habit.*

The second line vanishes the next day; we don't keep crowing.

There are no other reward animations. No confetti, no haptic celebration, no badge unlock screen. The acknowledgment is a sentence.

### Color & motion

- All streak surfaces use the existing palette. The "soft warm-pink dot" mark uses a single hue from `VelaPrimarySoft` (the lavender-pink stop).
- No animations on streak number changes. No counters that tick up. The number simply is what it is the next time the user looks.
- Reduce-motion-aware: the only animation in this surface is the streak detail sheet's standard sheet-presentation, which already respects reduce-motion globally.

---

## Notifications

### Daily routine reminder
Already exists in file 12. We do not change its content based on streak state. The notification is *not* "Don't break your streak today!" — that's the dark pattern we refuse to ship.

### Streak-aware nudge (opt-in)

A new notification kind: `streak-quiet-nudge`.

- Default: opt-in via Settings → *Daily routine* → *Gentle daily nudge*. **Default off.**
- Time: user's chosen reminder time (defaults to 8pm local) or routine's evening task time.
- Logic: only fires when:
  - user has done <50% of today's tasks, AND
  - the user is on a current streak ≥ 3 days, AND
  - it's been ≥ 4 hours since the user last opened the app.
- Copy: *"A few minutes for tonight's routine, if it fits."* — never *"Don't break your 21-day streak!"*
- Stops auto-firing after 3 consecutive ignores per week (we infer it isn't helping).

### Milestone notifications
- 7-day, 14-day, 21-day, 30-day, 60-day, 90-day, 180-day, 365-day milestones each fire a single notification on the morning *after* the milestone is reached.
- Copy: *"You showed up for three weeks straight. Worth saying out loud."* (ish)
- Each milestone has a different copy line, AI-generated within the brand-voice prompt.
- After 365 days, milestones become annual on the streak-anniversary date.

---

## Where streaks surface

- **Dashboard chip** (described above).
- **Routine screen** (file 09): a small *"Day 21"* badge in the top-right of the daily routine card while a streak is active.
- **Monthly Wrapped** (file 38): the streak card.
- **History tab**: under each calendar day's expanded sheet, the consistency status: ✓ consistent, ↺ freeze (with reason), · missed.
- **Settings → Daily routine**: a section that lets the user adjust streak surface visibility.

Streaks **never** appear in:
- Notifications other than the explicitly opt-in ones above.
- Onboarding (we don't show off the feature before the user has earned anything).
- The paywall (we don't use streaks as conversion pressure).
- Comparison views (the work happens between scans; streaks are routine-level).

---

## User control over streak prominence

Settings → *Daily routine* → *Streak visibility*:

- **Standard** *(default)* — chip on dashboard, badge on routine card, milestones surface.
- **Subtle** — streak still tracked, only visible in the streak detail sheet (not on dashboard).
- **Hidden** — streak not surfaced anywhere; still tracked silently for Wrapped.

Switching to Subtle or Hidden is honored immediately and persists across devices. We never re-prompt the user to turn it back on.

---

## Edge cases

- **User changes their routine mid-streak** — the new routine's task count is used for today's consistency math. Yesterday's days are not re-evaluated.
- **User's routine has 1 task only** — 80% threshold on 1 task = must complete that task to count. The math still works.
- **User's first day** — if today is the user's first day with a routine, no streak surface appears. The chip starts showing on the first consistent day.
- **User signs up with backdated diary or treatment data** — streaks are not retroactively calculated from periods before the user's first scan.
- **User installs on a new device after a long pause** — `lastConsistentDate` is many weeks ago. The current streak is set to 0; the longest-ever streak is preserved. They start fresh today, which is what feels honest.
- **Time zone change** — if the user travels and crosses a date line, the local-midnight computation still runs once per local day. We don't double-count or skip; the calendar follows local clock.
- **Daylight saving time transitions** — handled by treating "midnight local" as the device's `Date` boundary; the spring-forward / fall-back day is computed normally.
- **User completes 100% of tasks but does so at 1am the next morning** — counts toward yesterday if completed before 3am local (we extend the "day" to 3am to forgive late-night users). After 3am, counts toward today.
- **User adds a task to today after midnight** — recompute today's consistency on each task add/complete; the day is "live" until midnight closes it.
- **No tasks scheduled today** (e.g., a Sunday rest day in the user's routine) — the day doesn't count for or against the streak; it's invisible to the math. The streak continues to the next scheduled day.
- **User pauses subscription** — streak is preserved but not advanced (the routine surface is hidden during paywall). Resuming continues from where they left off, with the gap counted as a long auto-freeze. Copy on resume: *"Welcome back. Your 21-day streak is still here."*
- **Account deletion** — all streak data is cascaded.
- **Diary tag retroactively added to today** — if a user adds a `sick` tag at 11pm for today, today's freeze is recomputed at end-of-day to use the diary-tag freeze rather than the weekly-auto freeze. Diary-tag freezes don't consume the weekly budget.

---

## Anti-dark-pattern checklist

This feature must pass every line of this checklist before launch. Failing any line means the feature is not Vela.

- [ ] No flame, fire, or red color anywhere in the streak surface
- [ ] No use of words: "Don't break", "lost", "destroyed", "ruined", "fight", "battle"
- [ ] No countdown timer for "today's deadline"
- [ ] No mascot reaction to streak loss (sad face, drooping figure, etc.)
- [ ] No notification that fires *because* the user might break their streak today, except the explicitly opt-in default-off "gentle daily nudge"
- [ ] Streak loss UI says "New rhythm starts today" — verified across all surfaces
- [ ] Freezes are automatic; the user never has to "claim" or "buy" one
- [ ] No gamification metagame (XP, levels, badges to unlock)
- [ ] No leaderboard or social comparison
- [ ] User can disable streak prominence in two taps and is never re-prompted
- [ ] Brand voice review: every streak-related string has been read aloud, contains no exclamation marks, no urgency

---

## Accessibility

- The streak chip on the dashboard has VoiceOver label: *"Streak: 21 days of consistency. Double-tap to see details."*
- Calendar heatmap uses both color and shape variation (cream-filled vs. cream-outlined vs. blank) so it's perceivable in colorblind and high-contrast modes.
- All streak copy respects Dynamic Type up to XXXL.
- Reduce-motion: streak surface has no motion to begin with, so this is automatic.

---

## Settings

In Settings → *Daily routine*:

- **Show streaks on dashboard** — Standard / Subtle / Hidden (default Standard).
- **Daily nudge** — toggle (default off), with time picker.
- **Holiday auto-freezes** — toggle (default on); footnote explains: *"Vela auto-freezes streaks on major holidays in your region so you don't have to."*

---

## Analytics

| Event | Properties |
|---|---|
| `streak_day_consistent` | `streak_length, consistency_pct_bucket: '80-89'|'90-99'|'100', completed_count, skipped_count` |
| `streak_freeze_applied` | `streak_length, freeze_kind: 'weekly-auto'|'diary-tag'|'holiday'` |
| `streak_ended` | `length_at_end, was_longest: bool` |
| `streak_milestone_reached` | `length: 7|14|21|30|60|90|180|365|annual` |
| `streak_detail_sheet_opened` | `current_length` |
| `streak_visibility_changed` | `from, to` |
| `streak_quiet_nudge_shown` | `current_streak_length, hours_since_last_open` |
| `streak_quiet_nudge_followed` | `current_streak_length` |
| `streak_quiet_nudge_auto_disabled` | `consecutive_ignores: 3` |

PII rule: never log task body, task names, or specific routine content.

---

## Pre-launch checklist

- [ ] Anti-dark-pattern checklist (above) all items passed
- [ ] End-of-day computation tested across timezones (NZ, EU, US, Hawaii)
- [ ] DST transition tested in dev (clock manipulation, both directions)
- [ ] 80% threshold logic verified across routine sizes (1, 3, 5, 8 tasks)
- [ ] Weekly freeze budget resets on Monday local time, verified
- [ ] Diary-tagged freeze fires correctly without consuming weekly budget
- [ ] Holiday freeze list curated for major holidays in: US, UK, EU, IN, BR, JP, MX, CN
- [ ] Holiday list is locale-driven, configurable in Settings
- [ ] Streak ends gracefully: copy "New rhythm starts today" verified across all surfaces
- [ ] Longest-streak preservation verified across multiple end events
- [ ] Subscription pause + resume: streak preserved with auto-freeze gap
- [ ] Standard / Subtle / Hidden visibility states all working immediately
- [ ] Daily nudge default off; opt-in flow verified
- [ ] Streak quiet nudge auto-disables after 3 consecutive ignores per week
- [ ] All streak copy reviewed for: no flames, no urgency, no exclamation marks, no comparison to other users
- [ ] Calendar heatmap renders correctly in light + dark mode
- [ ] VoiceOver review of dashboard chip and streak detail sheet
- [ ] Account deletion cascades streak_states and streak_day_records
- [ ] Wrapped (file 38) reads streak data correctly
- [ ] Maestro flow: complete routine for 7 days → 7-day milestone notification fires the next morning
- [ ] Maestro flow: skip a day with no diary tag → freeze applied → streak preserved
- [ ] Maestro flow: skip 2 days in same week → second day ends streak gracefully
- [ ] Persona check: Marcus (skips often) doesn't churn from streak shame; Maya (consistent) feels acknowledged; Priya (treatment-focused) sees streak as supporting, not centering, her treatment journey
