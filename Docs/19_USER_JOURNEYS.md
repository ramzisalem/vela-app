# 19 — User Journeys

## Overview
End-to-end user journeys mapped at three time horizons: Day 1 (acquisition through baseline), Week 1-4 (habit formation), Month 3+ (retention). Each journey describes states, decisions, emotional arcs, and the product's responses.

These journeys exist to align product, design, and engineering on the actual user experience over time, not just at the moment of feature use.

---

## Journey 1: Day 1 — From Click to Subscription

### Stage 1: Pre-Install (0-15 minutes)
**State:** User saw Vela on social media, friend's recommendation, or App Store search. They're curious but skeptical.

**Their thought:** "Another beauty app. But this one looks different — let me check."

**App Store touchpoints:**
- Reads first screenshot ("Honest scoring. No filters.")
- Reads description (first paragraph hooks the value prop)
- Skims reviews (looks for legitimacy signals, complaints about scams)
- Decides to download

**Conversion levers:**
- Subtitle clarity ("Weekly aligned face tracking")
- Privacy mentioned in description
- Clear pricing visibility (no hidden cost surprises in reviews)
- 4.5+ rating

### Stage 2: First Launch (0-90 seconds)
**State:** App installed, opening for first time. Slightly defensive — expecting upsell.

**Flow:**
1. Splash → Welcome screen
2. Headline: "Track your face properly."
3. Subhead: "Most people store selfies in their camera roll and hope for the best..."
4. Single CTA: "Get started"

**Emotional arc:** Curiosity → small commitment

**Product response:** No noise. No tour. No carousel. Just clarity and one button.

### Stage 3: Onboarding (3-10 minutes)
**State:** User has committed to learning more. Now they're being asked to share data.

**Flow:** 30 questions across 5 sections, with AI-generated micro-payoffs between sections.

**Critical moments:**
- **Q3 (Name):** First "you can skip" — signals respect
- **Q4 (Ethnicity):** First moment that says "we care about getting this right for you"
- **Q9 (Concern regions):** First interactive moment, feels engaging
- **Section A → B transition:** First AI micro-payoff. Should reference something specific they shared. **This is the make-or-break moment for product trust.**
- **Q19 (Budget):** Risk of churn — feels close to "selling"
- **Q26 (Current products):** Risk of "this is a lot"

**Drop-off mitigations:**
- Progress bar always visible
- Section labels make 30 questions feel like 5 chunks
- AI micro-payoffs at section boundaries reward continued engagement
- Each question has clear purpose — no question feels arbitrary

**Emotional arc:** "Why so many questions?" → "Oh, I see — they're using this to actually personalize" → invested in the outcome

### Stage 4: Permissions (15-30 seconds)
**State:** User has invested 7-10 minutes. They want to see what happens.

**Flow:**
- Camera permission (required, AR explanation)
- Notification permission (optional, day/time picker visible immediately)
- "Continue to first scan" CTA (only enabled when camera granted)

**Critical detail:** Notification day/time selector visible on permission screen — establishes that we respect their time, not blast them.

### Stage 5: First Capture / Baseline (60-180 seconds)
**State:** User is about to point a camera at their face. **This is the highest-stress moment of the entire app.**

**Mitigations:**
- Pre-capture screen explains what's about to happen
- "First scan establishes your baseline. No score yet — just calibration."
- AR overlay starts gently, no harsh sounds
- Alignment guides feel helpful, not judgmental
- Three angles, but each is fast (~10 seconds when alignment is right)
- Photos preview after each — can retake

**Emotional arc:** Mild anxiety → "this is actually easier than my own selfies" → small pride at completion

### Stage 6: Processing (3-8 seconds)
**State:** User waits for AI to score them. Anticipation building.

**Flow:**
- Loading screen with abstract progress
- Copy: "Calibrating your baseline..." (not "scoring you")
- AI processes face metrics + image-based assessment

**Emotional arc:** Anticipation peaks here. **The reveal must land.**

