# 24 — Illustrations System

## Overview
Vela's illustration language. Used in empty states, onboarding moments, milestones, and brand expression. Tone: minimal, geometric, calm. Never cartoon-y, never beauty-app-illustrated, never AI-generated faces.

The illustration system is **deliberately small**. We use illustrations sparingly because over-illustration reads as "marketing app." Each illustration must earn its place.

---

## Illustration Philosophy

### What Vela illustrations should feel like
- **Geometric, not organic.** Lines, circles, soft polygons. Not blobs or sketches.
- **Symbolic, not literal.** A constellation for "tracking," not a literal face.
- **Single-color or two-color max.** Never multi-color illustrations.
- **Confident negative space.** Whitespace is part of the design.
- **Subtle motion possible** (Lottie), but never distracting.

### What Vela illustrations should NOT be
- ❌ Cartoon characters (no people, no avatars)
- ❌ Beauty industry tropes (no product bottles, no "glow" effects)
- ❌ Stock illustrations (Undraw, Storyset, Notion-style)
- ❌ AI-generated faces or imagery
- ❌ Heavy gradients or 3D renders
- ❌ Emoji-style illustrations
- ❌ Anything cute

### Reference points
- Stripe's illustration system (geometric, abstract)
- Linear's empty states (minimal, single-color)
- Apple Health summary cards (clean, data-driven)
- Oura's onboarding visuals (soft, premium)

---

## Illustration Inventory

These are the illustrations Vela needs. Each has a defined purpose, location, and specifications.

### Empty State Illustrations

#### 1. `compare-empty.svg` — No comparisons available
**When shown:** User has fewer than 2 sessions and visits Compare tab
**Concept:** Two abstract circles overlapping with negative space between them
**Size:** 200×160 pt
**Single color:** `colors.text.tertiary`

#### 2. `history-empty.svg` — No session history
**When shown:** User completed baseline but no other sessions yet
**Concept:** A vertical dotted line with one solid circle marker (the baseline)
**Size:** 160×200 pt

#### 3. `routine-empty.svg` — Routine not yet generated
**When shown:** Pre-baseline state on routine tab
**Concept:** Three horizontal lines of varying lengths (suggesting list)
**Size:** 200×140 pt

#### 4. `offline-illustration.svg` — Offline state
**When shown:** Network disconnected during a network-required action
**Concept:** Cloud outline with a slash through it, minimal lines
**Size:** 160×160 pt

#### 5. `error-illustration.svg` — General error fallback
**When shown:** Error boundary catches a crash
**Concept:** Two concentric circles, the inner one offset slightly (suggesting misalignment)
**Size:** 160×160 pt

#### 6. `subscription-required.svg` — Hard paywall dead-end screen
**When shown:** User dismissed paywall and tried to access protected content
**Concept:** A locked geometric shape (hexagon with smaller hexagon inside)
**Size:** 200×200 pt

### Onboarding Illustrations

#### 7. `onboarding-welcome.svg` — Welcome screen
**When shown:** First onboarding screen
**Concept:** A small constellation of dots forming an abstract face shape
**Size:** 280×280 pt
**Color:** `colors.accent.default`

#### 8. `onboarding-section-a.svg` — About You section
**Concept:** Single circle with small concentric ring
**Size:** 160×160 pt

#### 9. `onboarding-section-b.svg` — Face & Skin section
**Concept:** Soft polygon outline (5-6 sided)
**Size:** 160×160 pt

#### 10. `onboarding-section-c.svg` — Goals section
**Concept:** A line graph with subtle upward trend
**Size:** 160×160 pt

#### 11. `onboarding-section-d.svg` — Routine section
**Concept:** Three stacked horizontal bars of different widths
**Size:** 160×160 pt

#### 12. `onboarding-section-e.svg` — Lifestyle section
**Concept:** A wave/cycle pattern (suggesting circadian rhythm)
**Size:** 160×160 pt

#### 13. `onboarding-permissions.svg` — Permissions screen
**Concept:** Camera viewfinder corners (just the brackets)
**Size:** 200×200 pt

### Milestone Illustrations

#### 14. `milestone-baseline.svg` — Baseline captured
**Concept:** A solid filled circle (the starting point)
**Size:** 120×120 pt

#### 15. `milestone-week-1.svg` — First weekly comparison
**Concept:** Two circles connected by a soft arc
**Size:** 120×120 pt

#### 16. `milestone-month-1.svg` — 4-week milestone
**Concept:** Four circles in a row, the last one slightly larger
**Size:** 160×120 pt

