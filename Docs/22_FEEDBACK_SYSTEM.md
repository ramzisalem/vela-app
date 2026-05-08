# 22 — Feedback System

## Overview
How Vela responds to user actions. Covers feedback type selection (toast vs modal vs banner vs alert), haptic patterns, sound usage, and the global feedback service that orchestrates all of them.

This is the layer most apps get wrong. The result feels chaotic and noisy. Vela's feedback system is intentionally restrained.

---

## Feedback Hierarchy

When the app needs to communicate with the user, choose the lightest-weight option that works. From least to most intrusive:

```
Lightest                                                    Heaviest
   │                                                            │
   ▼                                                            ▼
[Inline]──→[Caption]──→[Toast]──→[Banner]──→[Sheet]──→[Alert]──→[Full Modal]
```

### Decision Tree

**Is the feedback urgent and blocking?** → Alert
**Is the feedback an action result the user just took?** → Toast
**Is it system-wide info that user can ignore?** → Banner
**Does it require choice/action from user?** → Sheet or Alert
**Is it inline to a specific UI element?** → Inline error/helper text
**Is it a major moment (milestone, paywall, etc)?** → Full Modal/Screen

### When to Use Each

| Type | When | Example |
|------|------|---------|
| **Inline** | Validation errors on form fields | "Email is required" below input |
| **Caption** | Helper text, ambient info | Character count below textarea |
| **Toast** | Confirmation of completed action | "Settings saved" |
| **Banner** | Persistent system state | "You're offline" |
| **Sheet** | Choice between options | "How would you like to share?" |
| **Alert** | Confirmation of destructive action | "Delete account?" |
| **Full Modal** | Major moments | Score reveal, paywall, milestones |

---

## Toast System

Lightweight, auto-dismissing confirmations. Most common feedback type.

### Toast Types

```typescript
// src/components/feedback/Toast.tsx
import { View, Pressable } from 'react-native';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/ThemeContext';
import { Body } from '@/components/ui/Text';
import { Spacing, Radii } from '@/theme/spacing';
import { AnimationDuration } from '@/theme/animations';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Props {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  onHide?: () => void;
  duration?: number;
}

export function Toast({
  visible,
  message,
  variant = 'success',
  actionLabel,
  onAction,
  onHide,
  duration = 2500,
}: Props) {
  const colors = useColors();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  
  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(1, { duration: AnimationDuration.fast }),
        withDelay(duration, withTiming(0, { duration: AnimationDuration.normal }, (finished) => {
          if (finished && onHide) runOnJS(onHide)();
        }))
      );
      translateY.value = withSequence(
        withTiming(0, { duration: AnimationDuration.fast }),
        withDelay(duration, withTiming(20, { duration: AnimationDuration.normal }))
      );
    }
  }, [visible]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  
  if (!visible) return null;
  
  const variantConfig = {
    success: { icon: 'checkmark-circle', color: colors.success.default },
    error:   { icon: 'alert-circle', color: colors.error.default },
    info:    { icon: 'information-circle', color: colors.accent.default },
    warning: { icon: 'warning', color: colors.warning.default },
  }[variant];
  
  return (
    <Animated.View 
      style={[
        {
          position: 'absolute',
          bottom: 100, // Above tab bar
          left: Spacing.lg,
          right: Spacing.lg,
          backgroundColor: colors.background.secondary,
          borderRadius: Radii.lg,
          padding: Spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        animatedStyle,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name={variantConfig.icon as any} size={20} color={variantConfig.color} />
      <Body style={{ flex: 1 }}>{message}</Body>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Body color="accent" style={{ fontWeight: '600' }}>{actionLabel}</Body>
        </Pressable>
      )}
    </Animated.View>
  );
}
```

### Toast Manager (global)

```typescript
// src/services/toastService.ts
import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import type { ToastVariant } from '@/components/feedback/Toast';

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
  
  show: (config: ShowToastConfig) => void;
  hide: () => void;
}

interface ShowToastConfig {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export const useToastStore = create<ToastState>((set, get) => ({
  visible: false,
  message: '',
  variant: 'success',
  duration: 2500,
  
  show: ({ message, variant = 'success', actionLabel, onAction, duration = 2500 }) => {
    // Trigger haptic based on variant
    if (variant === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (variant === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (variant === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    set({ visible: true, message, variant, actionLabel, onAction, duration });
  },
  
  hide: () => set({ visible: false, message: '', actionLabel: undefined, onAction: undefined }),
}));

// Convenience helpers
export const toast = {
  success: (message: string, config?: Partial<ShowToastConfig>) => 
    useToastStore.getState().show({ ...config, message, variant: 'success' }),
  error: (message: string, config?: Partial<ShowToastConfig>) => 
    useToastStore.getState().show({ ...config, message, variant: 'error' }),
  info: (message: string, config?: Partial<ShowToastConfig>) => 
    useToastStore.getState().show({ ...config, message, variant: 'info' }),
  warning: (message: string, config?: Partial<ShowToastConfig>) => 
    useToastStore.getState().show({ ...config, message, variant: 'warning' }),
};
```

