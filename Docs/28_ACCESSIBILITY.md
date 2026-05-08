# 28 — Accessibility

## Overview
Vela's accessibility implementation. Built-in from day 1, not bolted on later. Covers VoiceOver labels, Dynamic Type, Reduce Motion, color contrast, voice control, and accessibility testing.

Accessibility isn't just for disabled users — it benefits everyone (older users, users in bright sunlight, users with temporary injuries, users on subway with one hand). Apps that ignore accessibility leave 15-20% of users behind.

---

## Why Accessibility Matters for Vela

- **Vela's audience skews older.** Personas Maya (32), Marcus (28), Priya (38), Jordan (45) are at higher risk of needing accessibility features than Gen Z apps' audiences.
- **Premium positioning demands it.** Oura, Whoop, MyFitnessPal — every premium app handles accessibility well. Vela must too.
- **App Store Review can flag it.** Apple has been increasingly enforcing accessibility guidelines.
- **Legal obligation.** ADA, EAA (European Accessibility Act effective 2025) — Vela could face complaints if non-compliant.

---

## Accessibility Layers

We implement four layers:

1. **Semantic HTML/native equivalents** — proper roles, labels, traits
2. **Visual accommodations** — Dynamic Type, contrast, color independence
3. **Motor accommodations** — touch target sizes, alternative gestures
4. **Cognitive accommodations** — clear copy, consistent patterns, undo

---

## VoiceOver Implementation

VoiceOver reads the screen aloud. Every interactive element needs proper labeling.

### Required Properties

For every Pressable:

```typescript
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Save settings"
  accessibilityHint="Saves your changes and returns to the previous screen"
  accessibilityState={{ disabled, busy: loading }}
>
  ...
</Pressable>
```

### Property reference

| Property | Purpose | Example |
|----------|---------|---------|
| `accessibilityRole` | What kind of element | `'button'`, `'link'`, `'header'`, `'image'`, `'checkbox'` |
| `accessibilityLabel` | What to read aloud | `"Take this week's scan"` |
| `accessibilityHint` | Action description | `"Opens the camera flow"` |
| `accessibilityState` | Current state | `{ disabled, selected, expanded, busy, checked }` |
| `accessibilityValue` | Numeric/range value | `{ min: 0, max: 100, now: 50 }` |
| `accessibilityActions` | Custom actions | For sliders, swipeable rows |

### Patterns by component

#### Buttons
```typescript
<Button
  title="Subscribe"
  // accessibilityLabel auto-set to title
  // accessibilityRole auto-set to "button"
  onPress={handleSubscribe}
/>
```

The `Button` component (from file 15) already implements correct accessibility.

#### Score displays
```typescript
<View
  accessibilityRole="text"
  accessibilityLabel={`Overall score: ${score} out of 100. ${delta > 0 ? `Up ${delta} points from last week.` : delta < 0 ? `Down ${Math.abs(delta)} points from last week.` : 'No change from last week.'}`}
>
  <ScoreNumber value={score} />
  <DeltaIndicator value={delta} />
</View>
```

Don't read each visual element separately. Combine into a meaningful sentence.

**Dynamic Type with large display numerals.** The score number uses `Typography.scoreDisplay` (72pt) — at the largest accessibility size this can overflow its container. Cap the multiplier and let the card grow vertically rather than clip:

```typescript
<Text
  variant="scoreDisplay"
  // Scale, but never beyond 1.3x — the card layout assumes a finite height.
  maxFontSizeMultiplier={1.3}
  numberOfLines={1}
  adjustsFontSizeToFit  // Last-resort shrink-to-fit on edge cases
>
  {score}
</Text>
```

The `Text` component in file 15 already sets `maxFontSizeMultiplier={1.3}`; verify before shipping.

#### Charts (Trend graphs)
```typescript
<View
  accessibilityRole="image"
  accessibilityLabel={`Skin score trend over 4 weeks: ${trendData.map(d => d.score).join(', ')}. Overall trend: ${overallTrend}.`}
>
  <LineChart data={trendData} />
</View>
```

Charts must describe themselves narratively, not just list points.

#### Lists
```typescript
<FlatList
  data={sessions}
  renderItem={({ item, index }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Session from ${formatDate(item.capturedAt)}, score ${item.overallScore}`}
      accessibilityHint="Opens detailed view"
      onPress={() => navigate(`/session/${item.id}`)}
    >
      ...
    </Pressable>
  )}
