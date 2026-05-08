# 21 — Brand System

## Overview
Vela's brand is calm, premium, intelligent, and direct. The brand exists in three layers: **identity** (logo, wordmark, color), **voice** (how we write), and **expression** (how it feels). This document is the source of truth for all three.

If a piece of marketing, copy, or UI doesn't match this guide, fix it before shipping.

---

## Brand Positioning

### One-line
> Vela is the serious face tracker. AR-aligned scans, honest scoring, real progress.

### Elevator pitch (30 sec)
> Most people store selfies in their camera roll and hope for the best. Vela gives you a real record of how your face changes — week by week, with comparable photos and honest scoring. Built for adults who want to track skincare, treatments, and grooming as seriously as they track their workouts.

### Manifesto (90 sec)
> Beauty apps treat you like a teenager. Looksmaxxing apps treat you like a body to optimize. Vela treats you like an adult who wants real data about your face.
>
> We use AR alignment so your weekly photos are actually comparable. We score five dimensions of facial wellness and explain what changed. We generate a routine that adapts to your data, not generic skincare advice.
>
> Your photos stay on your device. Your data is yours. Your progress is real.
>
> No filters. No gimmicks. No "level up." Just measurement, honest feedback, and a routine that actually works.

### Category positioning
- **Adjacent to:** Oura, Whoop, MyFitnessPal, Strong
- **Distinct from:** Umax, FaceCard, LooksMax, beauty filter apps
- **Not a:** dating app, social network, AI girlfriend, beauty marketplace

---

## Visual Identity (locked)

The brand renders as a **warm cream surface, espresso text, serif headlines, and a single pink → mauve → dusty-blue gradient** for primary actions. This is the locked direction. See `15_DESIGN_SYSTEM.md` for tokens.

- **Surface:** cream radial wash (cream50 → cream100), white reserved for raised cards.
- **Text:** espresso900 (`#241F1A`). Pure black is forbidden anywhere in product UI.
- **Headlines:** serif (system serif on iOS / serif fallback on Android). Used for editorial moments — welcome, score reveal, paywall, section markers.
- **Body / labels / data:** sans, weight 400 or 500. Never 700.
- **Primary action color:** the `VelaPrimary` gradient (135°, pink300 → mauve500 → blue300). Used on every primary CTA, active toggle, "done" indicator, selected option, and the brand wordmark accent. Used sparingly so it stays a signature.
- **Restraint:** 0.5px hairline borders in `cream200`, generous whitespace, large radii (16–28). No drop shadows on light theme.

If a marketing surface uses a flat blue button or pure black text, it's off-brand.

---

## Logo & Wordmark

### Primary Wordmark

The Vela wordmark is set in **serif italic** — the only piece of UI that *always* uses the serif. The italic angle gives a slight handwritten quality that pairs with the warm cream surface; it reads as a journal mark, not a tech-company logo.

```
Wordmark: vela

Specifications:
- Lowercase always
- Family: serif (system serif — New York on iOS, serif fallback on Android)
- Style: italic
- Weight: 500
- Letter-spacing: 0.5px (subtle, do not stretch)
- Color: text.primary in current theme

Optional gradient lockup (use sparingly):
- The wordmark may be filled with VelaPrimary on splash, app store screenshots,
  and the paywall hero. Never on small-size in-app placements (looks like a sticker).

Use cases:
- Standard (espresso): App headers, watermarks on share cards, micro placements.
- Gradient lockup: Splash, paywall hero, marketing key art.
```

### Implementation

```typescript
// src/components/brand/Wordmark.tsx
import { Platform, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { useColors, useTheme } from '@/theme/ThemeContext';
import { VelaPrimary } from '@/theme/gradients';

interface Props {
  size?: 'small' | 'medium' | 'large' | 'hero';
  variant?: 'standard' | 'gradient'; // standard = espresso; gradient = brand lockup
}

const SIZE_MAP = { small: 14, medium: 18, large: 28, hero: 44 };

const FONT_SERIF = Platform.select({ ios: 'New York', android: 'serif', default: 'serif' });

export function Wordmark({ size = 'medium', variant = 'standard' }: Props) {
  const colors = useColors();
  const { mode } = useTheme();
  const fontSize = SIZE_MAP[size];

  const baseStyle = {
    fontFamily: FONT_SERIF,
    fontSize,
    fontStyle: 'italic' as const,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  };

  if (variant === 'gradient') {
    const g = mode === 'dark' ? VelaPrimary.dark : VelaPrimary.light;
    return (
      <MaskedView
        maskElement={
          <Text style={[baseStyle, { backgroundColor: 'transparent', color: 'black' }]}>vela</Text>
        }
      >
        <LinearGradient
          colors={g.stops.map((s) => s.color)}
          locations={g.stops.map((s) => s.offset)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[baseStyle, { opacity: 0 }]}>vela</Text>
        </LinearGradient>
      </MaskedView>
    );
  }

  return <Text style={[baseStyle, { color: colors.text.primary }]}>vela</Text>;
}
```