### Toast Host (mounted globally)

```typescript
// src/components/feedback/ToastHost.tsx
import { useToastStore } from '@/services/toastService';
import { Toast } from './Toast';

export function ToastHost() {
  const { visible, message, variant, actionLabel, onAction, duration, hide } = useToastStore();
  
  return (
    <Toast
      visible={visible}
      message={message}
      variant={variant}
      actionLabel={actionLabel}
      onAction={onAction}
      onHide={hide}
      duration={duration}
    />
  );
}
```

Mount in root layout:

```typescript
// app/_layout.tsx
import { ToastHost } from '@/components/feedback/ToastHost';

// Inside ThemeProvider
<>
  <Stack />
  <ToastHost />
</>
```

### Toast Usage Examples

```typescript
import { toast } from '@/services/toastService';

// Simple success
toast.success('Settings saved');

// With action
toast.error('Failed to save', {
  actionLabel: 'Retry',
  onAction: () => save(),
});

// Custom duration
toast.info('Generating routine...', { duration: 5000 });
```

### Toast Rules

- **Maximum 1 toast at a time.** New toast replaces existing.
- **Maximum duration: 5 seconds.** Anything longer is a banner, not a toast.
- **No interactive content** beyond a single action button.
- **Never block UI.** User can keep using the app while toast is visible.
- **Always above tab bar.** Position at `bottom: 100`.

### Toast replacement transition (canonical)

When a new toast arrives while one is visible:

1. The current toast fades out over **150ms** (opacity 1 → 0, ease-out).
2. The new toast fades in over **150ms** (opacity 0 → 1, ease-out).
3. Total handoff time: **300ms**. No queue — the newest toast always wins.
4. If `Reduce Motion` is enabled, the transition is instant (no fade).

Implementation: the toast service holds a single ref to the current toast component; calling `show()` hides the current ref's content with a fade-out, then mounts the new content with a fade-in. State machine: `IDLE → SHOWING → REPLACING → SHOWING → IDLE`.

### Toast accessibility live region

Two live-region levels:
- `accessibilityLiveRegion="polite"` for `success` and `info` toasts.
- `accessibilityLiveRegion="assertive"` for `error` and `warning` toasts.

VoiceOver announces immediately on assertive; queues for the next pause on polite.

---

## Loading Copy Register (canonical)

Every loading state across the app uses the same template. Cursor MUST NOT invent loading strings.

**Template:** `[Verb in gerund form] + [object the user gave us]`.

| Surface | Loading copy |
|---|---|
| Capture processing | Reading your face |
| Routine generation | Drafting your routine |
| Score explanation | Looking at the numbers |
| Wrapped generation | Building your <Month> recap |
| Comparison view loading | Lining up your scans |
| Share card render | Composing your card |
| Data export | Packing your data |
| Account deletion in flight | Tidying up |
| Diary AI summary | Reading your week back |

### Forbidden in loading copy

- "Please wait" — too transactional
- "Processing" — vague, technical
- "Loading" — alone is uninformative
- "..." trailing dots are fine; emoji are not
- Exclamation marks (always)

### Why gerund + object

The gerund (`-ing` form) makes the experience active rather than passive. The object reminds the user what the wait is producing. Result: even a 5-second wait feels intentional rather than slow.

---

## AI-Failure Feedback Pattern (canonical)

The AI proxy (file 06) can fail in three ways: network timeout, malformed JSON response, rate limit. Without a defined feedback pattern, every caller invents its own. This is the canonical pattern every AI-calling surface MUST use.

### Pattern

