# 16 — App Store

## Overview
Everything needed to ship Vela to the App Store: listing copy, keywords, screenshots, App Store Connect configuration, and review notes.

---

## App Information

**App Name:** `Vela`
(Note: pending USPTO trademark check and App Store availability check before final submission. Backup options if "Vela" is unavailable: `Vela Track`, `Vela App`.)

**Subtitle (max 30 chars):** `Weekly aligned face tracking`

**Bundle ID:** `com.velapp.vela` (production only — see file 27 for environment-specific resolution: `com.velapp.vela.staging` for TestFlight, `com.velapp.vela.dev` for development. App Store always uses the production ID.)

**SKU:** `vela_ios_001`

**Primary Language:** English (US)

**Categories:**
- Primary: `Health & Fitness`
- Secondary: `Lifestyle`

**Content Rating:** 12+
(Reasons: Infrequent/Mild Mature/Suggestive Themes — discussions of skin, aging, hormonal factors. Not 17+ because no explicit content.)

---

## Description

```
Vela is the serious face tracker. Not a filter. Not a rating app. A real measurement tool that shows you what's actually changing in your face, week by week.

HOW IT WORKS
Take three guided photos each week. Vela's AR alignment ensures every scan is comparable to your last — same angle, same distance, same lighting check. No more inconsistent selfies ruining your before/after.

HONEST SCORING
Your composite Vela score across five sub-metrics: Skin, Symmetry, Definition, Vitality, and Grooming. Every score change is explainable — tap any metric to see exactly what changed and why.

YOUR ROUTINE, YOUR WAY
After your baseline scan, Vela generates a personalized daily routine targeting your weakest areas. It adapts every week based on what's actually working for you.

PRIVATE BY DESIGN
All facial analysis happens on your device. Your photos never leave your phone unless you choose to back them up.

CALIBRATED FOR EVERYONE
Built for men and women, across all skin tones and ages. The scoring model adjusts to your demographic baseline so the metrics actually mean something for you.

TRACK REAL CHANGE
See your week 1 vs week 12 comparison with photos you can actually trust are aligned. Use the slider, side-by-side, or difference views to spot what changed.

DESIGNED LIKE OURA, NOT INSTAGRAM
No "level up" gimmicks. No looksmaxxing vocabulary. No generic glow-up promises. Just real measurement, honest feedback, and a routine that adapts to your actual data.

WHAT YOU GET
• Weekly AR-aligned face scans
• Five-dimensional scoring with weekly explanations
• Personalized daily routine that adapts to your progress
• Side-by-side, slider, and difference comparison views
• Private timeline of your transformation
• Optional shareable progress cards
• Full data export and account deletion controls

REQUIREMENTS
• iOS 15 or later
• iPhone with TrueDepth camera (iPhone X or later)
• Internet connection for AI features

SUBSCRIPTION
$79/year or $9.99/month. 7-day free trial on first subscription. Cancel anytime in iOS Settings.

PRIVACY & TERMS
Privacy Policy: https://getvela.app/privacy
Terms of Service: https://getvela.app/terms

DISCLAIMER
Vela is a wellness tracking tool, not medical advice. Consult a healthcare professional for skin or hair concerns.

SUPPORT
support@getvela.app
```

---

## Promotional Text (170 chars, can update without resubmission)

```
Track real changes in your face week by week. AR-aligned scans, honest scoring, adaptive routine. Built for serious progress, not filters. 7-day free trial.
```

---

## Keywords (100 chars max, comma-separated)

```
face tracker,skin tracker,glow up,skincare,face score,beauty progress,aging,routine,glow,track skin
```

