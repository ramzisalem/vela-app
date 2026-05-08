# 17 — Testing & Launch

## Overview
Comprehensive testing checklist and step-by-step launch procedures. Read this before submitting to TestFlight, before submitting for App Store review, and before public launch.

---

## Test Device Requirements

You need at minimum:
- **Physical iPhone with TrueDepth camera** (iPhone X or later, iPhone 12+ recommended)
- iOS 15 or later
- Apple Developer account ($99/year)
- Mac with Xcode 15+ for iOS builds (if running EAS Build locally)

You cannot test ARKit features on:
- iOS Simulator
- iPhone 8 or earlier (no TrueDepth)
- iPad (different ARKit capabilities, not supported in v1)

Recommended: test on at least 2 different iPhones if possible — one current (iPhone 15+) and one older supported (iPhone 12).

---

## Pre-TestFlight Testing Checklist

### 1. Native Module (ARKit)

- [ ] Custom dev client builds successfully via `eas build --profile development --platform ios`
- [ ] AR session starts on physical iPhone within 2 seconds of launch
- [ ] Face detection works in normal indoor lighting
- [ ] Face detection fails gracefully in dark conditions (shows "more light" prompt)
- [ ] Distance check triggers when too close (closer than 30cm)
- [ ] Distance check triggers when too far (further than 60cm)
- [ ] Lighting check accurately detects bad backlighting
- [ ] Lighting check accurately detects sufficient illumination
- [ ] Expression check detects when user is smiling/talking
- [ ] Alignment overlay shows previous photo's silhouette correctly on non-baseline scans
- [ ] All four checks (distance, lighting, expression, alignment) trigger their respective UI states
- [ ] Shutter activates only when all checks pass for 0.5s continuously
- [ ] Photo captures save to documents directory
- [ ] Transform metadata (face orientation, position) saves with each photo
- [ ] Three-photo flow (front, left, right) works smoothly
- [ ] Permission denied flow shows helpful message and link to Settings
- [ ] Module handles app backgrounding mid-capture without crashing

### 2. Onboarding

- [ ] Welcome screen renders correctly
- [ ] All 30 questions display in correct order
- [ ] Gender branching works:
  - [ ] Men get facial hair question (Q11)
  - [ ] Women get hormonal factors with female-specific options
  - [ ] Non-binary gets choice of framework
  - [ ] Prefer-not-to-say flow works
- [ ] All multi-select questions correctly toggle
- [ ] All single-select questions correctly enforce one choice
- [ ] Progress bar advances correctly through all 30 questions
- [ ] Name field is truly optional (can skip)
- [ ] Ethnicity field accepts multi-select including "prefer not to say"
- [ ] Skin type Fitzpatrick selector works visually
- [ ] Concern regions face diagram is tappable on all 7 regions
- [ ] AI micro-payoffs generate between sections (or fall back to static copy)
- [ ] Profile saves to Supabase after completion
- [ ] Camera permission request works
- [ ] Notification permission request works
- [ ] Notification preferences (day/time) save correctly

### 3. Authentication

- [ ] Sign in with Apple flow completes successfully
- [ ] Email/password sign-up flow works (if enabled)
- [ ] Sign-out clears session and returns to root
- [ ] Re-authentication after sign-out works
- [ ] Sign in across devices restores subscription correctly
- [ ] Auth state persists across app restart

### 4. Paywall

- [ ] Paywall shows after first capture completes
- [ ] X button leads to "Subscription Required" screen, NOT to free access
- [ ] "Subscription Required" screen has Restore Purchases option
- [ ] "Subscription Required" screen has Subscribe button that returns to paywall
- [ ] Annual plan selected by default
- [ ] Tapping monthly switches selection visually
- [ ] "Start 7-Day Free Trial" CTA triggers Apple purchase sheet
- [ ] Purchase completion grants entitlement
- [ ] Purchase grants access to dashboard
- [ ] Purchase cancellation returns to paywall (no free access)
- [ ] Restore Purchases works for users who already subscribed
- [ ] Privacy Policy link opens in browser
- [ ] Terms of Service link opens in browser
- [ ] Network failure during purchase shows graceful error
- [ ] Trial ends correctly (test by changing system date or using sandbox)

### 5. Capture Flow (Beyond ARKit)