> Add `npx expo install @react-native-masked-view/masked-view` for the gradient lockup. The masked view is RN's standard gradient-text trick — keeps the type sharp at any size.

### App Icon

The app icon is **not** the wordmark. It's a glyph derived from the brand concept:

> A subtle V-shape evoking a sail, a constellation, or a ray of light. Geometric, calm.

**Specifications:**
- 1024×1024 master file.
- Background: cream50 `#FAF6EE` (light variant) or charcoal950 `#16110D` (dark variant — used for the macOS / iPad Pro icon, not the iPhone icon).
- Glyph: filled with `VelaPrimary` gradient (the only place the gradient appears on the icon — and only at icon scale, never inside the app).
- Glyph occupies ~38% of icon area, optically centered.
- Corners: iOS auto-rounds, no border or shadow.

**Adaptive variants required:**
- `1024×1024` master
- All standard iOS sizes auto-generated (Expo handles this)
- Notification icon: 96×96 monochrome white-on-transparent
- Splash icon: same glyph, larger, on background color

---

## Color Identity

(Tokens defined in file 15. Brand-specific usage notes here.)

### Primary Brand Color
**Vela Blue:** `#5B8DB8` (light mode) / `#7AA6CB` (dark mode)

This is the only "brand color" that appears in marketing. It's intentionally desaturated — saturation reads as "youth/beauty app." Vela's blue should feel like dawn light, not Instagram.

### Accent Color Hierarchy

When designing marketing materials:
1. **Background:** Warm off-white (`#FAFAF8`) for light, near-black (`#0F1218`) for dark
2. **Primary text:** High contrast neutral
3. **Brand accent:** Used sparingly, for calls to action only
4. **Sub-score colors:** Only used when displaying actual sub-scores; never as decoration

### What NOT to do
- Don't use bright/saturated blues
- Don't add gradients to the wordmark
- Don't use multiple brand colors
- Don't use stock photos (we use real product UI screenshots)
- Don't use rounded sans-serif fonts (looks like a wellness startup)

---

## Voice & Tone

Vela's voice is the most distinctive thing about the brand. This is where we differentiate from every other app in the category.

### Editorial voice (Vela Journal — file 50)

The Vela Journal — a monthly long-form essay channel — uses an *editorial extension* of this voice, not a different voice. The same rules apply, with these additions:

- **No "I think" hedging.** The author makes claims; the prose carries the weight.
- **No second-person plural in essays.** *"We at Vela..."* never appears. Author writes in first person singular when reflecting; in third person when explaining.
- **Cite when claiming.** Every health claim is sourced inline; references appear at the end of each essay.
- **Avoid "amazing", "incredible", "transformation", "glow up"** — the consumer-app forbidden words apply with extra force in editorial writing.
- **Avoid wellness-industry jargon.** Phrases like *"self-care journey"*, *"radiant glow"*, *"your best self"* are forbidden in essays.
- **Earn personal narrative.** The writer can reference their own experience when it serves the topic. They cannot use the journal as a personal blog.

Reference points for calibration: the first chapter of *Why We Sleep* (Walker), Susan Sontag's *On Photography*, early issues of Stratechery. Plainly literary, considered, never breezy.

Three-reviewer pipeline: every essay reviewed by a brand-voice reviewer, the medical advisor (when health claims are present), and a copy editor before publication. See `50_EVIDENCE_VOICE.md` for the full editorial process.

### Forbidden words (consolidated list)

The following words are forbidden in *all* user-facing copy, AI prompts, notifications, share cards, journal essays, and emails. CI lint enforces:

```
amazing, incredible, transformation, glow, glowing, glow up, miracle,
breakthrough, best version, your best self, radiant, fight, combat, defeat,
reverse, restore, regain, anti-aging, aging issue, problem area, youthful,
youthful-ize, self-care journey, wellness journey, crushed, crushing,
killing, savage, queen, slay, yass
```