#### 17. `milestone-month-3.svg` — 12-week milestone
**Concept:** Twelve small dots arranged in a curve, suggesting a trajectory
**Size:** 200×120 pt

#### 18. `milestone-streak-7.svg` — 7-day streak
**Concept:** Simple flame outline (geometric, not flame-emoji)
**Size:** 80×100 pt

#### 19. `milestone-streak-30.svg` — 30-day streak
**Concept:** Same flame, but with a small ring around it
**Size:** 80×100 pt

### Settings/Confidence Illustrations

#### 20. `privacy-illustration.svg` — Privacy section header
**Concept:** A small lock with abstract data lines flowing inward (not outward)
**Size:** 60×60 pt

#### 21. `delete-confirmation.svg` — Delete account confirmation
**Concept:** A circle with a soft "X" inside (gentle, not aggressive)
**Size:** 120×120 pt

### Additions referenced from feature files (must be added)

These illustrations are referenced from other files but were missing from the inventory above. They MUST exist before launch.

#### 22. `error-during-capture.svg` — Capture flow error fallback (file 05)
**Concept:** Soft cream surface with a faint paused-pause icon
**Size:** 120×120 pt

#### 23. `settings-required.svg` — Permission denied banner illustration (file 14, file 22)
**Concept:** Small slider icon, 30% opacity, no judgment
**Size:** 40×40 pt

#### 24. `success-checkmark.lottie` — Success moments (already listed line 330; restated here for inventory completeness)
**Size:** 80×80 pt, ≤10KB

#### 25. `empty-notif.svg` — Notifications empty state (file 12)
**Concept:** Outlined bell with a soft cream interior; no notifications dot
**Size:** 80×80 pt

#### 26. `wrapped-cover.svg`, `wrapped-scans.svg`, `wrapped-streak.svg`, `wrapped-pattern.svg`, `wrapped-quiet.svg`, `wrapped-outro.svg` — Monthly Wrapped (file 38)
**Sizes:** 200×200 pt each

#### 27. `practice-clinic.svg` — Practice tier enrollment confirmation (file 49)
**Concept:** Abstract practice/clinic shape, soft
**Size:** 100×100 pt

The barrel export in `src/components/illustrations/index.ts` MUST include all 27. CI lints any `from '@/components/illustrations'` import against the barrel export.

### Lottie file budget (canonical)

Each Lottie file MUST be ≤10KB compressed. Files larger than 10KB are rejected at lint time. Reasoning:
- Bundle size impact (Lottie + lottie-react-native runtime is already ~80KB).
- Performance on iPhone SE / mini.
- Most "complex" Lotties can be replaced by Reanimated 3 with smaller bundle impact.

For animations that genuinely need >10KB (rare), use Reanimated instead. The Lottie ceiling is hard.

---

## SVG Implementation

All illustrations are SVG, rendered via `react-native-svg`. They accept a `color` prop so they adapt to light/dark theme automatically.

### Pattern: Themed SVG component

```typescript
// src/components/illustrations/CompareEmpty.tsx
import { Svg, Circle, G } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';

interface Props {
  size?: number;
  color?: string;
}

export function CompareEmpty({ size = 200, color }: Props) {
  const colors = useColors();
  const strokeColor = color || colors.text.tertiary;
  
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 200 160">
      <G stroke={strokeColor} strokeWidth={2} fill="none">
        <Circle cx={70} cy={80} r={50} />
        <Circle cx={130} cy={80} r={50} />
      </G>
    </Svg>
  );
}
```

### Pattern: Two-color illustration

```typescript
// src/components/illustrations/MilestoneBaseline.tsx
import { Svg, Circle } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';

interface Props {
  size?: number;
}

export function MilestoneBaseline({ size = 120 }: Props) {
  const colors = useColors();
  
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Outer ring — subtle */}
      <Circle 
        cx={60} cy={60} r={55} 
        stroke={colors.border.default} 
        strokeWidth={1} 
        fill="none" 
      />
      {/* Inner solid — accent */}
      <Circle 
        cx={60} cy={60} r={32} 
        fill={colors.accent.default} 
      />
    </Svg>
  );
}
```

### Pattern: Onboarding constellation