```
1. AI call fails.
2. UI immediately shows on-device geometric / cached score (never blank).
3. Toast appears: "Analyzing your face — this is taking longer than usual."
   (Use `info` severity, 4-second duration.)
4. Background retry queue auto-retries up to 3x with exponential backoff
   (2s, 6s, 18s).
5. On success: toast clears, qualitative score updates silently in place
   (no celebratory toast).
6. On final failure: toast updates to "We couldn't finish analyzing this scan.
   We'll try again next time you open Vela." (`warning` severity, 6 seconds).
7. The scan is marked `qualitativePending: true` in WatermelonDB.
   Reveal screen shows a small "still finalizing" badge until success.
```

### Code reference

```typescript
// src/services/aiFeedback.ts
export async function callAiWithFeedback<T>(
  fn: () => Promise<T>,
  options: { fallback: T; surfaceLabel: string },
): Promise<T> {
  const startedAt = Date.now();
  let attempt = 0;

  while (attempt < 3) {
    try {
      const result = await fn();
      if (Date.now() - startedAt > 8000 && attempt > 0) {
        // Slow but eventually OK — silent success, no toast.
      }
      return result;
    } catch (err) {
      if (attempt === 0) {
        toast.info('Analyzing your face — this is taking longer than usual.', { duration: 4000 });
      }
      attempt++;
      if (attempt < 3) {
        await sleep(2000 * Math.pow(3, attempt - 1));  // 2s, 6s, 18s
      }
    }
  }

  toast.warning(
    "We couldn't finish analyzing this scan. We'll try again next time you open Vela.",
    { duration: 6000 },
  );
  return options.fallback;
}
```

### Forbidden in AI-failure copy
- Exclamation marks
- "Oops!" / "Whoops!" / "Sorry"
- Technical detail ("HTTP 503 returned by ai-proxy")
- Blame on the user
- Urgency

### Where this pattern applies
- Score explanation (file 06)
- Routine generation (file 09)
- Wrapped copy generation (file 38)
- Trial forecast copy (file 41)
- Treatment insight (file 34)
- HealthKit pattern phrasing (file 33)
- Diary inference (file 37)
- Experiment verdict copy (file 44)

Each of these files now references this canonical pattern instead of defining its own.

---

## Permission Recovery Pattern (canonical)

Every permission-denied flow uses the same UI pattern. Cursor MUST NOT invent permission-recovery UIs per surface.

### Pattern

When iOS returns "denied" on a permission request:

1. The asking surface shows a banner (not a toast — banners persist).
2. Banner copy: *"[Permission name] is off. [What it enables.] [CTA: Open Settings]"*
3. CTA opens iOS Settings via `Linking.openSettings()`.
4. On app foreground after Settings change, the surface re-checks permission and clears the banner if granted.

### Per-permission copy

| Permission | Banner copy |
|---|---|
| Camera | *"Camera access is off. Vela needs the camera to capture your scans."* [Open Settings] |
| Notifications | *"Notifications are off. Turn them on to get your weekly check-in reminder."* [Open Settings] |
| Photo Library | *"Photo Library access is off. Turn it on to save share cards."* [Open Settings] |
| HealthKit | *"Apple Health access is off. Turn it on to spot patterns between sleep, hydration, and your face."* [Open Settings] |
| Microphone (diary voice) | *"Microphone is off. Turn it on to record diary entries by voice."* [Open Settings] |

### Voice rules
Same as everywhere — no exclamation marks, never blame, always state what's enabled by granting.

---

## Banner System

Persistent, dismissible state indicators. Used for things like offline state, subscription expired warnings, or system maintenance.

```typescript
// src/components/feedback/Banner.tsx
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/ThemeContext';
import { Body, Caption } from '@/components/ui/Text';
import { Spacing, Radii } from '@/theme/spacing';

type BannerVariant = 'info' | 'warning' | 'error';

interface Props {
  variant?: BannerVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Banner({ variant = 'info', title, description, actionLabel, onAction, onDismiss, icon }: Props) {
  const colors = useColors();
  
  const variantBg = {
    info: colors.accent.background,
    warning: colors.warning.background,
    error: colors.error.background,
  }[variant];
  
  const variantColor = {
    info: colors.accent.default,
    warning: colors.warning.default,
    error: colors.error.default,
  }[variant];
  
  return (
    <View style={{
      backgroundColor: variantBg,
      borderRadius: Radii.lg,
      padding: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    }}>
      {icon && <Ionicons name={icon} size={20} color={variantColor} />}
      
      <View style={{ flex: 1, gap: Spacing.xs }}>
        <Body style={{ fontWeight: '600' }}>{title}</Body>
        {description && <Caption>{description}</Caption>}
        {actionLabel && onAction && (
          <Pressable onPress={onAction} style={{ marginTop: Spacing.sm }}>
            <Body style={{ color: variantColor, fontWeight: '600' }}>{actionLabel}</Body>
          </Pressable>
        )}
      </View>
      
      {onDismiss && (
        <Pressable onPress={onDismiss} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={20} color={colors.text.secondary} />
        </Pressable>
      )}
    </View>
  );
}
```

