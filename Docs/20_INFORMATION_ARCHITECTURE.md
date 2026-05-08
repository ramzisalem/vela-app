# 20 — Information Architecture

## Overview
The complete sitemap, navigation hierarchy, and screen inventory for Vela. Every screen is documented here. If a screen exists, it's in this file. If it's not in this file, it doesn't exist (yet).

---

## Top-Level App States

The app exists in one of these states at any time:

```
┌─────────────────────────────────────────────────────────┐
│                       APP STATES                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  unauthenticated  → /(auth)                             │
│  onboarding       → /(onboarding)                       │
│  unsubscribed     → /paywall (after baseline)           │
│  expired          → /paywall (with returning copy)       │
│  active           → /(main) tabs                         │
│  capture_active   → /(capture) modal                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

State resolution happens in `app/_layout.tsx` based on:
- Auth state (Supabase session present?)
- Onboarding state (profile complete?)
- Subscription state (active entitlement?)

---

## Sitemap (Full Hierarchy)

```
/
├── (auth)/
│   ├── welcome              [unauthenticated entry — returning users only]
│   ├── sign-in              [Apple/email auth — returning users]
│   └── sign-up              [not used for new users — see onboarding/create-account]
│
├── (onboarding)/
│   ├── welcome              [first-time hello]
│   ├── section-a            [Q1-6: About You]
│   ├── micro-payoff-a       [AI transition 1]
│   ├── section-b            [Q7-14: Face & Skin]
│   ├── micro-payoff-b       [AI transition 2]
│   ├── section-c            [Q15-19: Goals]
│   ├── micro-payoff-c       [AI transition 3]
│   ├── section-d            [Q20-26: Current Routine]
│   ├── micro-payoff-d       [AI transition 4]
│   ├── section-e            [Q27-30: Lifestyle]
│   ├── permissions          [camera + notifs]
│   │
│   │   ↓ capture + reveal happen here (file 05)
│   │
│   └── create-account       [email + password — AFTER paywall, not before]
│
├── paywall                  [hard paywall after baseline reveal, pre-auth]
│
├── (capture)/
│   ├── pre-capture          [explainer before scan]
│   ├── capture              [the AR camera flow]
│   ├── review               [photo review/retake]
│   ├── processing           [loading while AI computes]
│   └── reveal               [score reveal animation]
│
├── (main)/                  [tab bar visible]
│   ├── dashboard            [TAB 1: home]
│   ├── compare              [TAB 2: comparisons]
│   ├── history              [TAB 3: timeline]
│   ├── routine              [TAB 4: today's routine]
│   └── settings             [TAB 5: settings]
│
├── (modal)/                 [presented modally]
│   ├── share-comparison     [share card preview]
│   ├── routine-detail/[id]  [single task detail]
│   ├── session-detail/[id]  [single session detail]
│   ├── notification-prefs   [notification settings]
│   └── theme-prefs          [light/dark/system]
│
└── (system)/
    ├── error                [global error fallback]
    ├── offline              [no internet state]
    └── update-required      [forced update prompt]
```

---

## Tab Bar Configuration

The main app uses a 5-tab bar.

| Tab | Label | Icon (Ionicons) | Route | Always shown? |
|-----|-------|-----------------|-------|---------------|
| 1 | Home | `trending-up` | `/dashboard` | Yes |
| 2 | Compare | `git-compare` | `/compare` | Yes |
| 3 | History | `time` | `/history` | Yes |
| 4 | Routine | `list` | `/routine` | Yes |
| 5 | Settings | `settings` | `/settings` | Yes |

### Tab Order Rationale

1. **Home (Dashboard)** — Most-visited screen. Always primary.
2. **Compare** — The "wow" feature. Should be discoverable.
3. **History** — Power-user feature. Mid-priority.
4. **Routine** — Routine is also on Home, but a dedicated tab gives focus.
5. **Settings** — Conventionally last position.

### Why Not Hide Compare/History on Day 1?

Some apps hide tabs when content isn't yet meaningful. Vela does NOT do this:
- All 5 tabs always visible
- Compare and History show empty states explaining the value when content is sparse
- This sets expectations and shows the user what's coming

---

## Screen Inventory (Detailed)

### Authentication Screens

#### `/(auth)/welcome`
- **Purpose:** First impression for unauthenticated users
- **Content:** Wordmark, hero copy, "Get started" CTA
- **Exits to:** `/(auth)/sign-in` or `/(auth)/sign-up`
- **Design notes:** Calm, confident, low friction

#### `/(auth)/sign-in`
- **Purpose:** Returning user authentication
- **Content:** Sign in with Apple (primary), email/password (secondary)
- **Exits to:** Either `/(onboarding)` (if profile incomplete) or `/(main)/dashboard`

#### `/(auth)/sign-up`
- **Purpose:** New email/password account
- **Content:** Email, password, basic terms acceptance
- **Exits to:** `/(onboarding)/welcome`

---

### Onboarding Screens

(All onboarding screens documented in detail in file 07.)

Each section advances linearly. No skipping. Progress bar always visible.

| Screen | Questions | Drop-off risk |
|--------|-----------|---------------|
| welcome | 0 | Low |
| section-a | 1-6 | Low |
| micro-payoff-a | 0 | Critical moment |
| section-b | 7-14 | Medium |
| micro-payoff-b | 0 | Critical moment |
| section-c | 15-19 | High (budget question) |
| micro-payoff-c | 0 | Critical moment |
| section-d | 20-26 | High (fatigue) |
| micro-payoff-d | 0 | Critical moment |
| section-e | 27-30 | Medium |
| permissions | 0 | Medium (camera ask) |

---

### Capture Flow Screens

(All capture screens documented in detail in file 05.)

These screens are presented as a **full-screen modal flow** outside the tab bar.

| Screen | Time on screen | Purpose |
|--------|----------------|---------|
| pre-capture | 5-10 sec | Explainer + permission check |
| capture | 30-90 sec | AR flow, three angles |
| review | 10-30 sec | Photo review per angle |
| processing | 3-8 sec | AI computation |
| reveal | 5-15 sec | Score reveal animation |

**Exit behavior:** Once started, capture flow can be abandoned. Aborted captures don't save scores.

---

### Main App Screens (Tab 1: Home/Dashboard)

#### `/(main)/dashboard`
- **Purpose:** Daily home base. Shows latest score, trends, upcoming check-in, today's routine.
- **Sections (in order):**
  1. Greeting + brand wordmark
  2. NextCheckInCard (always shown)
  3. ScoreCard (after baseline)
  4. TrendCharts (after 2+ sessions)
  5. RecentComparisonCard (after 2+ sessions)
  6. RoutineSection (always shown after baseline)
- **Empty states:**
  - No baseline yet: redirects to capture flow
  - 1 session only: hide trends/comparison cards
- **Refresh:** Pull-to-refresh updates session data

---

### Main App Screens (Tab 2: Compare)

#### `/(main)/compare`
- **Purpose:** Compare any two scan sessions visually and numerically
- **Sections:**
  1. Header with session pickers
  2. Mode selector (Side / Slider / Difference)
  3. Visual comparison area
  4. Score delta row
- **Empty state:** Less than 2 sessions: clear message with first-scan reminder
- **Default selection:** Baseline vs latest

---

### Main App Screens (Tab 3: History)

#### `/(main)/history`
- **Purpose:** Browse all past sessions chronologically
- **Sections:**
  1. Time range filter (30d / 90d / all)
  2. Vertical timeline of sessions
  3. Each session shows: date, week #, overall score, score delta from prev
  4. Tap any session → `/(modal)/session-detail/[id]`
- **Empty state:** "Your timeline starts after your baseline scan."

#### `/(modal)/session-detail/[id]`
- **Purpose:** Deep dive on a single session
- **Sections:**
  1. Captured photos (3 angles, swipeable)
  2. All scores with explanations
  3. Routine state at the time
  4. Action: "Compare to another session"

---

### Main App Screens (Tab 4: Routine)

#### `/(main)/routine`
- **Purpose:** Dedicated view of today's routine + history
- **Sections:**
  1. Today's routine (same component as on dashboard)
  2. Streak indicator (large, motivating)
  3. Last 7 days completion calendar
  4. "Why this routine" expandable section
- **Empty state:** "Your routine generates after your first scan."

#### `/(modal)/routine-detail/[id]`
- **Purpose:** Full information on a single routine task
- **Sections:**
  1. Title, duration, evidence level badge
  2. Why it matters (full text)
  3. Detailed how-to
  4. Product recommendation (when present)
  5. Common mistakes to avoid

---

### Main App Screens (Tab 5: Settings)

#### `/(main)/settings`
(Detailed in file 14.)

**Section structure:**
1. **Subscription** — status, plan, manage
2. **Appearance** — theme preference (light/dark/system)
3. **Notifications** — enable/disable, schedule
4. **Privacy** — data visibility, export
5. **Account** — email, sign out, delete
6. **About** — version, privacy policy, terms, support, disclaimer

**Modal screens accessed from settings:**
- `/(modal)/notification-prefs`
- `/(modal)/theme-prefs`

---

### System Screens

#### `/(system)/error`
- **Purpose:** Global error fallback when something goes deeply wrong
- **Content:** Friendly error message, "Try again" CTA, "Contact support" link
- **Used when:** Network failures during critical paths, auth failures, unexpected crashes (caught by error boundary)

#### `/(system)/offline`
- **Purpose:** Shown when no internet AND user tries to do something requiring it (signup, AI calls)
- **Content:** "You're offline. Some features need internet."
- **Note:** Most of Vela works offline. Captures, routine, history all work locally. Only auth, AI, and sync require internet.

#### `/(system)/update-required`
- **Purpose:** Forces user to update if their app is incompatibly old
- **Trigger:** Server returns minimum version higher than current
- **Content:** "Vela needs an update", App Store link

---

## Presentation Style per Screen

Every screen is presented in exactly one of three styles. Cursor MUST NOT invent presentation styles per screen — the rule below is canonical.

| Screen | Style | Rationale |
|---|---|---|
| Capture | Full-screen modal, no swipe-dismiss | The flow needs to complete; gesture-back kills mid-capture state |
| Paywall | Full-screen modal, no swipe-dismiss | Same — paywall must be explicit |
| Privacy primer (file 07) | Full-screen pager | One-time, sequential |
| Forecast card (file 41) | Full-screen card stack | Wrapped-style |
| Wrapped (file 38) | Full-screen card stack | Same |
| Anniversary card (file 45) | Full-screen card stack | Same |
| Routine task detail | Sheet (swipe-dismiss) | Quick read, easy exit |
| Diary entry sheet (file 37) | Sheet (swipe-dismiss) | Quick add |
| Comparison view | Push (in tab stack) | Reversible nav |
| Treatment timeline | Push | Same |
| Settings (any sub-screen) | Push | Same |
| Share-card composer | Sheet (swipe-dismiss) | Quick action |
| Cancellation save flow | Sheet (no swipe-dismiss) | One-attempt-only contract from file 47 |

Sheet means iOS form-sheet (modal sheet) with grabber. Push means standard navigator push within the current tab.

---

## Deep-Link Error Fallback

Every deep link defined in file 30 must have a fallback path for invalid input. Canonical rule:

| Failure | UX |
|---|---|
| Invalid UUID format | Toast (`info`): "We didn't recognize that link." Routes to `/dashboard`. |
| Valid UUID, resource not found | Toast (`info`): "That scan isn't available." Routes to the relevant tab's empty state. |
| Valid resource, user not authenticated | Routes to `/auth` with `?redirect=<original-link>` query parameter. |
| Valid resource, owned by different user (per file 30 ownership check) | Toast (`warning`): "That link isn't yours." Routes to `/dashboard`. NEVER navigate to the resource. |
| Deep link from untrusted source (per file 30 phishing rules) | Silently ignore; no toast (we don't confirm receipt of suspicious links). |

Ownership check is the SEC item from file 30; this table is its UX surface.

---

## Tab Badging Rules

Every tab in the bottom bar can show at most one badge. Badge logic is per-tab and deterministic.

| Tab | Badge logic | Source data |
|---|---|---|
| Today (dashboard) | Number of incomplete routine tasks for today (cap 9, then "9+") | file 09 routine state |
| Compare | Dot (no number) when a new scan is available since the user last opened Compare | file 11 |
| History | Never badged (it's archival; nothing is "new" there) | — |
| Settings | Dot (no number) when subscription expires in ≤7 days OR a critical action is pending (deletion confirmation email, practice consent re-prompt) | files 14, 47, 49 |

Hard rules:
- Badges show only the count or a dot — never icons or colors beyond the standard accent.
- Badges clear automatically when the user opens the tab.
- Badge state is local to the device; no server sync (which would create cross-device race conditions).
- Tabs don't badge in look-back mode (file 46) except Settings if subscription state requires action.

---

## Empty State Philosophy

Every screen with potentially-empty content follows one of two patterns. Each screen MUST choose one and stick to it.

### Pattern A: Redirect to action (soft block)
The screen recognizes there's nothing to show and immediately routes the user to the action that produces content. No empty-state copy needed.

**Used by:** Dashboard with no scans → routes to capture; Compare with 1 scan → routes to "scan again next week" CTA; Treatment timeline with no treatments → routes to "Track a treatment" sheet.

### Pattern B: Encouraging copy + CTA (normal stage of the journey)
The screen displays warm, one-line copy explaining why the area is empty + an optional CTA. Never a dead end.

**Used by:** History with 1 entry, Diary with 0 entries, Routine pre-first-scan, Wrapped before month 2, Patterns insights pre-week-6, Year-over-year pre-year-1.

### Copy template

> *[1 sentence stating what's empty in plain language]. [1 sentence about when it'll fill]. [Optional CTA — only when user has agency to fill it.]*

Examples:
- History (1 entry): *"Your timeline starts now. Each scan adds a point."*
- Diary (0 entries): *"Anything worth remembering today? One line a day adds up."* [Add today's note]
- Wrapped (pre-month-2): *"You'll get your first monthly recap on the 1st."*
- YoY (pre-year-1): *"Once you've been here a year, your charts gain a 'last year' view."*

Voice rules: no exclamation marks; never apologize ("Sorry, no data yet"); never blame the user ("You haven't done X yet"); always future-positive but quiet.

---

## Navigation Patterns

### Tab Bar Navigation
- **Behavior:** Tap tab → navigate to that tab's root
- **State preservation:** Each tab maintains its own navigation stack
- **Tap-already-active behavior:** Scroll to top, then second tap goes to root

### Modal Navigation
- **Style:** iOS sheet style (slide from bottom, partial height)
- **Dismiss:** Swipe down or tap close button
- **Used for:** Share cards, detail views, preferences

### Stack Navigation (Onboarding)
- **Style:** Push from right
- **Back:** Disabled during onboarding (forced linear)
- **Progress:** Visible progress bar

### Full-Screen Modal (Capture)
- **Style:** Replaces entire screen including tab bar
- **Dismiss:** Only via explicit cancel button or completion
- **No back gesture:** Prevents accidental abandonment

---

## Deep Linking Routes

| Path | Action |
|------|--------|
| `vela://capture` | Start a new capture (if eligible) |
| `vela://dashboard` | Open dashboard tab |
| `vela://compare?from=ID&to=ID` | Open comparison with specific sessions |
| `vela://session/ID` | Open session detail |
| `vela://settings/subscription` | Open subscription management |
| `vela://settings/notifications` | Open notification preferences |

(Universal links and deep linking implementation detailed in file 30.)

---

## Screen Transition Map

How screens flow between each other:

```
┌──────────┐
│ welcome  │
└─────┬────┘
      ↓
┌──────────┐
│  signin  │
└─────┬────┘
      ↓
   onboarding (if new) ──────┐
      ↓                      ↓
   capture (baseline)        dashboard (returning)
      ↓
   paywall ──── X ──→ subscription_required
      ↓               ↓
   dashboard ←────────┘
      ↓
   ┌──┴────────────────────────┐
   ↓     ↓     ↓      ↓        ↓
home  compare history routine settings
   ↑     ↑     ↑      ↑        ↑
   └──── tab navigation ───────┘
```

---

## What's NOT in the App (Intentional Omissions)

Documenting absences is just as important as presence.

### No Social Features
- No friends list, no leaderboards, no public profiles
- No "compare yourself to others"
- This is a private tool. Sharing is opt-in via cards only.

### No "Daily Score"
- Vela is weekly. Daily noise doesn't reflect real change.
- Trying to get a score every day would tempt users to over-capture and over-interpret.

### No Beauty Recommendations Tab
- No browseable product catalog
- No "shop" tab
- Product recommendations appear contextually within routine tasks only.

### No Community / Forum
- No user-generated content
- No comments or reactions
- The "support" community lives in external Discord/Reddit if at all (post-launch consideration)

### No Health Records / Medical Data
- We're not HIPAA-compliant and won't be in v1
- No tracking of medications beyond the simple "are you on Tretinoin/HRT/etc" onboarding question

### No "Coach Chat" / AI Conversation
- AI generates copy and routines, but doesn't chat
- Future consideration only after we've nailed the core measurement product

---

## Future Surface Considerations (Not v1)

Documented here so we don't accidentally ship them too early:

- **Vela Scan (v2)** — separate app, separate tabs, shared profile
- **Treatment Tracking** — purpose-built timeline for users on Tretinoin, Botox, etc.
- **Pro / Clinician View** — dermatologists can view their patients' Vela data with permission
- **Watch app** — quick streak view, never capture
- **Web dashboard** — for power users who want larger views of their data

---

## IA Maintenance Rules

When adding a new screen:

1. **Document it here first.** If it's not in the sitemap, don't build it.
2. **Justify the placement.** Tab? Modal? Stack? Why?
3. **Define the empty state.** Every screen has one.
4. **Define the error state.** What if data fails to load?
5. **Define the offline behavior.** Does this need internet?
6. **Identify the persona served.** Which of the 4 personas needs this?

When removing a screen:

1. **Update the sitemap.**
2. **Audit all transitions in/out.**
3. **Remove from analytics events.**
4. **Remove from deep links.**