```typescript
// src/components/illustrations/OnboardingWelcome.tsx
import { Svg, Circle, Line } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';

interface Props {
  size?: number;
}

export function OnboardingWelcome({ size = 280 }: Props) {
  const colors = useColors();
  
  // Constellation of 7 points forming a face suggestion
  const points = [
    { x: 140, y: 60, r: 4 },   // top
    { x: 90, y: 110, r: 3 },   // top-left
    { x: 190, y: 110, r: 3 },  // top-right
    { x: 70, y: 170, r: 3 },   // mid-left
    { x: 210, y: 170, r: 3 },  // mid-right
    { x: 100, y: 220, r: 3 },  // bottom-left
    { x: 180, y: 220, r: 3 },  // bottom-right
  ];
  
  return (
    <Svg width={size} height={size} viewBox="0 0 280 280">
      {/* Subtle connecting lines */}
      <Line x1={140} y1={60} x2={90} y2={110} stroke={colors.border.subtle} strokeWidth={1} />
      <Line x1={140} y1={60} x2={190} y2={110} stroke={colors.border.subtle} strokeWidth={1} />
      <Line x1={90} y1={110} x2={70} y2={170} stroke={colors.border.subtle} strokeWidth={1} />
      <Line x1={190} y1={110} x2={210} y2={170} stroke={colors.border.subtle} strokeWidth={1} />
      <Line x1={70} y1={170} x2={100} y2={220} stroke={colors.border.subtle} strokeWidth={1} />
      <Line x1={210} y1={170} x2={180} y2={220} stroke={colors.border.subtle} strokeWidth={1} />
      
      {/* Solid points */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={colors.accent.default} />
      ))}
    </Svg>
  );
}
```

---

## Illustration Index Component

Centralized export for all illustrations:

```typescript
// src/components/illustrations/index.ts
export { CompareEmpty } from './CompareEmpty';
export { HistoryEmpty } from './HistoryEmpty';
export { RoutineEmpty } from './RoutineEmpty';
export { OfflineIllustration } from './OfflineIllustration';
export { ErrorIllustration } from './ErrorIllustration';
export { SubscriptionRequired } from './SubscriptionRequired';

export { OnboardingWelcome } from './OnboardingWelcome';
export { OnboardingSectionA } from './OnboardingSectionA';
export { OnboardingSectionB } from './OnboardingSectionB';
export { OnboardingSectionC } from './OnboardingSectionC';
export { OnboardingSectionD } from './OnboardingSectionD';
export { OnboardingSectionE } from './OnboardingSectionE';
export { OnboardingPermissions } from './OnboardingPermissions';

export { MilestoneBaseline } from './MilestoneBaseline';
export { MilestoneWeek1 } from './MilestoneWeek1';
export { MilestoneMonth1 } from './MilestoneMonth1';
export { MilestoneMonth3 } from './MilestoneMonth3';
export { MilestoneStreak7 } from './MilestoneStreak7';
export { MilestoneStreak30 } from './MilestoneStreak30';

export { PrivacyIllustration } from './PrivacyIllustration';
export { DeleteConfirmation } from './DeleteConfirmation';
```

---

## Usage in Components

```typescript
// In an empty state
import { EmptyState } from '@/components/ui/EmptyState';
import { CompareEmpty } from '@/components/illustrations';

<EmptyState
  illustration={<CompareEmpty size={200} />}
  title="Compare your scans"
  description="Once you have two scans, you can see the changes side by side."
  actionLabel="Schedule next scan"
  onAction={scheduleScan}
/>

// In a milestone moment
import { MilestoneMonth1 } from '@/components/illustrations';

<View style={{ alignItems: 'center', gap: Spacing.lg }}>
  <MilestoneMonth1 />
  <Headline>30 days of Vela</Headline>
  <Body color="secondary">{milestoneCopy}</Body>
</View>
```

---

## Lottie Animations (Limited Use)

Only three Lottie animations exist in v1. Each is small (<10KB) and serves a specific moment.

### 1. `score-reveal.lottie`
- **Duration:** 1.2s
- **When:** Score reveal screen, just before number animates in
- **Effect:** Subtle pulse outward from center
- **Color:** Inherits `accent.default`

### 2. `processing.lottie`
- **Duration:** 2s loop
- **When:** AI processing screen
- **Effect:** Three dots that fade in sequence
- **Color:** Inherits `accent.default`

### 3. `success-checkmark.lottie`
- **Duration:** 0.6s
- **When:** Routine task checked off
- **Effect:** Checkmark draws itself
- **Color:** Inherits `success.default`

### Lottie implementation