### When to Use Banner vs Toast

| Use Banner | Use Toast |
|-----------|-----------|
| Persists until acknowledged or fixed | Auto-dismisses |
| About system/account state | About a recent action |
| Offline mode | Save success |
| Subscription expired | Routine task checked |
| Update available | Photo deleted |

---

## Alert System

Native iOS alerts via React Native `Alert` API. Used for destructive confirmations.

```typescript
// src/services/alertService.ts
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ConfirmConfig {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export async function confirm(config: ConfirmConfig): Promise<boolean> {
  if (config.destructive) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
  
  return new Promise((resolve) => {
    Alert.alert(
      config.title,
      config.message,
      [
        {
          text: config.cancelLabel || 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: config.confirmLabel || 'Confirm',
          style: config.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ]
    );
  });
}
```

### Usage

```typescript
const confirmed = await confirm({
  title: 'Delete account?',
  message: 'This permanently deletes your account, all scan data, and routine history.',
  confirmLabel: 'Delete account',
  cancelLabel: 'Cancel',
  destructive: true,
});

if (confirmed) {
  await deleteAccount();
}
```

### Alert Rules

- Only for **destructive or irreversible** actions
- Always include a **specific cancel option**
- Always describe **the consequence** in the message
- Use **destructive: true** to make confirm button red
- Never use for non-blocking confirmations (use Toast instead)

---

## Action Sheet

For choosing between 2-4 options. Uses iOS's native action sheet.

```typescript
// src/services/actionSheetService.ts
import { ActionSheetIOS, Platform } from 'react-native';

interface ActionSheetOption {
  label: string;
  destructive?: boolean;
  cancel?: boolean;
}

interface ShowConfig {
  title?: string;
  options: ActionSheetOption[];
}

export async function showActionSheet({ title, options }: ShowConfig): Promise<number> {
  if (Platform.OS !== 'ios') {
    // Android: implement custom bottom sheet
    return -1;
  }
  
  return new Promise((resolve) => {
    const cancelIndex = options.findIndex((o) => o.cancel);
    const destructiveIndex = options.findIndex((o) => o.destructive);
    
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: options.map((o) => o.label),
        cancelButtonIndex: cancelIndex !== -1 ? cancelIndex : undefined,
        destructiveButtonIndex: destructiveIndex !== -1 ? destructiveIndex : undefined,
      },
      (selectedIndex) => resolve(selectedIndex)
    );
  });
}
```

### Usage

```typescript
const selected = await showActionSheet({
  title: 'Share your progress',
  options: [
    { label: 'Share via Messages' },
    { label: 'Share via Instagram' },
    { label: 'Save to Camera Roll' },
    { label: 'Cancel', cancel: true },
  ],
});
```

---

## Haptic Feedback Patterns

Haptics make the app feel premium when used judiciously, annoying when overused.

### Haptic Catalog

```typescript
// src/services/hapticsService.ts
import * as Haptics from 'expo-haptics';

export const haptics = {
  // Light tap — for routine UI interactions
  // Use for: button presses, toggle switches, checkbox tap
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  
  // Medium tap — for moderate interactions
  // Use for: tab switching, menu open, picker selection
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  
  // Heavy tap — for significant moments
  // Use for: capture shutter, milestone unlocked
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  
  // Selection feedback — for picker scrolling, slider drag
  // Use for: continuous interactions
  selection: () => Haptics.selectionAsync(),
  
  // Success notification — for completed positive actions
  // Use for: routine completed for the day, scan saved
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  
  // Warning notification — for cautious moments
  // Use for: trial ending soon, subscription warnings
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  
  // Error notification — for failures
  // Use for: capture failed, AI failed, save failed
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
```

### Haptic Usage Map

| Action | Haptic |
|--------|--------|
| Primary button press | `light` |
| Routine task check-off | `light` |
| Tab switch | `medium` |
| Picker scroll | `selection` |
| Capture shutter activates | `heavy` |
| Score reveal animation peak | `heavy` |
| Milestone notification appears | `medium` then `success` |
| Toast: success variant | `success` |
| Toast: error variant | `error` |
| Toast: warning variant | `warning` |
| Slider drag (compare) | `selection` (intermittent) |
| Modal/sheet open | `medium` |
| Account deletion confirmed | `warning` |