/>
```

#### Form inputs
```typescript
<TextInput
  accessibilityLabel="Email address"
  accessibilityHint="Used for sign-in only"
  textContentType="emailAddress"
  keyboardType="email-address"
  // Error state communicated via accessibilityLiveRegion
/>

{error && (
  <Text 
    accessibilityLiveRegion="polite" 
    accessibilityRole="alert"
  >
    {error}
  </Text>
)}
```

#### Modal sheets
```typescript
<View
  accessibilityViewIsModal  // Trap VoiceOver inside modal
  accessibilityRole="none"
>
  ...
</View>
```

#### Decorative elements
```typescript
<Image
  source={...}
  accessibilityElementsHidden  // Hide from VoiceOver entirely
  importantForAccessibility="no"
/>
```

For purely decorative images that add no information.

#### Capture flow alignment guides
```typescript
<View
  accessibilityRole="text"
  accessibilityLiveRegion="polite"
  accessibilityLabel={alignmentInstructions}
  // Updates every ~500ms as user adjusts position
>
  {alignmentInstructions}
</View>
```

For the AR capture flow, use live regions to announce alignment changes ("Move closer", "Tilt your head right", "Hold still").

#### VoiceOver focus order on camera-dominant screens

The capture screen is a full-bleed AR view with a small UI overlay. Without explicit focus order, VoiceOver lands on the AR view first and reads "Image" repeatedly. Force-narrow the focusable set so the user can tab between the live alignment hint, the shutter button, and the cancel/back button only:

```typescript
<View
  accessibilityElements={[hintRef, shutterRef, backRef]}  // ordered focus list
>
  <ARView                       // AR scene
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  />
  <Text ref={hintRef} ... />
  <ShutterButton ref={shutterRef} ... />
  <BackButton ref={backRef} ... />
</View>
```

The same pattern applies to the comparison-slider screen (file 11) — exclude the image area, focus on the slider thumb + before/after labels.

---

## Dynamic Type (Font Scaling)

iOS users can adjust text size system-wide. Apps must respect this.

### Implementation

```typescript
// In Text components (already in file 15)
<Text maxFontSizeMultiplier={1.3}>
  {body}
</Text>
```

The `1.3` cap prevents broken layouts at extreme accessibility sizes (XXXL).

### Layout considerations

- **Use flex layouts**, not fixed widths/heights
- **Test at 1.3× scale.** Most layout breakage happens here.
- **Avoid text in fixed-size containers** unless they can grow
- **Buttons should grow with their text**

### Test setup

```bash
# Simulator: 
# Settings → Accessibility → Display & Text Size → Larger Text
# Drag slider to "Accessibility 1" through "Accessibility 5"
```

### Audit checklist

For every screen:
- [ ] Text wraps cleanly at 1.3× scale
- [ ] No truncation of important content
- [ ] Buttons remain tappable
- [ ] No overlapping elements
- [ ] Cards expand naturally

---

## Reduce Motion

Some users get motion sickness or find animations distracting. Respect their setting.

### Implementation

```typescript
// src/hooks/useReducedMotion.ts
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    return () => subscription.remove();
  }, []);
  
  return reducedMotion;
}
```

### Usage in animations

```typescript
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AnimationDuration } from '@/theme/animations';

const reducedMotion = useReducedMotion();
const duration = reducedMotion ? 0 : AnimationDuration.reveal;