```typescript
// src/components/animations/Processing.tsx
import LottieView from 'lottie-react-native';
import { useRef, useEffect } from 'react';
import { useColors } from '@/theme/ThemeContext';

export function Processing({ size = 80 }: { size?: number }) {
  const animationRef = useRef<LottieView>(null);
  const colors = useColors();
  
  useEffect(() => {
    animationRef.current?.play();
  }, []);
  
  return (
    <LottieView
      ref={animationRef}
      source={require('@/assets/animations/processing.lottie')}
      style={{ width: size, height: size }}
      autoPlay
      loop
      colorFilters={[
        { keypath: 'dot1', color: colors.accent.default },
        { keypath: 'dot2', color: colors.accent.default },
        { keypath: 'dot3', color: colors.accent.default },
      ]}
    />
  );
}
```

### When NOT to use Lottie
- For decorative animation
- For animations longer than 2 seconds
- For animations that play on every interaction
- When a simple Reanimated animation would do

---

## File Organization

```
/assets/
├── illustrations/                    # SVGs (rendered as React components)
│   └── (no actual files — SVGs are inlined in components)
│
├── animations/                       # Lottie JSON files
│   ├── score-reveal.lottie
│   ├── processing.lottie
│   └── success-checkmark.lottie
│
└── icons/                            # Custom icons (if any)
    └── (none in v1 — using Ionicons)
```

```
/src/components/
├── illustrations/                    # SVG illustration components
│   ├── index.ts
│   ├── CompareEmpty.tsx
│   ├── HistoryEmpty.tsx
│   └── ...
│
└── animations/                       # Lottie wrapper components
    ├── ScoreReveal.tsx
    ├── Processing.tsx
    └── SuccessCheckmark.tsx
```

---

## Icon System

### Choice: Ionicons (default)

We use **Ionicons** as the primary icon set, accessed via `@expo/vector-icons`. Reasons:
- 1,300+ icons covering all needs
- Three weights (filled, outline, sharp)
- Already bundled in Expo
- Consistent visual style
- Good iOS feel

### Standard icon usage

```typescript
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/ThemeContext';

const colors = useColors();
<Ionicons name="trending-up" size={24} color={colors.text.primary} />
```

### Icon sizing standards

| Use case | Size |
|----------|------|
| Tab bar | 24 |
| Toolbar / nav | 22 |
| Inline with body text | 16 |
| Section header icon | 20 |
| Empty state icon | 48 |
| Hero icon | 64 |

### Icon style guide

- **Default:** outline weight (e.g., `trending-up-outline`)
- **Active states:** filled weight (e.g., `trending-up`)
- **Tab bar:** outline when inactive, filled when active
- **Destructive actions:** filled red icons (`trash`, not `trash-outline`)

### Icon mapping for Vela features

| Feature | Icon |
|---------|------|
| Dashboard / Home | `trending-up` |
| Compare | `git-compare` |
| History | `time` |
| Routine | `list` |
| Settings | `settings` |
| Capture | `camera` |
| Skin score | `water` |
| Symmetry score | `scan` |
| Definition score | `triangle` |
| Vitality score | `flash` |
| Grooming score | `cut` |
| Notifications | `notifications` |
| Privacy | `lock-closed` |
| Subscription | `star` |
| Help/Info | `help-circle` |
| External link | `open-outline` |
| Forward / Next | `chevron-forward` |
| Back | `chevron-back` |
| Close | `close` |
| Done / Check | `checkmark` |
| Add | `add` |
| Edit | `pencil` |
| Delete | `trash` |
| Share | `share-outline` |
| Save | `bookmark` |

### When to use a custom icon (almost never)

If Ionicons doesn't have what you need, prefer to:
1. Reframe the concept to use an existing icon
2. Use text instead (e.g., "Day 7" instead of a custom day-number icon)
3. Use a simple geometric shape via SVG

Custom icons are a maintenance burden. Avoid.

---

## Brand-Adjacent Imagery (Marketing Only)

For App Store screenshots, marketing site, social posts:

- **App UI screenshots over illustrations** — show the actual product
- **Abstract photography acceptable** — soft light, clean compositions, never face shots
- **Texture allowed** — paper, fabric grain, natural surfaces
- **Color palette must match brand** — desaturated, warm or cool tones

**Forbidden in marketing imagery:**
- Stock face photography
- Before/after photography (we explicitly don't promise transformation)
- Lifestyle shots of people using phones
- AI-generated faces

---

## Future Illustrations (v2+, not v1)

- Treatment timeline visuals (Tretinoin progress)
- Body region heatmap (when capture expands beyond face)
- Calendar view illustration
- Apple Watch sync indicator
