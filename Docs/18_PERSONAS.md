# 18 — Personas

## Implementation note — persona inference

The personas below are not just design fiction. They drive analytics segmentation via the `inferPersona()` function in **file 25 (canonical)**. Every authenticated user gets a `persona_inferred` user property in PostHog, computed deterministically from their onboarding profile. The function is called at onboarding completion and refreshed when material profile fields change.

The decision tree maps:
- **Priya** → has active treatments OR primary goal = `treatment_tracking`
- **Jordan** → primary goal = `overall_confidence` OR age 50+ OR non-binary + neutral framework
- **Marcus** → masculine framework + age 18–35 + optimization goals (`jawline_definition`, `facial_fat`, `hair_concerns`)
- **Maya** → feminine framework + age 22–45 + tracking goals (`skin_clarity`, `aging_signs`, `dark_circles`)
- **Other** → ~10% who fall between personas (real bucket in dashboards, not hidden)

Read file 25's "Persona Inference (canonical)" section for the full function.

---

## Overview
The four primary user personas for Vela. These aren't marketing personas — they're product personas. Every feature decision should be tested against at least one. If a feature doesn't serve any of these four, it doesn't ship.

---

## Persona 1: Maya, 32 — The Quantified Self Aspirant

### Demographics
- 32 years old, woman
- Marketing manager at a SaaS company
- San Francisco, CA
- Combination skin, mild adult hormonal acne
- Already uses Oura ring and MyFitnessPal
- Income: $130k/year

### Psychographics
- Believes data leads to better decisions
- Skeptical of beauty industry marketing
- Reads /r/SkincareAddiction and "skincare science" Substacks
- Has tried 4-5 skincare apps, abandoned all of them
- Notices fine lines starting and feels "behind" peers

### Goals
- Have a routine that actually works (and know that it works)
- Track measurable progress, not just "feel" progress
- Catch aging signs early
- Be the kind of person who has their skin together by 35

### Frustrations
- Beauty apps treat her like she's 14
- "Glow up" rhetoric makes her cringe
- Doesn't trust subjective skincare advice
- Tried to do progress photos with her camera roll — gave up because angles never matched

### How Vela serves Maya
- The AR alignment solves her #1 frustration with self-tracking
- Quantified scores feel like Oura
- Honest, explainable changes rather than "amazing progress!"
- Premium pricing signals seriousness

### What would make Maya churn
- Generic routine that doesn't account for her hormonal acne
- Vague AI explanations like "your skin looks better"
- Discovering competitor with deeper data export
- Feeling that the app is "just" for vanity

### Use case patterns
- Captures Sunday mornings, ~9am
- Reviews her dashboard 2-3 times per week
- Checks routine completion in the evening
- Compares week 1 vs current every 4-6 weeks
- Will consider sharing one "wow moment" comparison at month 3

---

## Persona 2: Marcus, 28 — The Optimization-Curious Man

### Demographics
- 28 years old, man
- Software engineer, mid-level
- Austin, TX
- Olive skin, occasional breakouts on jaw and chest
- Started a gym routine 18 months ago, sees physical progress as identity
- Single, dating
- Income: $145k/year

### Psychographics
- Reads Andrew Huberman, Peter Attia
- Tracks workouts in Strong app
- Has experimented with mewing, jaw exercises
- Curious about looksmaxxing but turned off by the toxic edges
- Wants to look his best for 30s

### Goals
- Sharper jawline, less under-eye darkness
- Better skin (he barely takes care of it now)
- Feel more confident in dating
- Catch signs of male pattern hair loss early

### Frustrations
- Existing looksmaxxing apps are predatory and weird
- Self-conscious about caring how he looks (cultural baggage)
- Doesn't know which products actually work for men
- Believes his skin is "fine" when it has clear room for improvement

### How Vela serves Marcus
- "Track your face properly" framing — measurement, not vanity
- Routine that includes simple, masculine-coded recommendations (cleanser, moisturizer, SPF)
- Definition score speaks his fitness-tracking language
- Privacy on-device matters because he's slightly embarrassed
- The Oura comparison clicks for him