### Stage 7: Baseline Reveal (5-10 seconds)
**State:** User sees their first Vela score.

**Flow:**
- Score animates in (use `AnimationDuration.reveal`)
- No delta shown (this is baseline)
- Sub-scores fan in
- AI overall summary appears: factual, neutral
- CTA: "Continue"

**Critical detail:** No "you scored X — here's what it means good or bad." Just present the numbers and brief context. Manipulative framing here would betray the product.

**Emotional arc:** Either "huh, lower than I thought" (Maya) or "this looks honest" (Marcus, Priya, Jordan) → feeling that the product is real

### Stage 8: Paywall (Variable)
**State:** Now the moment of truth. User has invested ~12-15 minutes and gotten value. They are **not yet signed in** — the paywall fires against an anonymous RevenueCat identity.

**Flow:**
- RC Paywall modal appears (designed in RC dashboard, no custom code)
- Annual selected by default ($79/year)
- Monthly secondary ($9.99/month)
- CTA: "Start 7-Day Free Trial"
- Built-in Restore Purchases button

**Conversion levers:**
- Investment of time creates sunk cost (they want to see what happens)
- Purchase happens before account creation — minimal friction at the most critical moment
- Clear pricing with no asterisks

**Drop-off mitigation:**
- X button leads to "Subscription Required" screen, not dismissal
- Subscribe button on dead-end screen returns to paywall

**Target conversion:** 30-40% trial start

### Stage 9: Account Creation
**State:** User just subscribed. Now we collect their email. They're motivated — they already paid.

**Flow:**
- Screen: "Almost there. Create your account to save your data."
- Email + password (or Sign in with Apple)
- CTA: "Create account"
- "Already have an account? Sign in" for returning users

**Why email comes after the paywall:** Asking for email before purchase adds friction at the highest-drop-off moment. Asking after, when the user is already committed, makes account creation feel like a formality.

**What happens technically:**
- `supabase.auth.signUp()` creates the account
- `Purchases.logIn(userId)` is called immediately after — merges the anonymous RC purchase onto the new account
- Subscription is now permanently attached to this user ID and survives reinstalls

### Stage 10: First Dashboard (30-90 seconds)
**State:** User is in the app. Subscription active. Account created. Now they need to feel good about the decision.

**Flow:**
- Dashboard appears with their baseline score
- Routine section is populated (not empty!)
- Next check-in card shows date 7 days out
- Brief "you're all set, see you in 7 days" copy
- Optional: tutorial card explaining the routine

**Emotional arc:** Satisfaction, anticipation for next week

**Critical detail:** **Don't show empty trends or comparison cards on Day 1.** Those screens should be hidden or empty-state until there are 2+ sessions. Showing them empty undermines the polish.

---

## Journey 2: Week 1-4 — Habit Formation

### Day 1-3: Routine Discovery
**State:** User has access. Now they explore the routine.

**Behaviors:**
- Opens app 1-2x/day
- Reads each routine task carefully
- Maybe completes 50% of tasks day 1
- Slightly overwhelmed by total task count

**Product response:**
- Subtle haptic on task check-off
- Streak hasn't started yet — no pressure
- AI personalization note explains why these tasks
- Clear time estimates per task

**Risk:** User abandons the app within 3 days.

**Mitigation:**
- Day 1 push: "Welcome to your first day with Vela. Take 90 seconds to start your routine."
- Day 3 push if no engagement: "Your routine is waiting. Even completing 1 task today helps."

### Day 4-6: Forgetting Phase
**State:** Initial enthusiasm fades. Real life intrudes.

**Behaviors:**
- Maybe skips routine 1-2 days
- Doesn't open app for 24-48 hours
- Comes back with mild guilt

**Product response:**
- No shame messaging when they return
- Streak resets without fanfare (no "you broke your 3-day streak!")
- Routine is still there, ready
- Gentle "here's where you left off"

**Critical detail:** Vela never punishes users for missing days. The voice is supportive coach, not personal trainer.