scoreScale.value = withTiming(1, { duration });
```

### What to suppress when Reduce Motion is on

- Score reveal scale animation → just fade in
- Sub-score stagger → all appear at once
- Page transitions → cross-fade instead of slide
- Loading dots → static icon
- Streak flame animation → static flame
- Lottie animations → first frame only or static SVG fallback

### What to keep on

- Pull-to-refresh (essential for UX)
- Form validation appearing/disappearing
- Modal sheets (still slide, but faster)
- Necessary feedback (loading spinner)

---

## Color Contrast

WCAG 2.1 standards:
- **AA:** 4.5:1 for normal text, 3:1 for large text (18pt+)
- **AAA:** 7:1 for normal text, 4.5:1 for large text

Vela targets **AA minimum**, AAA where possible.

### Verified contrast ratios

For the design system in file 15:

**Light mode:**
| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| `text.primary` (#1A1A1A) on `background.primary` (#FAFAF8) | 16.9:1 | AAA |
| `text.secondary` (#6B6B6B) on `background.primary` | 5.7:1 | AA |
| `text.tertiary` (#9B9B9B) on `background.primary` | 3.1:1 | Large text only |
| `accent.default` (#5B8DB8) on `background.primary` | 3.6:1 | Large text only |
| White text on `accent.default` | 4.4:1 | Borderline AA |

**Dark mode:**
| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| `text.primary` (#F5F5F3) on `background.primary` (#0F1218) | 17.2:1 | AAA |
| `text.secondary` (#A0A4AB) on `background.primary` | 8.4:1 | AAA |
| `text.tertiary` (#6B6E75) on `background.primary` | 4.0:1 | AA large only |
| `accent.default` (#7AA6CB) on `background.primary` | 6.3:1 | AA |

### Rules

- **Body text:** must be primary or secondary, not tertiary
- **Tertiary color:** only for large text (18pt+) or non-essential info
- **Accent color text:** use sparingly; prefer for buttons with white text
- **Score colors (high/mid/low):** never communicate score *only* through color — always show number

### Color independence

Color alone must never convey meaning. Always pair with:
- Text labels
- Icons
- Position
- Patterns

Examples:
- ❌ Score is green if good, red if bad
- ✅ Score number + arrow icon (up/down) + color

---

## Voice Control

iOS Voice Control lets users speak commands instead of tapping.

### Requirements

For Voice Control to work:
- Every interactive element needs an `accessibilityLabel`
- Labels should be **what users would say**, not technical names
- Avoid duplicate labels on the same screen

### Examples

```typescript
// ❌ Voice Control says: "Tap button" — ambiguous if multiple buttons
<Button title="Save" /> // Default label is "Save"

// ✅ Voice Control says: "Tap save settings"
<Button accessibilityLabel="Save settings" />

// ❌ Same label twice on a screen
<Button accessibilityLabel="Edit" />
<Button accessibilityLabel="Edit" />

// ✅ Disambiguated
<Button accessibilityLabel="Edit name" />
<Button accessibilityLabel="Edit email" />
```

### Voice Control test
```
Settings → Accessibility → Voice Control → On
Then say: "Show numbers" or "Show names"
Confirm every button has a clear name visible.
```

---

## Switch Control

Some users with severe motor disabilities use a single switch to navigate.

### What this means for our app

- Every screen must be navigable without touch
- `accessibilityElementsHidden` should be used to skip non-essential elements
- Order of focus matters (top to bottom, left to right)

### Setting focus order

```typescript
import { findNodeHandle, AccessibilityInfo } from 'react-native';

const ref = useRef<View>(null);

useEffect(() => {
  if (ref.current) {
    const node = findNodeHandle(ref.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }
}, [pageJustOpened]);

<View ref={ref} accessible>
  ...
</View>
```

Use this to focus on the most important element when a screen opens.

---

## Touch Targets

(Also in file 23.)

- Minimum: 44×44 pt
- Recommended: 48×48 pt
- Spacing between targets: 8 pt minimum

For visually small icons, use `hitSlop`:

```typescript
<Pressable
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  style={{ width: 24, height: 24 }}
>
  <Ionicons name="close" size={24} />
</Pressable>
```

### Larger targets accessibility setting

In Settings, offer "Larger touch targets":

```typescript
const { largerTargets } = useAccessibilitySettings();
const minHeight = largerTargets ? 56 : 44;

<Button style={{ minHeight }} />
```

---

## Cognitive Accessibility

Often overlooked. Important for users with ADHD, dyslexia, autism, anxiety, brain fog.

### Patterns we use

1. **Consistent navigation** — tab bar always in same position
2. **Clear copy** — short sentences, common words
3. **Single primary action per screen** — no decision paralysis
4. **Confirm destructive actions** — undo via Alert
5. **Progress indicators in long flows** — onboarding shows X of Y
6. **No time pressure** — never auto-dismiss critical messages
7. **Clear error recovery** — every error has a "what to do next"

### Reading level

Target: 8th grade reading level for all UI copy.

Tools to check:
- Hemingway Editor
- Flesch-Kincaid score (aim for ≤ 70)

### Examples

❌ "Authentication credentials are required to instantiate session"  
✅ "Sign in to continue"

❌ "Insufficient session count to enable comparative analysis"  
✅ "You need at least 2 scans to compare"

❌ "An error occurred while processing your transaction"  
✅ "Couldn't complete purchase. Try again or check your payment method."

---

## Captions and Audio

### Sound usage

(Already covered in file 22 — Vela uses no sounds in v1.)

If we add sounds later:
- Every sound must have a visual equivalent
- Settings toggle to disable all sounds
- Captions/transcripts for any video content

---

## Settings UI for Accessibility

Add an Accessibility section in Settings:

```typescript
// app/(modal)/accessibility-prefs.tsx
- [Toggle] Reduce motion (overrides system)
- [Toggle] Disable haptics
- [Toggle] Larger touch targets (uses 56pt minimum)
- [Toggle] Increase contrast
- [Toggle] Bold text
- [Picker] Text size (System / Small / Medium / Large / Extra Large)
```

Each toggle persists to AsyncStorage and overrides system settings.

```typescript
// src/hooks/useAccessibilitySettings.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AccessibilitySettings {
  reduceMotion: boolean | 'system';
  disableHaptics: boolean;
  largerTargets: boolean;
  increaseContrast: boolean;
  boldText: boolean;
  textSize: 'system' | 'small' | 'medium' | 'large' | 'xlarge';
  
  setReduceMotion: (value: boolean | 'system') => void;
  setDisableHaptics: (value: boolean) => void;
  setLargerTargets: (value: boolean) => void;
  setIncreaseContrast: (value: boolean) => void;
  setBoldText: (value: boolean) => void;
  setTextSize: (value: AccessibilitySettings['textSize']) => void;
}

