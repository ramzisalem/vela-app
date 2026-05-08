# 42 — iOS Surface Integration & Scan Anchoring

## Why this exists

The single biggest determinant of long-term retention in subscription apps is *incidental engagement* — moments the app is in the user's awareness without them having to consciously open it. The user who glances at their streak count from the lock screen each morning, sees their score next to their resting heart rate in Apple Health, and gets a tap on the wrist on Sunday morning is materially less likely to churn than the user who has to remember Vela exists.

This file specifies five iOS-native surfaces that put Vela into the user's environment without putting it in their face:

1. **Scan anchoring** — during onboarding, the user binds their weekly scan to an existing life moment (Sunday coffee, Friday workout, etc.).
2. **Widgets** — Small / Medium / Large home-screen widgets showing the most useful at-a-glance data.
3. **Lock Screen complications** — the iOS 16+ lock screen, where the streak count + a single accent live alongside the clock.
4. **Apple Health Vital registration** — Vela's overall score appears in the user's iOS Health app summary alongside sleep and HRV.
5. **Apple Watch companion** — a light watchOS app: glanceable score, complication, single-tap routine task complete, scan reminders.

A sixth surface — **Siri Shortcuts** — is included because it's nearly free to build and pays off for power users who automate their routines.

These features compound. A user with a widget + a Vital + a watch complication has Vela in three places they look at daily; the cost of churning becomes higher than the cost of staying.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `07_ONBOARDING.md`, `09_ROUTINE.md`, `10_DASHBOARD.md`, `12_NOTIFICATIONS.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `15_DESIGN_SYSTEM.md`, `25_ANALYTICS.md`, `28_ACCESSIBILITY.md`, `30_DEEP_LINKING.md`, and `33_HEALTHKIT.md`.

---

## Product principles

1. **Glanceable, never demanding.** Every surface here is read-only or single-tap. No navigation trees on a watch face, no scrolling on a widget.
2. **Quiet always.** Lock screen real estate is intimate; the brand voice rules tighten one notch on every iOS surface.
3. **Privacy-by-surface.** The lock screen is visible to anyone holding the phone; the watch is visible mid-conversation. We surface the *least* identifying useful data each surface allows.
4. **Optional always.** Every iOS surface is opt-in by user action (adding a widget, enabling a complication). We don't auto-enroll and we don't nag.
5. **One-day install latency from app to surface.** A user who pays today should be able to install a widget today and have data flowing tonight.

---

## 1. Scan anchoring

The structural retention problem with weekly scans: there's no obvious natural cadence. Without a fixed life-moment anchor, users scan at random times, miss weeks, and quietly drift off. The fix is to bind the scan to an *existing* habit during onboarding.

### When asked

A new optional onboarding screen between the existing post-baseline reveal and the paywall (file 07 placement, threaded with file 40's preview cards).

### The screen

```
┌─────────────────────────────────────────┐
│                                         │
│   When does your week tend              │
│   to slow down?                         │
│                                         │
│   We'll bring you back for your next    │
│   scan around then. You can change      │
│   this anytime.                         │
│                                         │
│   ╭──────────────────────────────────╮  │
│   │  ☕  Sunday coffee               │  │
│   ├──────────────────────────────────┤  │
│   │  🌙  Sunday before bed           │  │
│   ├──────────────────────────────────┤  │
│   │  🧖  Friday wind-down            │  │
│   ├──────────────────────────────────┤  │
│   │  🌅  Monday morning fresh start  │  │
│   ├──────────────────────────────────┤  │
│   │  ✿  Custom                       │  │
│   ├──────────────────────────────────┤  │
│   │  No anchor — just remind me      │  │
│   ╰──────────────────────────────────╯  │
│                                         │
└─────────────────────────────────────────┘
```

Emojis on this single screen are an exception to the brand's no-emoji rule (file 21) — they're soft, recognizable life-moment cues, and the screen is dense enough that the visual weight earns them. Approved exception, no others.

### The data captured

```ts
// src/types/anchor.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface ScanAnchor {
  userId: string;
  // The semantic anchor type — drives the copy, not just the time.
  kind: 'sunday-coffee' | 'sunday-bed' | 'friday-wind-down'
      | 'monday-fresh' | 'custom' | 'none';
  // For custom anchors, the user's free-text label.
  customLabel?: string;             // ≤32 chars, sanitized
  // Day of week (1=Sun ... 7=Sat) and time, both required if kind !== 'none'.
  dayOfWeek?: number;
  hour?: number;
  minute?: number;
  // Whether to send the anchor-bound notification.
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### How the anchor is used