### Day 7: First Weekly Check-In
**State:** Notification fires. User has the moment to capture again.

**Behaviors:**
- Sees notification: "Time for your weekly Vela. 90 seconds to see this week's changes."
- May or may not capture immediately
- Some delay 1-3 days

**Product response:**
- Notification at scheduled time
- Day 9 nudge if missed: "Your weekly Vela is overdue. Take 90 seconds — your scoring depends on consistency."
- Capture flow now shows alignment overlay with previous photo
- Processing shows AI explanation of what changed

### Day 7-8: First Reveal
**State:** User has captured week 2. The first comparison is happening.

**Flow:**
- Score animates with delta visible
- Each sub-score with explanation
- AI summary: "Strong week overall — skin and vitality both improved..."

**Emotional arc:** Wow. The thing they signed up for is actually working.

**Critical detail:** Even if scores went down 1-2 points, the framing should be neutral, with a focus on what to do next.

### Week 2-4: Routine Adaptation
**State:** Patterns are forming. Some tasks feel natural, others feel like work.

**Behaviors:**
- Routine completion stabilizes around 70-85%
- Some users start ignoring certain tasks
- Trend lines start to mean something

**Product response:**
- Week 2 scan: routine adapts. Tasks the user is consistently skipping get replaced.
- Week 4 scan triggers milestone notification: "4 weeks of Vela. Your first monthly reveal is ready."

### Day 28: 4-Week Milestone
**State:** First major reveal moment.

**Flow:**
- Notification fires
- Tap → comparison view auto-set to baseline vs week 4
- Slider visible by default
- AI-generated milestone summary:
  > "30 days of Vela. Your skin score is up 6 points and your vitality is up 4 points. The biggest driver: your daily SPF compliance went from 'sometimes' to 'daily'. Keep it going."

**Critical detail:** This is the **second make-or-break moment of the entire product** (after onboarding micro-payoffs). The user must feel that the past month of effort produced visible, measurable, real change.