(Each keyword is targeted. Avoid stuffing — Apple penalizes that. The combinations work because Apple's algorithm matches across them.)

---

## What's New (for first release)

```
Welcome to Vela. Your weekly face tracking starts here.
```

---

## Support URL

`https://getvela.app/support`

## Marketing URL (optional)

`https://getvela.app`

## Privacy Policy URL

`https://getvela.app/privacy`

---

## Screenshots

Required sizes for iOS submission:
- **6.9" Display (iPhone 16 Pro Max):** 1320 × 2868 pixels — REQUIRED
- **6.5" Display (iPhone 14 Plus, etc):** 1284 × 2778 pixels — required if you support older phones in App Store metadata
- **5.5" Display:** Not required for new apps

You need 3-10 screenshots per size. Plan for 6.

### Screenshot Plan (6 screens, in order)

**1. Hero — The Score**
Full screenshot of the dashboard showing the score card. Headline overlay text:
> "Honest scoring. No filters."

Caption underneath in image:
> "Your weekly Vela score across five real metrics."

**2. The Capture**
Screenshot of the capture screen mid-alignment, showing the AR overlay with the previous photo's silhouette. Headline:
> "AR-aligned scans"

Caption:
> "Every photo lines up with the last. Comparisons you can trust."

**3. The Comparison**
Slider compare view, week 1 vs week 12. Headline:
> "Real before and after"

Caption:
> "Drag to see what changed."

**4. The Routine**
Daily routine card with a few tasks visible. Headline:
> "Routine that adapts"

Caption:
> "Targets your weakest areas, evolves with your progress."

**5. The Trends**
Trend chart showing score progression over weeks. Headline:
> "See your real progress"

Caption:
> "Weekly data, not vibes."

**6. Privacy**
A privacy-focused screen showing storage settings. Headline:
> "Photos stay on your phone"

Caption:
> "Private by design. Export or delete anytime."

### Screenshot Template Specs

- **Background:** Soft gradient using `#FAFAF8` to `#F0F0EE`
- **Headline:** SF Pro Display Bold, 48pt, color `#1A1A1A`
- **Caption:** SF Pro Display Regular, 22pt, color `#6B6B6B`
- **Phone frame:** Optional but recommended (use ApplePilot or Mockuuups Studio)
- **Margin from edges:** 80pt minimum

### Tools for Screenshot Creation
- Figma with iOS 17 mockup kit (free)
- Mockuuups Studio (paid, fastest)
- Apple's Sketch resources for marketing (free)

---

## App Preview Video (Optional but recommended)

15-30 seconds showing the capture flow and a comparison reveal. Apple requires:
- 1080 × 1920 (vertical)
- H.264 codec
- AAC audio (silent is fine)
- 30 fps
- 15-30 seconds

Suggested storyboard:
1. (0-3s) Vela logo, off-white background, sound design tone
2. (3-8s) Capture screen with face appearing, alignment overlay
3. (8-13s) Score reveal animation
4. (13-20s) Slider comparison drag — week 1 to week 12
5. (20-25s) Routine card briefly visible
6. (25-30s) "vela" wordmark, "track yours at getvela.app"

---

## App Store Connect Setup

### Step-by-step

1. **Create App in App Store Connect**
   - Sign in to https://appstoreconnect.apple.com
   - My Apps → "+" → New App
   - Platform: iOS
   - Name: Vela
   - Primary Language: English (US)
   - Bundle ID: select `com.velapp.vela` (created in Apple Developer portal)
   - SKU: `vela_ios_001`

2. **Configure App Information**
   - Privacy Policy URL: https://getvela.app/privacy
   - Category: Health & Fitness
   - Sub-category: Lifestyle
   - Content Rights: Yes, contains third-party content (RevenueCat SDK, Supabase)

3. **Configure Pricing & Availability**
   - Price: Free (with in-app subscription)
   - Availability: All countries to start, or restrict initially to test in fewer markets

4. **Create In-App Purchases**
   
   **Annual Subscription:**
   - Reference Name: `Vela Annual`
   - Product ID: `com.velapp.vela.annual`
   - Subscription Group: `Vela Premium`
   - Subscription Duration: 1 Year
   - Price: $79.00 USD (Tier 79)
   - Free Trial: 7 days
   - Localized Display Name: `Vela Annual`
   - Localized Description: `Annual subscription to Vela. Cancel anytime in iOS Settings.`
   
   **Monthly Subscription:**
   - Reference Name: `Vela Monthly`
   - Product ID: `com.velapp.vela.monthly`
   - Subscription Group: `Vela Premium`
   - Subscription Duration: 1 Month
   - Price: $9.99 USD (Tier 9)
   - Free Trial: 7 days
   - Localized Display Name: `Vela Monthly`
   - Localized Description: `Monthly subscription to Vela. Cancel anytime in iOS Settings.`

5. **Configure App Privacy (REQUIRED)**
   
   The App Privacy section requires you to declare what data is collected. For Vela:
   
   **Data Used to Track You:** None
   
   **Data Linked to You:**
   - Email Address (Account creation, App Functionality)
   - User ID (Account creation, App Functionality)
   - Health & Fitness — Other Health Data (App Functionality, Analytics)
     - This covers your scan scores, routine completion data, and profile info
   
   **Data Not Linked to You:**
   - Crash Data (App Functionality) — if you add Sentry
   - Performance Data (App Functionality) — if you add Sentry
   
   **NOT Collected:**
   - Photos — these stay on device, never leave
   - Precise location, contacts, audio, browsing history, search history, financial info, health records (except scores), fitness, sensitive info, payment info (handled by Apple/RevenueCat)

6. **Configure Sign in with Apple**
   - Required because you're using Apple Authentication
   - Capability already configured in Xcode/Expo via `expo-apple-authentication`
   - Make sure Bundle ID has Sign in with Apple capability enabled in Apple Developer Portal

---

## App Review Information

### Demo Account
Reviewers need to bypass the paywall. Provide:
- **Email:** `appreview@getvela.app`
- **Password:** Use a separate review-only password
- **Notes for Reviewer:**

```
**IMPORTANT — Vela requires a physical iPhone with a TrueDepth camera
(iPhone X or later). The app will not function on the iOS Simulator or
on older devices. Please test on a physical iPhone X or later.**

This account is pre-configured with completed onboarding and an active premium subscription so you can review all features. 

The app captures three guided photos per scan with AR-assisted alignment, computes facial wellness scores on-device, and adapts a daily routine. Photos are stored locally only. 

The hard paywall after first scan is intentional — Vela is a paid wellness tool with no free tier. Tapping the close button shows a "Subscription Required" screen rather than dismissing — this is the intended product flow.

The 7-day free trial is configured via Apple's introductory pricing on both the annual and monthly subscriptions. Restore Purchases is available on the paywall and in Settings.

Account deletion is implemented in Settings → Account → Delete account.

Medical disclaimer is in Settings → About → "Medical disclaimer." The exact wording matches the App Store listing description (line ~77 of this file) — both surfaces use the same string verbatim. If either is updated, both must be.

Support contact: support@getvela.app
```

### Contact Information for Review
- **First Name:** [Your name]
- **Last Name:** [Your name]
- **Phone:** [Your phone with country code]
- **Email:** [Your email]

### Notes Field

```
Vela requires a physical iPhone with a TrueDepth camera (iPhone X or later) to use the AR face tracking feature. The app will not function on iOS Simulator or older devices.

The app uses:
- ARKit (face tracking — requires TrueDepth)
- Camera (photo capture)
- Notifications (weekly check-in reminders, optional)
- Photo Library (optional, only when user explicitly saves a share card)

All facial analysis happens on-device. Photos never leave the user's phone. Only numerical scores and metadata sync to Supabase for cross-device data.

If you cannot test the camera/AR features on your review device, please let us know and we can provide additional context.
```

---

## Common Rejection Risks & Mitigations

### Risk 1: Subscription compliance (Guideline 3.1.2)

Apple may reject if:
- Subscription terms aren't clearly visible before purchase
- Restore Purchases isn't easy to find
- Auto-renewal isn't clearly disclosed
- Trial terms aren't transparent

**Mitigation in our paywall:**
- "7-Day Free Trial" prominently displayed
- "$79/year" and "$9.99/month" both visible
- "No dark patterns. Cancel anytime in Settings." trust line
- Restore Purchases visible (legal_links section)
- Privacy and Terms linked

### Risk 2: Hard paywall blocking (Guideline 3.1.1)

Apple has been more lenient about hard paywalls in 2024-2025 for premium tools, but to be safe:
- The "Subscription Required" dead-end screen is correct (not a free fallback)
- Restore Purchases is always available
- Privacy and Terms links are accessible

If rejected on paywall structure, prepare to argue: "Vela is a measurement and tracking tool, not a content app. The user has already received value (initial scan and baseline scores) before encountering the paywall."

### Risk 3: Account Deletion (Guideline 5.1.1(v))

- Implemented via Edge Function `delete-user`
- Visible in Settings → Account → Delete account
- Requires confirmation
- Truly deletes auth user and all linked data

### Risk 4: Medical/Health Claims (Guideline 1.4.1)

Vela is positioned as wellness tracking, not medical. Make sure:
- No specific medical claims in copy (don't say "treats acne")
- Medical disclaimer is in Settings
- App description includes "wellness tool, not medical advice"

### Risk 5: Privacy Policy Compliance (Guideline 5.1.1)

- Privacy Policy must be accessible in-app and on app store listing
- Must accurately describe what data is collected
- Must describe how data is used and shared
- Must include user rights (access, deletion)

---

## Privacy Policy Outline (host at getvela.app/privacy)

```markdown
# Vela Privacy Policy
Last updated: [DATE]

## Summary
Vela is built with privacy as a core principle. Your photos stay on your device. We collect only the minimum data needed to provide the service.

## Information We Collect

### On-Device Only (Never Uploaded)
- Photos captured during scans
- Raw facial geometric data
- Local routine completion data

### Synced to Our Servers
- Account email (for sign-in)
- Profile information you provide during onboarding
- Numerical scan scores (no images)
- Subscription status (via RevenueCat)

### From Apple
- Sign in with Apple identifier (if used)
- App Store Connect transaction data (for subscription verification)

## How We Use Information
- Provide the Vela service
- Personalize your routine and scoring
- Send notifications (only with permission)
- Improve the service (aggregate, anonymized)

## How We Share Information
We do NOT sell your information. We share data only with:
- Supabase (data hosting infrastructure)
- RevenueCat (subscription management)
- OpenAI (AI processing — only score data and profile attributes, never photos)
- Apple (App Store transactions)

## Your Rights
- Export all your data: Settings → Privacy → Export my data
- Delete your account: Settings → Account → Delete account
- Disable notifications: Settings → Notifications

## Data Retention
- Active accounts: data retained while subscription is active
- Deleted accounts: full deletion within 30 days

## Children's Privacy
Vela is not directed to children under 13. We do not knowingly collect data from children under 13.

## Contact
Privacy questions: privacy@getvela.app
```

(Full policy will be longer with proper legal language — work with a lawyer or use Termly/iubenda templates.)

---

## Pre-Submission Checklist

Before hitting submit:

- [ ] App tested on physical iPhone (iOS 15+, with TrueDepth camera)
- [ ] All AppIcon sizes generated and added to project
- [ ] Launch screen looks correct on multiple device sizes
- [ ] Privacy Policy and Terms hosted and accessible
- [ ] Support email set up and tested
- [ ] Demo account created with completed onboarding and active subscription
- [ ] Screenshots created for required device sizes
- [ ] App Preview video uploaded (optional)
- [ ] In-app purchases configured and tested in TestFlight sandbox
- [ ] Sign in with Apple working
- [ ] Restore Purchases working
- [ ] Account deletion working end-to-end
- [ ] All required disclosures complete in App Privacy section
- [ ] Reviewer notes complete and accurate
- [ ] EAS build submitted and uploaded via `eas submit`
- [ ] Build selected in App Store Connect for review
```