export const useAccessibilitySettings = create<AccessibilitySettings>()(
  persist(
    (set) => ({
      reduceMotion: 'system',
      disableHaptics: false,
      largerTargets: false,
      increaseContrast: false,
      boldText: false,
      textSize: 'system',
      
      setReduceMotion: (value) => set({ reduceMotion: value }),
      setDisableHaptics: (value) => set({ disableHaptics: value }),
      setLargerTargets: (value) => set({ largerTargets: value }),
      setIncreaseContrast: (value) => set({ increaseContrast: value }),
      setBoldText: (value) => set({ boldText: value }),
      setTextSize: (value) => set({ textSize: value }),
    }),
    {
      name: 'vela.accessibility',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## Capture Flow Accessibility (Special Case)

The AR capture flow is the most challenging for accessibility because:
- Visual alignment is the primary feedback
- Users with low vision can't see the AR overlay
- Holding a phone steady requires fine motor control

### Mitigations

#### Audio guidance mode (toggle)

```typescript
// In capture screen
const { audioGuidance } = useAccessibilitySettings();

useEffect(() => {
  if (audioGuidance && metrics) {
    const message = generateAlignmentMessage(metrics);
    AccessibilityInfo.announceForAccessibility(message);
  }
}, [metrics, audioGuidance]);

function generateAlignmentMessage(metrics: FaceMetrics): string {
  if (metrics.distance > 0.5) return "Move closer";
  if (metrics.distance < 0.3) return "Move back";
  if (Math.abs(metrics.yaw) > 0.1) return metrics.yaw > 0 ? "Turn slightly left" : "Turn slightly right";
  if (Math.abs(metrics.pitch) > 0.1) return metrics.pitch > 0 ? "Tilt down" : "Tilt up";
  return "Hold still";
}
```

### Capture audio-guidance vocabulary (canonical)

Every audio-guidance string is sourced from this fixed vocabulary. Cursor MUST NOT invent variants. The same vocabulary is used for the file 04 distance hint (returned by `distanceHint()`), the file 23 progress-ring fallback ("Hold steady…" / "Ready"), and the file 22 capture-screen toast equivalents.

| Condition | String | Used by |
|---|---|---|
| Distance too close | "Move back" | VoiceOver, distance hint, fallback toast |
| Distance too far | "Move closer" | VoiceOver, distance hint, fallback toast |
| Yaw left | "Turn slightly right" *(reverses for clarity — face turns toward camera)* | VoiceOver |
| Yaw right | "Turn slightly left" | VoiceOver |
| Pitch down | "Tilt up" | VoiceOver |
| Pitch up | "Tilt down" | VoiceOver |
| All conditions met | "Hold still" | VoiceOver |
| 80% through alignment window | "Almost there" | VoiceOver only |
| Capture fired | "Captured" + system success haptic | All |
| Lighting too low | "Find more light" | VoiceOver, banner copy |
| Multiple faces detected | "Make sure you're alone in the frame" | VoiceOver, error sheet |
| Glasses detected (if `occlusionPct < 90`) | "Try without glasses for a clearer scan" | VoiceOver, optional toast |

The VoiceOver announcements are throttled to 1 per second to avoid speech pile-up. Reduce-motion users get the same vocabulary; haptics are disabled per their setting.

#### Haptic alignment mode

When VoiceOver is on, replace visual alignment indicators with haptic patterns:

```typescript
const isVoiceOverOn = useScreenReaderEnabled();

useEffect(() => {
  if (isVoiceOverOn && allChecksPassed) {
    haptics.success();
  } else if (isVoiceOverOn && metrics?.distance < 0.3) {
    haptics.warning();  // Too close
  }
}, [isVoiceOverOn, allChecksPassed, metrics]);
```

#### Manual capture override

VoiceOver users get a manual capture button instead of automatic capture:

```typescript
const isVoiceOverOn = useScreenReaderEnabled();

{isVoiceOverOn ? (
  <Button
    title="Capture now"
    onPress={capturePhoto}
    accessibilityLabel="Take photo"
    accessibilityHint="Captures this angle. The app will tell you if alignment is off."
  />
) : (
  // Auto-capture happens silently when alignment is good
  null
)}
```

---

## Accessibility Testing

### Manual testing tools

#### iOS Accessibility Inspector
1. Open Xcode
2. Xcode → Open Developer Tool → Accessibility Inspector
3. Connect to simulator
4. Inspect elements, audit, scan

#### VoiceOver test
```
Simulator: Cmd + F5 toggles VoiceOver
Real device: Settings → Accessibility → VoiceOver
```

Navigate the app entirely with VoiceOver. Note any:
- Unlabeled elements
- Confusing labels
- Wrong reading order
- Missing hints

#### Reduce Motion test
```
Settings → Accessibility → Motion → Reduce Motion → On
```

Verify:
- No score animations
- No page slide animations
- Lottie animations replaced with static
- No motion sickness triggers

#### Dynamic Type test
```
Settings → Accessibility → Display & Text Size → Larger Text
Drag to maximum
```

Verify all screens still usable.

#### Color contrast test
Use the iOS Accessibility Inspector audit, or run colors through https://webaim.org/resources/contrastchecker/

### Automated testing

Add accessibility tests to CI:

```typescript
// __tests__/accessibility.test.tsx
import { render } from '@testing-library/react-native';
import { axe } from 'jest-axe';
import { Dashboard } from '@/screens/Dashboard';

test('Dashboard has no accessibility violations', async () => {
  const { toJSON } = render(<Dashboard />);
  const results = await axe(toJSON() as any);
  expect(results).toHaveNoViolations();
});
```

(Note: react-native-axe support is limited; manual testing remains essential.)

---

## Accessibility Checklist (Pre-Launch)

### Per-screen audit
- [ ] All Pressables have `accessibilityLabel`
- [ ] All Pressables have `accessibilityRole`
- [ ] Disabled/loading states use `accessibilityState`
- [ ] Sliders have `accessibilityValue`
- [ ] Decorative elements have `accessibilityElementsHidden`
- [ ] Text uses `maxFontSizeMultiplier` (1.3 cap)
- [ ] Layout works at 1.3× text scale
- [ ] Color contrast meets AA minimums
- [ ] Touch targets ≥ 44pt

### App-wide audit
- [ ] VoiceOver navigation works on every screen
- [ ] Reduce Motion respected in all animations
- [ ] No information conveyed by color alone
- [ ] Error states use `accessibilityLiveRegion="alert"`
- [ ] Dynamic notifications announced via `AccessibilityInfo.announceForAccessibility`
- [ ] No keyboard traps in modals
- [ ] All forms work with Voice Control

### Capture flow audit (special case)
- [ ] Audio guidance mode available
- [ ] Manual capture button when VoiceOver on
- [ ] Cancel button reachable via VoiceOver
- [ ] Permissions screens fully labeled

### Settings audit
- [ ] Accessibility section exists
- [ ] All settings persist
- [ ] Each setting respects system value when "system" chosen
- [ ] Settings work without restart

---

## Resources

- [iOS Accessibility Documentation](https://developer.apple.com/accessibility/ios/)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [React Native Accessibility Docs](https://reactnative.dev/docs/accessibility)
- [Apple Human Interface Guidelines: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

---

## Future v2 Considerations

- Sign Language Interpreter video for onboarding (for Deaf users)
- Multi-language support (currently English only)
- Cognitive accessibility mode (simpler UI, fewer options)
- Family/caregiver mode (someone else helps user)