If the data is genuinely flat (some users won't see change in 4 weeks), the AI summary acknowledges it honestly: "This month's data shows stable scores. Real changes often take 8-12 weeks. Keep your routine consistent."

---

## Journey 3: Month 3+ — Retention & Conversion to Paid

### Month 2: Trial → Paid Conversion
**State:** Trial ends. User must actively be charged.

**Behaviors:**
- ~30-40% convert to paid (industry average for premium subscription apps)
- Some cancel via App Store before charge
- Some forget and get charged

**Product response:**
- Day 5 of trial: gentle reminder ("3 days left in your trial")
- No aggressive upsell — just clarity
- Subscription badge in settings shows trial status

**For users who churn:**
- App enters "subscription expired" state on next open
- Same paywall, but with messaging acknowledging they were a previous subscriber
- Their data is preserved for 30 days

### Week 8-12: Comparison Power Use
**State:** User has 8-12 weeks of data. Comparison feature becomes their favorite.

**Behaviors:**
- Opens comparison tab 1-2x per week
- Tries different session pairs
- May share a comparison with a friend privately
- Some share publicly (low % but high value)

**Product response:**
- Comparison improves with more data
- Slider gesture has been refined
- Share cards work cleanly

### Week 12: 3-Month Milestone
**Flow:**
- Notification: "3 months of Vela. Your most comprehensive comparison yet is ready."
- Reveal moment with substantial visible change (for most users)
- AI summary contextualizes the 12-week journey

**Critical detail:** This is when most users should see clearly visible improvements in their photos. If they don't, the product has failed and they'll churn.

### Month 4-6: Subscription Stickiness
**State:** User is a regular. The ritual is normal.

**Behaviors:**
- Captures consistently (>80% weekly)
- Routine completion is high
- Compares baseline vs current monthly
- Subscription is on autopilot

**Product response:**
- Continue providing value
- Send milestone notifications at week 26 and 52
- Don't introduce friction that risks the established habit

### Month 6+: The True Power User
**State:** Vela is part of their life. They're invested.

**Behaviors:**
- 6 months of data is genuinely meaningful
- Visible changes are dramatic
- They've recommended Vela to friends
- Considering data export, derm visits, treatment tracking

**Product response:**
- Treat as VIP — they're churn-resistant
- Future features (Vela Scan v2) target this user first
- Long-term LTV: $79/year × 3+ years = $237+

---

## Journey 5: Returning After Lapse (month 4+ comeback)

A user who churned at month 4 returns at month 8. The reactivation engine (file 46) covers the first 30 days of lapse via grace + look-back. This journey covers the case beyond.

### Day 0 of return (months later, app is opened)
1. App detects lapsed-readonly state from RevenueCat. The look-back dashboard renders with the user's frozen data.
2. The pinned banner reads: *"Welcome back. Your data is here whenever you want to keep going."*
3. Slot 2 (file 10 dashboard) shows the `LapsedDigestPreview` card — a one-line preview of changes since the user last paid.
4. Tab badges per file 20 are suppressed except Settings (subscription action available).

### Day 0–7 of return: deciding
- All read-only surfaces work: history, Wrapped retrospectives, comparison view, treatment timelines.
- Tap any "live" feature (capture, new diary entry, routine completion) → routes to the standard paywall (file 08, but with the trial-expired variant, see below).
- The user's life-stage mode state is preserved — if they enabled pregnancy mode 8 months ago and disabled it 6 months ago, that history is intact and visible.

### Day 1+ of return: resume or stay lapsed
- Resume: standard paywall purchase → all data restored, welcome-back card on dashboard for 7 days. Streak is reset (longest preserved); routine is regenerated; everything else continues from where they left off.
- Stay lapsed: monthly digest emails continue (if opted in); win-back free scan offer fires at day 90 if not yet redeemed.

### After 24 months lapsed
- Final email fires (file 46 phase 5).
- Email-digest opt-in flag cleared.
- App still works in look-back mode forever; we never auto-delete the user's data without their explicit action.

---

## Notification Copy per Journey Stage (canonical)

Every journey above triggers notifications. The text MUST be sourced from the table below — do NOT let Cursor invent copy. All strings respect file 21's voice rules and file 12's notification budget.

| Journey stage | Trigger | Category (file 12) | Title | Body |
|---|---|---|---|---|
| Day 1 evening | Onboarding incomplete | `lifecycle` | Pick up where you left off | Your baseline is one tap away. |
| Day 3 | No first scan after signup | `lifecycle` | Three days in | When you're ready, your baseline is here. |
| Day 5 | Trial day 5 | `lifecycle` | Two days left | Where would you like to go from here? |
| Day 6 | Trial day 6 | `lifecycle` | Tomorrow's preview is set | Your week-four forecast is ready in the morning. |
| Day 7 morning | Trial day 7 | `lifecycle` | Your week-four preview is ready | When you have a moment. |
| Day 7 evening | If forecast unviewed | `lifecycle` | Still here | Your preview's still there if you'd like to see it. |
| Day 7 (anchor) | Weekly check-in | `scan` | Sunday coffee scan (anchor-aware per file 42) | When you're ready. |
| Day 9 | Missed weekly scan +2 | `scan` | Whenever's good for you | Your scan window's still open. |
| Day 14 | Missed weekly scan +7 | `scan` | Two weeks since your last scan | Pick up whenever fits. |
| Week 1 milestone | 7-day routine streak | `milestone` | Seven days in | Worth saying out loud. |
| Week 3 milestone | 21-day routine streak | `milestone` | Three weeks. That's a habit | (no body) |
| Month 1 day 1 | Wrapped ready | `insight` | Your <Month> recap is ready | When you have a moment. |
| Month 4+ lapsed digest | Reactivation monthly | `lifecycle` | Your <Month> from Vela | Where your face is now, and where it was a year ago. |
| Day 90 lapsed | Win-back free scan | `lifecycle` | On us — a single scan to see what's changed | Good for the next 14 days. |

**Strings live in `src/i18n/notifications.ts` as a typed constant.** Adding a notification means adding a row above AND the i18n key. Linting catches strings that exist in code but not in the table.

Voice review: every line was checked against file 21 forbidden words. No exclamation marks anywhere.

---

## Trial Expiration Paywall Variant

The standard paywall (file 08) renders three different copy variants depending on the user's lifecycle state. Cursor must implement all three.

| State | Variant | Trigger |
|---|---|---|
| `signup-fresh` | Default paywall — *"Continue with Vela"* | Post-baseline-reveal, first time |
| `trial-expired` | *"Your trial ended. Pick up where you left off."* | Day 7 midnight + first app open after | 
| `lapsed-readonly` | *"Welcome back. Resume Vela?"* | Returning lapsed user tap on a live feature |

Each variant uses identical RevenueCat purchase flow; only the headline copy and the surrounding context line above differ. Files 41 (trial-end forecast) and 46 (reactivation) already reference these variants — file 08 must enumerate them so they exist.

---

## Journey 4: The Failure Path (How Users Churn)

Equally important: understanding where users drop off and what to fix.

### Acquisition Failure
- Saw the App Store listing, didn't download
- **Cause:** Subtitle, screenshots, or pricing was wrong
- **Fix:** A/B test screenshots. Iterate.

### Onboarding Failure
- Started onboarding, didn't finish
- **Cause:** Question that felt too invasive, AI micro-payoff failed, or fatigue
- **Diagnosis:** Track drop-off per question. Anything >5% drop is suspicious.
- **Fix:** Reorder questions, add skip options, improve micro-payoffs.

### Capture Failure
- Got to capture screen, abandoned
- **Cause:** AR didn't work, lighting was bad, felt awkward holding phone
- **Diagnosis:** Track time-on-capture. Anything >3 minutes is failed UX.
- **Fix:** Better lighting prompts, simpler alignment guidance.

### Paywall Failure
- Hit paywall, didn't subscribe
- **Cause:** Price too high, value not clear, trial too short
- **Diagnosis:** Track paywall conversion. Below 25% needs intervention.
- **Fix:** Test annual vs monthly default, test different framings, longer trial.

### Trial Conversion Failure
- Subscribed to trial, didn't convert to paid
- **Cause:** Didn't see enough value in 7 days
- **Diagnosis:** Trial users get only 1 weekly comparison. That's not a lot.
- **Fix:** Heavy emphasis on "your baseline + first week of routine" value during trial.

### Week 2 Failure
- Completed baseline, didn't return for week 2 capture
- **Cause:** Forgot, didn't see notification, life got busy
- **Diagnosis:** Track week-2 capture rate. Below 50% is concerning.
- **Fix:** Better notification copy, day-8 nudge, day-12 stronger nudge.

### Long-Term Churn
- Was active for 2-3 months, then stopped
- **Cause:** Didn't see meaningful change, got bored, switched to another app
- **Diagnosis:** Track week-12 retention. This is the real product test.
- **Fix:** Better routine adaptation, more delight at milestones, deeper insights over time.

---

## Mapping Personas to Journey Stages

Different personas behave differently at each stage:

| Stage | Maya | Marcus | Priya | Jordan |
|-------|------|--------|-------|--------|
| Onboarding completion | 95% | 80% | 95% | 70% |
| Trial start rate | 40% | 30% | 50% | 25% |
| Trial → paid conversion | 50% | 35% | 70% | 30% |
| Week 4 retention | 80% | 60% | 90% | 65% |
| Week 12 retention | 60% | 40% | 80% | 55% |
| Year 1 retention | 50% | 30% | 70% | 40% |

(Estimates — validate with real data.)

The implication: **Priya is the highest LTV persona. Jordan is the most fragile and needs the most care. Marcus needs the fastest visible payoff. Maya needs the deepest data.**

Design decisions should consciously balance across all four.