The list is the union of file 21's existing rules + the additions from files 36 (aging-band copy), 39 (streaks), 41 (forecast copy), 44 (experiment verdict), 46 (lapsed-user emails), and 50 (journal). Owned canonically here.

### Voice Attributes

**Direct.** We say what we mean. No hedge words like "might," "perhaps," "could potentially."
- ❌ "Your skin might be doing slightly better this week, perhaps."
- ✅ "Your skin score is up 4 points. Even tone improved in the cheek area."

**Honest.** We don't oversell. If data is flat, we say it's flat.
- ❌ "Amazing progress! You're glowing!"
- ✅ "Your scores held steady this week. Real changes often take 8-12 weeks."

**Adult.** We treat the user like an intelligent adult.
- ❌ "Yass, look at YOU go, beautiful! 💖"
- ✅ "Strong week. Your routine is working."

**Quiet.** We don't shout. No exclamation marks except for genuine celebration.
- ❌ "AMAZING NEWS!! YOUR SCORE WENT UP!!!"
- ✅ "Your overall score improved by 5 points this week."

**Specific.** We reference data, not feelings.
- ❌ "You look great today!"
- ✅ "Your skin tone variance dropped to 0.18 this week — that's measurably more even than last week."

**Respectful of effort.** We never imply users should have started earlier.
- ❌ "If only you'd started 10 years ago..."
- ✅ "Today's a good baseline. Let's track from here."

### Tone in Different Contexts

The voice stays consistent. Tone shifts slightly based on context.

| Context | Tone |
|---------|------|
| Onboarding | Welcoming, gentle, professional |
| Score reveal | Factual, measured, neutral |
| Score went up | Quietly proud, brief celebration |
| Score went down | Honest, neither alarmed nor dismissive |
| Streak achievement | Acknowledging, not gushing |
| Error message | Calm, helpful, never blaming user |
| Subscription paywall | Confident, no guilt-trip |
| Account deletion | Respectful, no save-flow guilt |

### Forbidden Words & Phrases

These words are banned from the entire app and all marketing:

**Looksmaxxing vocabulary:**
- "level up", "glow up", "ascend", "your potential"
- "hardmaxxing", "softmaxxing", any "-maxxing"
- "halo", "frame", "face card"
- "mogged", "mogging"
- "Looksmaxx", "Looksmax", "looksmaxxing"

**Beauty app hyperbole:**
- "amazing", "stunning", "beautiful", "gorgeous" (when describing user)
- "queen", "girl", "babe"
- Excessive exclamation points
- Emoji in core copy (only OK in user-controlled content)