- [ ] Pre-capture screen shows correct instructions for baseline vs weekly
- [ ] Capture screen progresses through 3 angles (front, left, right)
- [ ] Each angle has correct alignment overlay reference
- [ ] Photo review screen lets user retake or accept
- [ ] Processing screen shows AI progress (don't show technical details)
- [ ] Score reveal animates in correctly
- [ ] First scan reveal vs subsequent scan reveal differ correctly
- [ ] Cannot start a new scan if one is less than 6 days old (configurable)
- [ ] Aborting capture mid-flow returns to dashboard cleanly
- [ ] Network failure during AI processing falls back gracefully

### 6. Scoring

- [ ] Baseline scan produces scores in expected 30-85 range
- [ ] Scores feel calibrated (not all 50, not all 90)
- [ ] AI explanation appears after second scan
- [ ] Score deltas display correctly (positive/negative/zero)
- [ ] Sub-score colors match design system
- [ ] Tapping a sub-score expands the explanation
- [ ] Calibration produces sensible results across:
  - [ ] Different ages (20s, 30s, 40s, 50s+)
  - [ ] Different skin types (Fitzpatrick 1-6)
  - [ ] Different genders
  - [ ] Different ethnicities (test at minimum 4 demographic combinations)
- [ ] Perceived age estimate is plausible
- [ ] Skin assessment AI returns reasonable scores for clear/clearer/less clear test photos

### 7. Routine

- [ ] AI generates routine after baseline scan
- [ ] Routine adapts after week 2 scan
- [ ] Tasks display by time of day (morning/evening/anytime)
- [ ] Task expand/collapse works
- [ ] Why-it-matters explanation renders correctly
- [ ] Product recommendations appear when present
- [ ] Check-off persists across app sessions
- [ ] Streak updates correctly
- [ ] Streak resets after a missed day
- [ ] Fallback routine works if AI fails (test by disabling network)
- [ ] No retinoids recommended for users with rosacea
- [ ] No retinoids recommended for pregnant users
- [ ] No mewing/jaw exercises in any recommendation

### 8. Dashboard

- [ ] Score card shows latest score
- [ ] Trend charts render with at least 2 data points
- [ ] Time range selector (30d/90d/all) filters correctly
- [ ] Metric chips switch chart data correctly
- [ ] Next check-in card shows correct days remaining
- [ ] Next check-in card flips to "overdue" state when applicable
- [ ] Recent comparison card appears with 2+ sessions
- [ ] Routine section integrates with dashboard scroll
- [ ] Pull-to-refresh updates session data
- [ ] Empty state (no sessions) renders correctly

### 9. Comparison

- [ ] Compare tab loads with 2+ sessions
- [ ] Empty state shows with <2 sessions
- [ ] Default selection picks first and last sessions
- [ ] Session picker modal lets user choose any session pair
- [ ] Side-by-side view shows both photos correctly
- [ ] Slider compare gesture works smoothly
- [ ] Slider doesn't go off-screen edges
- [ ] Difference view shows change markers correctly
- [ ] Score delta row shows all 6 metrics with deltas
- [ ] Share button navigates to share-comparison screen
- [ ] Photos load correctly from device storage

### 10. Notifications

- [ ] Weekly check-in notification fires on scheduled day/time
- [ ] Tapping notification opens capture screen
- [ ] Missed check-in nudge fires 2 days after missed scan
- [ ] 5-day overdue nudge fires correctly
- [ ] 14-day paused nudge fires correctly
- [ ] Milestone notifications trigger at week 4, 8, 12, 26, 52
- [ ] Notification preferences save correctly
- [ ] Disabling notifications cancels all scheduled
- [ ] Re-enabling reschedules correctly
- [ ] Notifications work after app reinstall (on logged-in account)

### 11. Share Cards

- [ ] Score share card renders at correct resolution
- [ ] Comparison share card renders both photos
- [ ] Perceived age card shows when age data available
- [ ] Card type selector switches preview
- [ ] Share button opens iOS share sheet
- [ ] Save button saves to Camera Roll (with permission)
- [ ] Watermark visible on all cards
- [ ] Cards look good in actual social media posts (test posting to Instagram Stories, Twitter)
- [ ] Cards work without internet (cards generate locally)

### 12. Settings

- [ ] Subscription section shows correct status
- [ ] Trial countdown shows correctly during trial
- [ ] Manage Subscription opens cancellation save modal
- [ ] Pause for 30 days option appears
- [ ] Continue to manage opens Apple's subscription page
- [ ] Notification preferences match scheduled state
- [ ] Privacy section shows accurate storage info
- [ ] Export my data generates JSON and opens share sheet
- [ ] Account section shows correct user identifier
- [ ] Sign out clears session and returns to root
- [ ] Delete account triggers confirmation
- [ ] Delete account fully removes:
  - [ ] Auth user from Supabase
  - [ ] Profile data
  - [ ] All photos from device
  - [ ] All notifications
  - [ ] WatermelonDB data
- [ ] Privacy Policy link opens in browser
- [ ] Terms of Service link opens in browser
- [ ] Support email opens Mail app
- [ ] Medical disclaimer visible

### 13. Edge Cases

- [ ] App handles airplane mode gracefully (capture works, AI fails gracefully)
- [ ] App handles slow network (loading states appear, no infinite spinners)
- [ ] App handles low storage (warns when below 100MB free)
- [ ] App handles low battery during capture
- [ ] App restores correctly from background after long pause
- [ ] App handles being killed mid-flow without data corruption
- [ ] Subscription expiry mid-session shows expired flow correctly
- [ ] Multiple devices with same account sync correctly
- [ ] Reinstalling app preserves account data after sign-in

### 14. Performance

- [ ] Cold start time under 3 seconds
- [ ] Capture screen launches in under 2 seconds
- [ ] AR session starts in under 2 seconds
- [ ] Photo capture has minimal lag (under 200ms)
- [ ] AI processing completes in under 8 seconds typically
- [ ] Trend chart renders smoothly with 50+ data points
- [ ] Slider compare maintains 60fps during drag
- [ ] No memory leaks during extended capture session
- [ ] App bundle size reasonable (under 100MB)

### 15. Accessibility

- [ ] VoiceOver navigation works through all primary screens
- [ ] All buttons have accessibility labels
- [ ] Color contrast meets WCAG AA (4.5:1 for body text)
- [ ] Tap targets minimum 44pt × 44pt
- [ ] Dynamic Type support for text sizes
- [ ] Reduce Motion preference respected for animations

### 16. Settings tree completeness

- [ ] Every section in `SETTINGS_MANIFEST` (file 14) renders without crash
- [ ] Every row's `owner` file's logic loads correctly (test by tapping each)
- [ ] No row appears in the rendered Settings that isn't in the manifest (lint enforced)
- [ ] Notification preferences toggle persists across app kill + relaunch
- [ ] Privacy → Analytics opt-out actually disables PostHog (verify no events fire)
- [ ] Privacy → Singular consent toggle independently controls Singular
- [ ] Account deletion email arrives within 60 seconds of request
- [ ] All "What's new in Vela" reveals show correct status (engaged / dismissed / locked)
- [ ] Life-stage modes Settings → enable each mode → verify routine engine refreshes immediately

### 17. Singular MMP

- [ ] ATT prompt fires after permissions screen, before paywall (file 31 + file 01 init order)
- [ ] Singular SDK initialization happens AFTER ATT response (no early-init regression)
- [ ] DPA acknowledgement signed and on file before launch
- [ ] SKAdNetwork conversion-value mapping defined and verified against test events
- [ ] EU users see Singular GDPR consent prompt and toggle works

### 18. Brand voice consistency (T-1 day)

- [ ] Grep codebase for forbidden words from file 21 — zero matches outside test fixtures
- [ ] Spot-check 10 randomly-sampled AI prompt outputs against voice rules
- [ ] All notification copy reviewed
- [ ] All toast / banner / alert copy reviewed
- [ ] Onboarding micro-payoffs reviewed
- [ ] Wrapped sample copy (10 randomly-generated) reviewed

---

## EAS Build & Submit Configuration

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Configure EAS (one-time setup)

```bash
eas build:configure
```

### eas.json (commit to repo)

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "env": {
        "EXPO_PUBLIC_API_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "env": {
        "EXPO_PUBLIC_API_ENV": "staging"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": {
        "image": "latest",
        "resourceClass": "m-medium"
      },
      "env": {
        "EXPO_PUBLIC_API_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your_apple_id@example.com",
        "ascAppId": "0000000000",
        "appleTeamId": "ABC123XYZ",
        "sku": "vela_ios_001"
      }
    }
  }
}
```

### Build Commands

```bash
# Development build (for testing on your device)
eas build --platform ios --profile development