### What would make Marcus churn
- Routine that feels feminine-coded ("toner," "essence")
- Pink/floral design language
- Recommendations he'd be embarrassed to be seen using
- Slow ROI — he expects measurable progress in 6-8 weeks

### Use case patterns
- Captures Sunday evenings before the work week
- Tracks routine sporadically — doesn't check daily
- Compares aggressively at week 8 and 12
- Highly motivated by trend lines (loves the dashboard)
- Won't share publicly but might show a friend privately

---

## Persona 3: Priya, 38 — The Treatment Tracker

### Demographics
- 38 years old, woman
- Pediatrician (busy professional)
- Boston, MA
- South Asian, Fitzpatrick type 4
- Started Tretinoin 3 months ago, considering Botox
- Married, 1 kid (4 years old)
- Income: $280k/year

### Psychographics
- Medically literate, evidence-driven
- Has a derm she sees twice a year
- Hyperpigmentation around mouth and cheeks (post-pregnancy)
- Knows her skin behavior intimately but lacks longitudinal data
- Limited time — needs efficient tools

### Goals
- Document Tretinoin progress objectively (vs. her own perception)
- Track hyperpigmentation across treatments
- Get a baseline before considering Botox
- Have data to bring to her dermatologist

### Frustrations
- Most beauty apps are aimed at teens/early 20s
- Skin tone bias in scoring algorithms (apps default to "lighter is better")
- Inability to export her own data
- Generic advice that doesn't account for medical Rx

### How Vela serves Priya
- Calibrated scoring across skin tones is essential
- Honest, slow-paced tracking (Tretinoin takes 3-6 months to show)
- Data export feature for her derm appointments
- "Treatment tracking" as primary goal option in onboarding
- Medical disclaimer respects her professional context

### Priya's v1 path (before file 34 ships at v1.5)

Treatment tracking (file 34) is v1.5; Priya needs SOMETHING for treatments at v1. The minimum-viable Priya hook for v1:

- Onboarding Q24 ("Are you on any active treatments?") — multi-select from a curated list (tretinoin, retinol, accutane, finasteride, hydroquinone, vitamin C, niacinamide, "other"). Stores `profile.activeTreatments: TreatmentId[]`.
- Routine engine (file 09) reads `activeTreatments` and applies the same complementary-task / contraindicated-task biasing rules that file 34's full treatment tracking would apply. Just without the timeline view.
- Settings → Daily routine adds an "Active treatments" row that lets her edit the list.

This gives Priya a coherent v1 experience without v1 carrying the full treatment-tracking surface. The data captured here is forward-compatible with file 34 — when v1.5 ships, her existing list seeds her real treatment timelines.

### What would make Priya churn
- Any indication of skin tone bias in scoring
- Routine recommending things contraindicated with Tretinoin
- AI confidently making medical claims
- Lack of data portability