**Empty validation:**
- "You're perfect just the way you are!"
- "Beauty is on the inside!"
- "Don't compare yourself to others!"
(These read as condescending in a measurement tool. Vela's value prop IS comparison and improvement.)

**Medical claims:**
- "Treats", "cures", "fixes" (skin conditions)
- "Reverse aging", "anti-aging" claims
- "Boost collagen" (without evidence)

### Voice Examples Across Surfaces

#### Push notification examples

**Weekly check-in:**
- ✅ "Time for your weekly Vela. 90 seconds to see this week's changes."
- ❌ "Hey beautiful, ready for your weekly glow-up?"

**Missed scan, day 2:**
- ✅ "Your weekly Vela is overdue. Take 90 seconds — your scoring depends on consistency."
- ❌ "Don't break your streak! Capture now! 🔥"

**Milestone:**
- ✅ "30 days of Vela. Your first monthly reveal is ready."
- ❌ "OMG you've been with us for a whole month! Look at you go! 🎉"

#### Onboarding micro-payoff examples

**After Section A (combination skin, 32, woman):**
- ✅ "Combination skin in your 30s usually responds well to consistent ingredients rather than aggressive ones. Let's understand your face in more detail."
- ❌ "Yay! Thanks for sharing! You're amazing! Now tell us more about you!"

#### Score explanation examples

**Score went up:**
- ✅ "Your skin tone evenness improved this week, particularly in the cheek area. Reduced redness suggests your routine is calming inflammation."
- ❌ "Wow! Your skin is glowing this week! Keep slaying! ✨"

**Score went down:**
- ✅ "Your jaw definition shifted slightly. This often correlates with sleep, hydration, and sodium intake."
- ❌ "Your jawline is a bit puffy today. Don't worry though — you got this!"

### Error message voice rules (canonical)

Every error string in the app follows these rules. Lint-enforced.

- **Calm.** No "Oops!", no "Whoops!", no exclamation marks anywhere.
- **Never blame the user.** Forbidden phrases: "You forgot to", "You haven't", "Your input is invalid", "You did this wrong".
- **Always include a recovery path.** Never just state the failure; tell the user what to do.
- **Prefer plain English to error codes.** Never surface HTTP status codes or stack traces; those go to Sentry.
- **Specific, not generic.** "Couldn't reach our servers" beats "Something went wrong."

Examples:

- ✅ "Couldn't reach our servers. Check your connection and try again."
- ✅ "We couldn't save that scan right now. Your photos are still here — we'll try again next time you open Vela."
- ✅ "That email doesn't look quite right."
- ❌ "Oops! Something went wrong! Please try again later."
- ❌ "Error 500: Internal Server Error"
- ❌ "You entered an invalid email."
- ❌ "Failed to save."

### Wordmark gradient on share cards

When the gradient wordmark appears on a share card (file 13), it uses the **user's current theme mode at the moment of share** — not a fixed light or dark variant. A user in dark mode shares a dark-themed card; a user in light mode shares a light-themed card. The accent gradient itself (VelaPrimary) is identical across themes; the surrounding cream/espresso swaps.

#### Error message examples

**Network error during AI processing:**
- ✅ "Couldn't reach our servers right now. Your photos and basic scores are saved — try again in a few minutes for the full analysis."
- ❌ "Oops! Something went wrong. 😅 Please try again later!"

**Camera permission denied:**
- ✅ "Vela needs camera access to capture your scan. Open Settings to allow it, or come back later."
- ❌ "Uh oh! We need your camera! Please give us access pretty please?"

---

## Tagline Library

For different surfaces, different lengths.

| Length | Tagline |
|--------|---------|
| 4 words | Track your face properly. |
| 6 words | Honest scoring. Real progress. No filters. |
| 8 words | Weekly aligned scans. Quantified results. Adaptive routine. |
| 12 words | The serious face tracker. Built for adults who want real data. |
| Twitter bio | Track your face the way you track your workouts. AR-aligned scans, honest scoring, adaptive routine. iOS only. |

---

## Marketing Patterns

### Always do
- Show real product UI in screenshots (no fake renders)
- Reference data in promo copy ("4-week improvements visible")
- Use customer language in testimonials
- Include privacy mentions early
- Include pricing prominently
- Use the wordmark, not custom-styled "Vela"

### Never do
- Stock photos of perfect-looking faces
- Vague before/after promises ("transform your skin!")
- "Limited time offer" or any urgency manipulation
- Excessive emojis in marketing
- Compare to competitors by name
- Use AI-generated faces in marketing
- Sponsored posts that don't disclose

---

## Asset Files & Specifications

The brand requires these asset files. Set up an `/assets/brand/` directory in the repo.

```
/assets/brand/
├── wordmark/
│   ├── wordmark-light.svg    [vela in light text, transparent bg]
│   ├── wordmark-dark.svg     [vela in dark text, transparent bg]
│   └── wordmark-mono.svg     [for monochrome use cases]
│
├── icon/
│   ├── icon-1024.png         [App Store icon, master]
│   ├── icon-master.fig       [Figma source file]
│   └── notification-96.png   [Notification icon, white-on-transparent]
│
├── splash/
│   └── splash-screen.png     [App launch screen]
│
└── marketing/
    ├── press-kit.zip
    ├── screenshot-templates.fig
    └── social-post-templates.fig
```

---

## Brand Decision Tree

When making a brand-related decision, walk through these:

### "Should we use this image?"
1. Is it of a real Vela user (with permission)? → ✅
2. Is it a screenshot of the actual app? → ✅
3. Is it a stock photo of a person's face? → ❌
4. Is it AI-generated? → ❌
5. Is it abstract/geometric? → ✅ (if it matches palette)

### "Is this copy on-brand?"
1. Read it out loud. Would a thoughtful adult write it? → ✅
2. Does it use any forbidden words? → ❌
3. Does it have multiple exclamation marks? → ❌ (limit to 1, sparingly)
4. Does it reference specific data when possible? → ✅
5. Could it appear in an Oura email? → ✅
6. Could it appear on a TikTok influencer's caption? → ❌

### "What font should I use?"
1. System font (San Francisco / Roboto). Always.
2. Need a custom font? → No, you don't.

### "Can we add an animation here?"
1. Does it serve a purpose? → ✅
2. Is it a celebration of a real milestone? → ✅
3. Is it just decorative? → ❌ unless it's in onboarding
4. Does it slow down a frequent task? → ❌
5. Is it longer than `AnimationDuration.reveal` (600ms)? → Justify it