# Preview build (for sharing with testers via TestFlight or ad-hoc)
eas build --platform ios --profile preview

# Production build (for App Store submission)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

### EAS Secrets (configure once)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS --value "appl_xxx"
```

---

## TestFlight Distribution

### Internal Testing (immediate, up to 100 users)

After production build completes:
1. Build automatically uploads to App Store Connect
2. Add internal testers in App Store Connect → TestFlight → Internal Testing
3. Internal testers receive email invite immediately

### External Testing (Beta App Review required, up to 10,000 users)

1. Add testers/groups in App Store Connect → TestFlight → External Testing
2. Submit build for Beta App Review (usually approved within 24 hours)
3. Send invite link or add testers' Apple IDs

### TestFlight Test Notes (each build)

```
Vela [version] — TestFlight build

Changes in this build:
- [bullet point of what changed]

Areas to test:
- Capture flow on multiple lighting conditions
- Score consistency across multiple captures
- Routine adaptation after week 2 scan

Known issues:
- [any known bugs to ignore]

Feedback via: support@getvela.app
```

---

## Launch Day Procedures

### T-7 days
- [ ] Production build submitted to App Store
- [ ] Press kit ready (logo, screenshots, demo video)
- [ ] Privacy Policy and Terms hosted
- [ ] Support email monitored
- [ ] Sentry / error tracking configured
- [ ] RevenueCat dashboard configured
- [ ] Supabase production project ready (separate from dev)
- [ ] Edge Functions deployed
- [ ] Domain (getvela.app) live with landing page

### T-3 days
- [ ] App Store review completed (or in review)
- [ ] Marketing assets prepared
- [ ] Social accounts created (@usevela on relevant platforms)
- [ ] Twitter/X announcement post drafted
- [ ] Email to early waitlist drafted
- [ ] Product Hunt submission prepared (don't submit early)

### T-1 day
- [ ] Final production build approved by Apple
- [ ] App not yet released (set to "Manual release after approval")
- [ ] Final test of production build via TestFlight
- [ ] Crash analytics dashboard ready
- [ ] Customer support email tested

### Launch Day
- [ ] Manually release app via App Store Connect
- [ ] Verify app live on App Store (search for "Vela")
- [ ] Post Twitter/X announcement
- [ ] Submit to Product Hunt (if planned)
- [ ] Email waitlist
- [ ] Monitor:
  - [ ] Crash rate (should be <0.5%)
  - [ ] Subscription conversion rate
  - [ ] User reports via support email
  - [ ] App Store reviews
  - [ ] AI proxy usage and costs
  - [ ] Supabase usage and quotas

### Day 1-7 Post-Launch
- [ ] Respond to all App Store reviews within 24 hours
- [ ] Triage all support emails
- [ ] Fix any critical bugs immediately (rapid iteration)
- [ ] Track which onboarding questions cause drop-off
- [ ] Track paywall conversion rate
- [ ] Plan first update based on feedback (don't promise specific features)

---

## Post-Launch Monitoring

### Required Tools

1. **Sentry** — Crash reporting and error tracking
   ```bash
   npx expo install @sentry/react-native
   ```
   Configure in app initialization with DSN.

2. **RevenueCat Dashboard** — Subscription analytics, MRR, churn

3. **Supabase Logs** — Database errors, Edge Function performance

4. **OpenAI usage dashboard** — AI proxy usage and costs

5. **App Store Connect** — Crashes, downloads, reviews, sales

### Key Metrics to Watch (first 30 days)

- **Activation rate:** % of installs that complete onboarding
- **Baseline scan rate:** % of activated users who complete first capture
- **Trial start rate:** % of baseline scans that start free trial
- **Trial-to-paid conversion:** % of trials that convert to paid (target: 30-40%)
- **Day 7 retention:** % of installs still using app on day 7
- **Day 30 retention:** % of installs still using app on day 30
- **Weekly check-in compliance:** % of users who complete week-2 scan
- **Crash-free sessions:** Should be >99.5%
- **Average AI cost per user:** Should stay around $0.02/week
- **App Store rating:** Target 4.5+

### Watch for Red Flags

- Crash rate >1% → fix immediately, push hotfix build
- Subscription conversion <20% → revisit paywall and value prop
- Week-2 check-in compliance <40% → improve notification flow or value of weekly scan
- Negative App Store reviews mentioning specific issues → address publicly and in-app

---

## Rollback Plan

If a critical bug is shipped:

1. **Immediate:** Pull app from sale via App Store Connect (drastic, only for severe issues)
2. **Within hours:** Push expedited build review request to Apple
3. **Within day:** Hotfix submitted with explanation in Reviewer Notes
4. **Communication:** Tweet, email subscribers, in-app notice if possible

If a backend issue:

1. **Immediate:** Revert Edge Function or DB migration
2. **Within minutes:** Force app to fall back to local-only mode if AI is broken
3. **Within hours:** Communicate via support email and Twitter

---

## Final Reminder

Don't ship without testing on a real iPhone with TrueDepth camera. The simulator does not run ARKit. The whole product depends on the AR module working — verify it works on multiple devices before launching.

Good luck shipping Vela.