1. **Notification copy** — every weekly scan notification (file 12) is now anchor-aware:
   - `sunday-coffee`: *"Sunday coffee scan — when you're ready."*
   - `sunday-bed`: *"Tonight, before bed. We'll be here."*
   - `friday-wind-down`: *"Friday night, no rush."*
   - `monday-fresh`: *"Monday morning fresh start — your scan window is open."*
   - `custom` (label = "after gym"): *"After gym scan, when you have a sec."*
   - `none`: existing default copy — *"Time for your weekly scan."*
2. **Reminder cadence** — the notification fires at the anchor's day+time. If the user hasn't scanned within 4 hours of the anchor, a soft follow-up: *"Coffee can wait or so can the scan — both are here."* If they don't scan that day, no further nags this week.
3. **Routine streak interaction (file 39)** — anchor day determines when the *weekly* routine summary fires (the daily streak doesn't change).
4. **Wrapped & long-term retention** — the user's chosen anchor is referenced in their Monthly Wrapped and anniversary cards: *"55 Sunday coffees scanned. That's over a year of consistency."*
5. **Settings** — Settings → *Daily routine* → *Scan anchor* lets the user change anytime. Changes take effect at the next anchor cycle.

### Edge cases

- **User picks `none`** — anchor-aware copy is suppressed; standard reminder behavior. They can change later.
- **User changes anchor mid-week** — current week's reminder honors the old anchor; next cycle uses the new one. We never reschedule a notification mid-week to avoid surprise.
- **Travel / DST** — anchor is in the device's local time zone; if the user crosses zones, the next reminder fires at the same local clock time at the new zone. DST shifts are handled by the underlying date library.
- **Custom anchor with profanity** — the custom label is sanitized client-side via a basic word filter. Off-color but not profane labels are allowed (this is the user's private app).

---

## 2. Home Screen Widgets

Vela ships three widget sizes, each with a clear role.

### Widget S (Small) — Today

```
┌──────────────────────┐
│                      │
│   ✿  21 days         │
│                      │
│   Today: 4 of 5      │
│   tasks complete     │
│                      │
└──────────────────────┘
```

- Streak count (large, serif).
- Today's routine progress (small).
- Tap → opens the routine screen.
- Cream surface in light mode, espresso surface in dark mode.

### Widget M (Medium) — At a glance

```
┌────────────────────────────────────────┐
│   Vela                                 │
│                                        │
│   ✿  21 days     Score: 72             │
│                                        │
│   Sunday coffee scan in 2 days.        │
│                                        │
└────────────────────────────────────────┘
```

- Streak + latest overall score.
- Anchor-aware "next scan in N days" countdown (uses the user's chosen anchor).
- Tap → opens the dashboard.

### Widget L (Large) — Trend

```
┌────────────────────────────────────────────────┐
│   Vela              Sunday coffee scan tomorrow│
│                                                │
│   Score: 72                                    │
│                                                │
│   ╱╲                                           │
│  ╱  ╲      ╱╲     ___                          │
│ ╱    ╲___╱  ╲___╱                              │
│                                                │
│   ✿  21-day streak · 3 of 5 today              │
│                                                │
└────────────────────────────────────────────────┘
```

- Mini trend chart of the last 8 weeks.
- Streak + today's task progress.
- Tap any region → deep-links to the relevant section (chart → trend, streak → routine, etc.).

### Implementation

- Native via `WidgetKit` and Swift, served data through an App Group container shared between the main Expo app and the widget extension.
- The Expo app writes the latest snapshot to the App Group on every dashboard render and on every routine task completion.
- Widget Timeline refreshes every 30 minutes, plus on-demand whenever the host app writes new data.
- **Force-refresh on entitlement change.** When `Purchases.customerInfoUpdate` fires (subscription started, trial extended, lapsed, resumed), the host app immediately writes the new state to the App Group AND calls `WidgetCenter.shared.reloadTimelines(ofKind:)` so widgets re-render within seconds. Without this, a user who extends their trial sees "trial ends tomorrow" on the lock screen for hours after extension was granted. This is required.
- All widgets respect light + dark mode automatically via SwiftUI's `Color` system mapped to Vela tokens.

### What widgets DO NOT show

- The user's photo or any face image. Widgets are visible to anyone glancing at the user's home screen.
- Treatment names. *"Tretinoin · week 6"* on the home screen is a privacy ask we don't make.
- AI insights. Patterns are personal and live in-app.
- Cycle phase (file 33). Stays inside the app.

### Widget privacy summary

Widgets show: streak count, overall score, scan-anchor countdown, today's task progress as a count, mini trend chart. That's it.

### Edge cases

- **User has no scans yet** — widget shows: *"Your baseline is the start. Scan when ready."* and a single ✿ accent.
- **User has paused subscription** — widget grays out the score and trend; streak still shows. Tap → opens the paywall.
- **Widget removed by user** — no in-app prompt to re-add. We respect the choice.

---

## 3. Lock Screen Complications (iOS 16+)

The lock screen is the most intimate surface in the OS. Vela uses it conservatively: a single rectangular complication and a single circular complication, chosen by the user from the lock screen editor.

### Rectangular complication

```
┌──────────────────────────┐
│ ✿  21-day streak         │
│ Sunday scan in 2 days    │
└──────────────────────────┘
```

- Streak + anchor countdown.
- Cream-on-system-background, respects iOS lock screen tint.
- No score number on the lock screen — that's privacy-leaning.

### Circular complication

```
   ╭───────╮
   │       │
   │  ✿21  │
   │       │
   ╰───────╯
```

- Streak count only.
- Single soft pink/mauve accent.

### Implementation

Same `WidgetKit` extension as home-screen widgets, with `accessoryRectangular` and `accessoryCircular` families.

### Edge cases

- **Streak ended overnight** — the circular complication shows ✿0; the rectangular shows: *"New rhythm starts today."* (Same copy as in-app per file 39.)
- **User on iOS 15 or below** — complications are unavailable; widgets work via traditional widget API.

---

## 4. Apple Health Vital registration

The Apple Health app on iOS shows a prioritized "Vitals" summary at the top of the user's Health Browse screen — sleep, heart rate, steps, etc. iOS allows registered third-party apps to write a custom score that shows up in this list.

### What we register

A single `HKQuantityType` for *"Vela Score"* — the user's overall daily face score. Written via:

```swift
// Vela writes its own metric type to HealthKit
let velaScore = HKQuantityType.quantityType(
    forIdentifier: HKQuantityTypeIdentifier(rawValue: "com.getvela.faceScore")
)!
let sample = HKQuantitySample(
    type: velaScore,
    quantity: HKQuantity(unit: .count(), doubleValue: 72),
    start: scanDate, end: scanDate
)
healthStore.save(sample) { ... }
```

Apple Health doesn't surface custom quantity types in the Browse screen at the top tier — that requires Apple-defined types only. But it does surface them in the user's complete metric list, and *third-party apps can read them* (which means HealthKit-based companion apps and other trackers can read Vela's score).

### Why this matters

- **Discoverability** — users who enabled HealthKit permissions see Vela's score in their Health timeline alongside everything else, making Vela feel native to their health stack.
- **Causation** — having a Vela score in HealthKit means the user can manually correlate it against other Health data via Apple's own tooling, regardless of Vela's in-app correlation engine.
- **Stickiness** — uninstalling Vela leaves a Health.app gap the user notices.

### Privacy

- We write to Apple Health only with the user's explicit `HKHealthStore.requestAuthorization(toShare:)` permission, asked the first time we have a score to write (post-first-scan).
- We never write the user's photo, sub-scores, or treatment data to HealthKit.
- The user can revoke at any time via iOS Settings → Privacy → Health → Vela.
- **Life-stage modes are NEVER written to Apple Health.** A user in pregnancy or cancer-recovery mode has those modes stored entirely within Vela. Only the numeric `com.getvela.faceScore` is shared with HealthKit; the mode that may explain a low score is private to Vela. This is per file 48's privacy floor for sensitive modes — anyone who can read the user's HealthKit data (family physician, integrated apps) sees the score, never the explanation.

### Permission flow

The first time the user has a calculated overall score, we ask:

> **A small ask**
>
> Want your Vela score to live alongside your sleep and heart rate in Apple Health? It's just a number, written once a week. You can revoke this anytime.
>
> *[ Add to Health ]   [ Not now ]*

"Not now" is final — no future ask. If the user wants to enable later, Settings → *iOS surfaces* → *Apple Health Vital* lets them.

### Edge cases

- **User hasn't enabled HealthKit at all** — the permission ask combines this and file 33's HealthKit read permission into one ask, but ONLY at the post-first-scan moment. Users who opted out of HealthKit reads in file 33's flow still see this ask once.
- **HealthKit write fails** — log to Sentry (PII-stripped), retry on next scan. Don't surface a user-visible error.

---

## 5. Apple Watch companion app

A light, glanceable watchOS app. Not a full replica of the iPhone app — a focused subset that respects the watch's role as a wrist surface, not a phone.

### What the watch app does

1. **Glance face** — overall score + streak count, single screen.
2. **Routine quick-complete** — tap a task name on the watch to mark it complete in the routine. Confirmation is a soft haptic, no sound.
3. **Scan reminder** — when the user's anchored scan time arrives, the watch taps with the configured anchor copy.
4. **Streak milestone notifications** — tap on the wrist when a streak milestone is reached (file 39 already handles the iPhone notification; watch shows it on the wrist when the iPhone is locked).
5. **Quick view of latest "Patterns we noticed"** — a single insights card from file 33, tappable to read in full.

### What the watch app does NOT do

- Capture scans (the watch can't see the user's face).
- Show photos.
- Display the full routine screen with all its detail.
- Offer paywall flows.
- Handle treatment timeline data.
- Show diary entries (encrypted, intimate, not a watch surface).

### Watch face complications

- `complicationFamilyCircularSmall`: streak count.
- `complicationFamilyModularLarge`: streak + score + next-scan countdown.
- `complicationFamilyGraphicCorner`: streak only.

Users who add a complication get the on-wrist visibility of streak/score; users who don't still get the apps's own face for opens via Siri or app switcher.

### Notifications

Wrist-notifications are a subset of the iPhone's:

- Daily routine reminders → wrist (only if iPhone is locked or user has watch wrist-only routing).
- Scan-anchor reminders → wrist.
- Streak milestone moments → wrist.
- Wrapped is iPhone-only (the surface is not glanceable).

### Implementation

A separate watchOS target in the Xcode project, sharing data via App Groups. Built in SwiftUI; communicates with the iPhone app via `WCSession` for routine task completions (which need to round-trip back to the device's WatermelonDB).

### Privacy

- The watch never displays the user's photo.
- The watch never displays diary content.
- The watch never displays treatment names.
- Streak, score, today's routine task list (titles only), and scan anchor copy are all the watch sees.

### Edge cases

- **iPhone is offline** — watch app uses last-cached data; routine task completions queue locally and sync on next iPhone reconnection.
- **User has only Apple Watch SE (no AOD)** — complications still work; battery consideration is the user's choice.
- **User has multiple paired watches** — both receive complications; routine task completion on either updates the same single source of truth.

---

## 6. Siri Shortcuts

The smallest of the iOS surface integrations and the cheapest to build. Vela exposes three Siri-actionable shortcuts:

### `Log my routine for today`

- Voice: *"Hey Siri, log my routine in Vela."*
- Action: marks every scheduled task for the day as Complete. Same effect as tapping each one in the app.
- Confirmation: Siri responds: *"Logged. ✿ 22 days of consistency."*
- Risk: a careless command marks tasks complete that weren't actually done. Mitigation: the shortcut requires confirmation by default ("Log all 5 tasks?") which the user can disable in Settings.

### `Add a note to Vela`

- Voice: *"Hey Siri, add a note to Vela: slept poorly last night."*
- Action: creates a diary entry attached to today, marked `source: 'voice'`.
- Confirmation: *"Saved."*

### `What's my Vela score?`

- Voice: *"Hey Siri, what's my Vela score?"*
- Action: Siri reads the user's most recent overall score with its delta: *"Your score is 72, up two from last week."*
- Privacy consideration: Siri may speak this through HomePods or CarPlay. The user gets a one-time setup screen warning when enabling: *"Siri may say this out loud — disable if you'd prefer privacy."*

### Implementation

`AppIntents` framework (iOS 16+). Three intents, exposed at app launch via `AppShortcutsProvider`. Configurable in Settings → *iOS surfaces* → *Siri shortcuts*.

### Edge cases

- **Multiple devices** — Siri intents fire on the device they were invoked on; data sync via the standard backend.
- **Siri is disabled** — shortcuts still work via the iOS Shortcuts app for manual automation.
- **HomePod / CarPlay** — voice-confirmation suppresses the score-reading shortcut by default; only "Log my routine" works fully voice-only.

---

## Settings

A new section: **Settings → iOS surfaces**.

```
iOS surfaces

  Scan anchor
  Sunday coffee · Sunday at 9:00 AM     >

  Widgets
  Showing on Home Screen                >

  Lock Screen complications
  Rectangular complication active       >

  Apple Health Vital
  Connected — score writes weekly       >

  Apple Watch companion
  Installed                             >

  Siri shortcuts
  3 available                           >
```

Each row deep-links to the relevant configuration screen. Status text is honest about what's currently active.

---

## What surfaces show, by privacy axis

| Surface | Streak | Score | Photo | Routine tasks | Diary | Treatment names |
|---|---|---|---|---|---|---|
| Widget S | ✓ | — | — | task count only | — | — |
| Widget M | ✓ | ✓ | — | — | — | — |
| Widget L | ✓ | ✓ | — | task count only | — | — |
| Lock Screen rect | ✓ | — | — | — | — | — |
| Lock Screen circle | ✓ | — | — | — | — | — |
| Apple Health | — | ✓ (numeric) | — | — | — | — |
| Watch face | ✓ | ✓ | — | — | — | — |
| Watch app | ✓ | ✓ | — | task titles | — | — |
| Siri (audio) | — | ✓ (spoken) | — | task counts (spoken) | added to | — |

The principle: the more public the surface, the less identifying the data.

---

## Drip-feed introduction

We don't promote all six surfaces at once. The introduction follows the drip-feed reveal cadence (file 43):

- **Day 0–7**: scan anchor (during onboarding).
- **Week 2**: Apple Health Vital permission ask after second scan.
- **Week 4**: a passive in-app card: *"You can put Vela on your Home Screen now."* with a one-tap link to widget instructions.
- **Week 6**: Lock Screen complication card (if user has iOS 16+).
- **Week 8**: Apple Watch companion card (if user has a paired watch detected via `WCSession`).
- **Week 10**: Siri shortcuts card.

Users who never engage with the cards never see them again after the first dismissal. We don't pester.

---

## Analytics

| Event | Properties | Notes |
|---|---|---|
| `scan_anchor_set` | `kind, day_of_week, hour_bucket: 'morning'|'afternoon'|'evening'|'night'` | Never log custom label |
| `scan_anchor_changed` | `from_kind, to_kind` | |
| `widget_installed` | `size: 'small'|'medium'|'large'` | Detected via container ping; first detection only |
| `widget_uninstalled` | `size` | |
| `widget_tapped` | `size, region: 'streak'|'score'|'chart'|'general'` | Deep-link tracking |
| `lockscreen_complication_added` | `family: 'rectangular'|'circular'` | |
| `lockscreen_complication_removed` | `family` | |
| `lockscreen_complication_tapped` | `family` | |
| `apple_health_vital_permission_shown` | none | |
| `apple_health_vital_permission_granted` | none | |
| `apple_health_vital_permission_denied` | none | |
| `apple_health_vital_score_written` | none | Server-side count, no values |
| `watch_app_installed` | none | First detection via `WCSession` |
| `watch_complication_added` | `family` | |
| `watch_routine_task_completed` | `task_count_today` | |
| `siri_shortcut_invoked` | `intent: 'log-routine'|'add-note'|'score-query'` | |
| `siri_shortcut_confirmation_disabled` | `intent` | |

PII rule: never log scan-anchor custom labels, watch task titles, or Siri voice transcripts.

---

## Pre-launch checklist

- [ ] Scan anchor captured in onboarding for ≥80% of new users (target)
- [ ] Anchor-aware notification copy verified for every kind including custom
- [ ] Anchor change in Settings takes effect at next cycle, not mid-week
- [ ] DST + timezone change handled on anchor cadence (clock manipulation test)
- [ ] App Group container shared between Expo app and Widget Extension verified
- [ ] Widget data writes happen on every dashboard render and routine task completion
- [ ] Widget Timeline refreshes every 30 minutes
- [ ] Three widget sizes render correctly in light + dark mode
- [ ] Lock Screen rectangular and circular complications render on iOS 16+
- [ ] No widget surface displays user photo, treatment names, or diary content
- [ ] Apple Health Vital permission ask fires exactly once, post-first-scan
- [ ] HealthKit `com.getvela.faceScore` quantity type registered correctly
- [ ] HealthKit write happens on every weekly scan
- [ ] HealthKit revoke handled gracefully (next write silently fails, no user-visible error)
- [ ] Apple Watch companion installable from iPhone app
- [ ] Watch app shows score, streak, today's task list (titles only), insights card
- [ ] Watch routine task completion round-trips to iPhone WatermelonDB via `WCSession`
- [ ] Watch never displays photo, diary, or treatment names
- [ ] Three watch complication families render correctly
- [ ] Siri shortcuts: all three intents work via voice
- [ ] Siri shortcuts confirmation default ON for log-routine
- [ ] Siri score-query opt-out from CarPlay/HomePod (one-time setup ask)
- [ ] Drip-feed introduction cadence verified (week 2/4/6/8/10 cards fire correctly)
- [ ] Cards dismiss permanently when user engages or dismisses
- [ ] Settings → iOS surfaces section reachable from canonical Settings nav (file 14)
- [ ] All status strings on Settings rows reflect current state accurately
- [ ] PostHog events scrub all custom labels and free-text content
- [ ] Sentry breadcrumbs scrub HealthKit write payloads
- [ ] VoiceOver: scan anchor screen reads choices clearly
- [ ] VoiceOver: widget content readable via Apple's standard widget VoiceOver layer
- [ ] VoiceOver: Watch app navigable
- [ ] Brand voice review: every notification + Siri response read aloud, no exclamation marks
- [ ] Persona check: each persona walked through full setup of all six surfaces
- [ ] Maestro flow: full onboarding → anchor pick → first scan → widget install via week-4 card