### Haptic Rules

- **Never haptic on every interaction.** Reserves uniqueness.
- **Match intensity to importance.** A button isn't a milestone.
- **Disable haptics setting in Settings.** Some users genuinely don't want them.
- **Test on real device.** Simulator gives no haptic.
- **No haptic during AR capture.** Could disturb the user holding the phone.

---

## Sound

**Vela uses no sounds in v1.** Beyond Apple's default notification sound for push notifications.

### Why no sounds?

- Most users have phones on silent
- Sound design is hard to get right
- Sound risks feeling like a beauty app or game
- Quiet products feel more premium (Oura, Whoop have minimal sound)

### Future considerations (not v1)

If we add sounds later, scope strictly:
- One sound for capture shutter (subtle, like a real camera)
- One sound for score reveal (single tone)
- Setting to disable all sounds
- All sounds must be < 200ms

---

## Loading States

Different loading indicators for different contexts.

### Inline Spinner (small, in-component)

```typescript
import { ActivityIndicator } from 'react-native';
import { useColors } from '@/theme/ThemeContext';

const colors = useColors();
<ActivityIndicator size="small" color={colors.accent.default} />
```

Use for: button loading state, in-card loading, async data within a card.

### Full-Screen Loading (with copy)

```typescript
// src/components/feedback/LoadingScreen.tsx
import { View, ActivityIndicator } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { Body } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  const colors = useColors();
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
      gap: Spacing.lg,
    }}>
      <ActivityIndicator size="large" color={colors.accent.default} />
      {message && <Body color="secondary">{message}</Body>}
    </View>
  );
}
```

Use for: app initialization, auth check, loading initial data.

### Skeleton Loader (for content that's loading)

```typescript
// src/components/feedback/Skeleton.tsx
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useColors } from '@/theme/ThemeContext';
import { Radii } from '@/theme/spacing';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = Radii.sm }: Props) {
  const colors = useColors();
  const opacity = useSharedValue(0.4);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 1000 }),
      -1,
      true
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  
  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.background.muted,
        },
        animatedStyle,
      ]}
    />
  );
}
```

Use for: list items loading, card content loading, complex layouts.

### Loading Rules

- **Use skeleton for content.** Skeleton looks more premium than spinners.
- **Use spinner for actions.** Button loading state, save in progress.
- **Use full-screen loading sparingly.** Only for app initialization.
- **Always have a max timeout.** If loading exceeds 10 seconds, show error.
- **Show what's loading.** "Generating your routine..." not just a spinner.

---

## Error Boundaries

Catch and gracefully recover from React errors.

```typescript
// src/components/feedback/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Headline, Body } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spacing } from '@/theme/spacing';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
    Sentry.captureException(error, { extra: errorInfo });
  }
  
  reset = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, gap: Spacing.lg }}>
          <Headline>Something went wrong</Headline>
          <Body color="secondary" style={{ textAlign: 'center' }}>
            We've logged the issue. Try again or restart the app.
          </Body>
          <Button title="Try again" onPress={this.reset} fullWidth={false} />
        </View>
      );
    }
    
    return this.props.children;
  }
}
```

Wrap app:

```typescript
// app/_layout.tsx
<ErrorBoundary>
  <ThemeProvider>
    <Stack />
  </ThemeProvider>
</ErrorBoundary>
```

---

## Feedback Anti-Patterns to Avoid

Common mistakes that make apps feel cheap:

### 1. Multiple confirmations in a row
❌ "Are you sure?" → "Really sure?" → "Last chance!"
✅ Single confirmation with clear consequence

### 2. Toast for every action
❌ Toast every time user taps a tab
✅ Toast only for completed actions

### 3. Vague error messages
❌ "Something went wrong"
✅ "Couldn't reach our servers. Try again in a few minutes."

### 4. Loading without context
❌ Spinner for 8 seconds with no copy
✅ "Analyzing your scan..." with progress

### 5. Excessive haptics
❌ Haptic on every button press, every scroll, every checkmark
✅ Haptics for specific moments

### 6. Modal-spam
❌ Modal opens, dismissing modal opens another modal
✅ One modal at a time, no chains

### 7. Banners that linger forever
❌ Offline banner stays even after coming back online
✅ Auto-dismiss when condition resolves