### Use case patterns
- Captures consistently every Saturday at 7am before kid wakes up
- Routine completion is high (she's disciplined)
- Cares most about hyperpigmentation sub-metric
- Will export data before each derm appointment
- Likely 2-year subscriber if product delivers

---

## Persona 4: Jordan, 45 — The Considered Comeback

### Demographics
- 45 years old, non-binary, they/them
- HR director at mid-size company
- Chicago, IL
- Caucasian, fair skin (Fitzpatrick 2)
- Recently divorced, ready to reinvest in self
- Has neglected skincare for years
- Income: $165k/year

### Psychographics
- Coming back to caring about appearance after a hard period
- Wants to feel good, not just look good
- Skeptical of social media beauty culture
- Values privacy strongly
- Self-conscious about visible aging signs

### Goals
- Establish a serious skincare routine for the first time
- Track real changes to stay motivated
- Feel investment is worthwhile
- Avoid feeling "behind" peers who started earlier

### Frustrations
- Doesn't know where to start
- Most apps assume base knowledge they don't have
- Feels embarrassed about caring "this late"
- Doesn't want algorithmic shame for not having a routine yet

### How Vela serves Jordan
- Adaptive routine starts simple, grows complex over time
- Non-judgmental tone — no "should have started 10 years ago" energy
- Non-binary onboarding option respects identity
- Definition and vitality metrics matter more to them than skin clarity
- Photos stay on device — privacy is essential post-divorce

### Jordan's voice rule (lint-enforced)

The "no-judgment" voice rule from this persona must be carried into every AI prompt that generates copy for users with profiles matching Jordan's pattern (older, long lapse, non-binary or ambiguous gender, comeback framing in onboarding).

Add to file 06 every system prompt that generates user-facing copy: a `PERSONA_HINT` context block —

```
PERSONA_HINT (when user.daysSinceFirstScan === 0 && user.age >= 40):
- Bias toward "actionable baseline" framing.
- NEVER use: "should have", "would have", "if only", "behind", "ahead",
  "starting late", "make up for", "catch up".
- Prefer: "from here", "starting today", "your baseline", "we'll track from now".
- The user is meeting themselves where they are; never imply they should
  be somewhere else.
```

CI lint catches the forbidden phrases globally; the prompt-level rule prevents AI from generating them.

### What would make Jordan churn
- Routine that overwhelms (too many tasks at once)
- Comparison-based language ("your peers' scores")
- Lack of flexibility for non-binary identity
- Vibes of "you're behind, here's how to catch up"

### Use case patterns
- Captures Wednesday mornings (their day off)
- Routine completion ramps up slowly — week 1 might be 1-2 tasks, week 8 might be 5
- Cares deeply about gradual progress rather than fast results
- Will be a long-term subscriber (1+ years) if onboarding is right
- Unlikely to share comparisons publicly, may share with a close friend

---

## Anti-Persona: Who Vela is NOT for

These users will be unhappy with Vela. The product should not bend to serve them.

### "Brad," 19 — The Looksmaxxer
- Wants to "level up" jawline through bone smashing, mewing, hardmaxxing
- Shopping for a tool that confirms toxic body dysmorphia
- Will rate Vela 1 star for not validating extreme interventions
- Vela should explicitly NOT recommend mewing, jaw exercises claiming bone changes, or any unproven invasive techniques

### "Ashley," 24 — The Filter Generation
- Wants to be told she's beautiful, hot, has high facial harmony
- Looking for validation, not measurement
- Will churn within a week of seeing realistic baseline scores
- Vela's honest scoring intentionally selects against this user

### "Casual Skinclane," 35 — The Free Tier Hunter
- Will only use a free version
- Has no intention of paying for tracking
- Best served by competitor apps with ads
- Vela's hard paywall intentionally selects against this user

### "Beauty Influencer," 27 — The Content Mill
- Wants raw photos to use in content
- Cares about shareability over measurement
- Will demand more aggressive social features
- Vela's "shareable but not central" approach is intentionally limited for this user

---

## How to Use Personas in Product Decisions

When designing a feature, run it through this:

1. **Which persona benefits most?** If none, kill the feature.
2. **Which persona might it alienate?** Mitigate or accept the trade-off.
3. **Does it match the voice?** Test against persona quotes:
   - Maya: "Show me data, not feelings."
   - Marcus: "What's the highest-leverage thing I can do?"
   - Priya: "Be evidence-based and respect my time."
   - Jordan: "Don't make me feel behind."
4. **Would the anti-personas like it?** If yes, reconsider.

### Example: "Add a daily 'rate your face' selfie feature"
- Maya: ❌ feels frivolous, not data-driven
- Marcus: ❌ adds friction without proportional value
- Priya: ❌ no time
- Jordan: ❌ feels self-objectifying
- Anti-personas: ✅ Brad and Ashley would love it
- **Decision: kill it.**

### Example: "Add export data feature"
- Maya: ✅ wants data portability
- Marcus: ⚪ doesn't care
- Priya: ✅✅ critical for derm visits
- Jordan: ✅ values privacy and ownership
- Anti-personas: ⚪ neutral
- **Decision: ship it.**

---

## Persona Distribution Estimates

For planning purposes (rough estimates, validate with first 1000 users):

- **Maya-type users:** ~35% (largest segment, highest LTV)
- **Marcus-type users:** ~25% (growing fast, middle LTV)
- **Priya-type users:** ~15% (smaller but highest retention)
- **Jordan-type users:** ~15% (steady, long-term subscribers)
- **Other / between personas:** ~10%

This means roughly 60% are health/data-conscious women in their 30s — design accordingly without alienating the others.
