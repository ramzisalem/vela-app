# 23 — Interactions & Gestures

## Overview
How Vela responds to touch, drag, swipe, and platform interaction patterns. This file covers gesture handling, scroll behavior, pull-to-refresh, swipe actions, and platform integrations like Share extensions.

---

## Touch Targets & Hit Areas

### Minimum sizes
- **Tap target:** 44×44 pt (Apple HIG)
- **Recommended:** 48×48 pt for primary actions
- **Spacing between targets:** 8 pt minimum

### Implementation patterns

```typescript
// Use hitSlop to expand touch area beyond visual size
<Pressable
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  style={{ width: 24, height: 24 }} // Visual size (small icon)
  onPress={handlePress}
>
  <Ionicons name="close" size={24} />
</Pressable>
```

### Press states

All pressables should provide visual feedback:

```typescript
<Pressable
  style={({ pressed }) => [
    styles.base,
    pressed && { opacity: 0.7 },
  ]}
  onPress={handlePress}
>
  ...
</Pressable>
```

**Rules:**
- Use `opacity: 0.7-0.85` for press feedback
- Never use scale animations on simple buttons (feels gamey)
- Press feedback fires on `onPressIn`, releases on `onPressOut`
- Combine with haptic for premium feel

---

## Gesture Handling

Vela uses `react-native-gesture-handler` and `react-native-reanimated` for all custom gestures.

### Compare Slider Gesture (file 11)

The hero gesture in the app. Drag horizontally to reveal before/after.

Key implementation details:
- Pan gesture starts on touch
- `sliderX.value` updates with `e.translationX` (relative)
- Clamp to container bounds (`Math.max(20, Math.min(width - 20, x))`)
- Spring back to position on release if user lifts mid-drag
- Haptic feedback on edge hit

### Pull to Refresh

Used on dashboard and history screens.

```typescript
// In dashboard.tsx
import { ScrollView, RefreshControl } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useState } from 'react';

const colors = useColors();
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await refreshData();
  setRefreshing(false);
};

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent.default}
      colors={[colors.accent.default]} // Android
    />
  }
>
  {...content}
</ScrollView>
```

### Swipe to Dismiss (Modal sheets)

Modal sheets support swipe-down dismissal natively via Expo Router:

```typescript
// In modal screen
<Stack.Screen
  options={{
    presentation: 'modal',
    gestureEnabled: true,
    gestureDirection: 'vertical',
  }}
/>
```

For full-screen modals (like capture flow), gesture should be disabled to prevent accidental abandonment:

```typescript
<Stack.Screen
  options={{
    presentation: 'fullScreenModal',
    gestureEnabled: false,
  }}
/>
```

### Swipe Actions (List Items)

For settings rows that support delete/archive actions:

```typescript
// src/components/ui/SwipeableRow.tsx
import { View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/theme/ThemeContext';
import { haptics } from '@/services/hapticsService';

interface Props {
  children: React.ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
}

export function SwipeableRow({ children, onDelete, onArchive }: Props) {
  const colors = useColors();
  
  function renderRightActions() {
    return (
      <View style={{ flexDirection: 'row' }}>
        {onArchive && (
          <Pressable
            onPress={() => {
              haptics.medium();
              onArchive();
            }}
            style={{
              backgroundColor: colors.warning.default,
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
            accessibilityLabel="Archive"
          >
            <Ionicons name="archive" size={24} color="white" />
          </Pressable>
        )}
        {onDelete && (
          <Pressable
            onPress={() => {
              haptics.warning();
              onDelete();
            }}
            style={{
              backgroundColor: colors.error.default,
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
            accessibilityLabel="Delete"
          >
            <Ionicons name="trash" size={24} color="white" />
          </Pressable>
        )}
      </View>
    );
  }
  
  return (
    <Swipeable renderRightActions={renderRightActions}>
      {children}
    </Swipeable>
  );
}
```

### Long Press

Long press is reserved for **context menus** only. Don't use it for primary actions (users won't discover it).

```typescript
import { Pressable } from 'react-native';
import * as ContextMenu from 'react-native-context-menu-view';

<ContextMenu.ContextMenu
  actions={[
    { title: 'Share', systemIcon: 'square.and.arrow.up' },
    { title: 'Delete', systemIcon: 'trash', destructive: true },
  ]}
  onPress={({ nativeEvent }) => {
    if (nativeEvent.name === 'Share') handleShare();
    else if (nativeEvent.name === 'Delete') handleDelete();
  }}
>
  <ScoreCard scores={scores} />
</ContextMenu.ContextMenu>
```

**Use cases for long-press in Vela:**
- Long-press a session in history → "Share, Compare, Delete"
- Long-press a routine task → "Mark as completed for week, Skip today"
- Long-press a comparison → "Save card, Share, Make this default"

---

## Scroll Behavior

### Default Scroll
- Use `ScrollView` for static content
- Use `FlatList` or `FlashList` for lists with >20 items
- Always include `contentContainerStyle` for padding (don't use `padding` on ScrollView itself)

### Scroll-to-top on tab tap
Standard iOS pattern: tapping the active tab again scrolls the current screen to top.

```typescript
// In each tab screen
import { useScrollToTop } from '@react-navigation/native';
import { useRef } from 'react';
import { ScrollView } from 'react-native';

export default function Screen() {
  const ref = useRef<ScrollView>(null);
  useScrollToTop(ref);
  
  return <ScrollView ref={ref}>{...}</ScrollView>;
}
```

### Bounce vs no-bounce
- iOS: bounce enabled (feels native)
- Android: overscroll glow enabled
- Don't disable these — users expect them

### Sticky headers
For long lists with sections (e.g., history grouped by month):

```typescript
<SectionList
  sections={groupedSessions}
  stickySectionHeadersEnabled
  renderSectionHeader={({ section }) => (
    <View style={{ backgroundColor: colors.background.primary, padding: Spacing.md }}>
      <Label>{section.title}</Label>
    </View>
  )}
  renderItem={({ item }) => <SessionRow session={item} />}
/>
```

---

## Keyboard Handling

### KeyboardAvoidingView

Wrap forms in `KeyboardAvoidingView` to prevent keyboard covering inputs:

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView>
    {/* form content */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Dismiss on tap outside

For screens with a single text input where users might want to dismiss the keyboard:

```typescript
import { TouchableWithoutFeedback, Keyboard } from 'react-native';

<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View>{/* content */}</View>
</TouchableWithoutFeedback>
```

### Return key behavior

Configure `returnKeyType` and `onSubmitEditing` for natural keyboard flow:

```typescript
<TextInput
  returnKeyType="next"
  onSubmitEditing={() => emailInputRef.current?.focus()}
/>

<TextInput
  ref={emailInputRef}
  returnKeyType="done"
  onSubmitEditing={handleSubmit}
/>
```

---

## Platform Integrations

### Share Sheet

Used for share cards and data exports.

```typescript
import * as Sharing from 'expo-sharing';

async function shareCard(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your Vela',
    });
  }
}
```

### Save to Photos

```typescript
import * as MediaLibrary from 'expo-media-library';

async function saveToPhotos(uri: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    toast.error('Photo library access needed');
    return;
  }
  
  await MediaLibrary.saveToLibraryAsync(uri);
  toast.success('Saved to Photos');
}
```

### Calendar Integration (future)

Adding scheduled check-in to Calendar app:

```typescript
import * as Calendar from 'expo-calendar';

async function addCheckInToCalendar(date: Date) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return;
  
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = calendars.find((cal) => cal.allowsModifications);
  if (!defaultCalendar) return;
  
  await Calendar.createEventAsync(defaultCalendar.id, {
    title: 'Vela weekly check-in',
    startDate: date,
    endDate: new Date(date.getTime() + 5 * 60 * 1000), // 5 min
    notes: '90 seconds. Open Vela to capture.',
  });
}
```

(Not implemented in v1 — listed as future enhancement.)

### Apple Health (future, v2)

Optional read access to Sleep and Steps data to enrich the AI's understanding of vitality scores.

```typescript
// Example concept — not implemented in v1
import { HealthKit } from 'expo-health-kit';

async function readSleepData() {
  await HealthKit.requestAuthorization([
    HealthKit.Permissions.SleepAnalysis,
    HealthKit.Permissions.StepCount,
  ]);
  
  const sleep = await HealthKit.queryQuantity({
    type: HealthKit.QuantityType.SleepHoursAsleep,
    unit: 'hours',
    startDate: lastWeek,
    endDate: today,
  });
  
  return sleep;
}
```

---

## Capture-Specific Gestures

The capture flow has unique interaction requirements.

### Anti-tap shutter
The shutter activates **automatically** when alignment checks pass for 0.5s. There is no tap-to-capture button by default.

**Why?** Tapping the shutter:
- Causes the phone to jiggle
- Misaligns the face with the AR overlay
- Adds an interaction the user can fail at

The user CAN manually trigger if they prefer:
- Long-press anywhere on screen → "Capture now" overrides automatic alignment

### Auto-shutter progress feedback (canonical)

Users on the edge of alignment frequently miss the 0.5s window. Without progress feedback they can't tell how close they were. The capture overlay (file 05) renders a progress ring that fills clockwise during the alignment window:

- **0% fill** when any check fails. Reset to empty if alignment breaks mid-window.
- **Fill speed** matches the 500ms timer linearly.
- **Color** transitions from `text.tertiary` (early) to `accent.default` (final 100ms).
- **Reduce-motion**: progress ring is replaced with a single "Hold steady…" text label that switches to "Ready" at 500ms.

This makes near-misses visible: users see the ring at 80%, hold steady, see the shutter fire — instead of guessing why nothing happened.

### Cancel during capture
- Tap "X" in top-left → confirmation alert: "Discard this scan?"
- No swipe-to-dismiss (too easy to trigger accidentally)
- Confirmation prevents lost progress mid-3-angle flow

### Volume button as shutter (v2 only — NOT v1)

Many users associate volume buttons with camera shutter. **This is explicitly v2 — do not implement at v1.** File 05 (capture flow) does not wire volume buttons; auto-shutter and long-press are the only triggers. QA testers should know to expect tap-only behavior.

When v2 ships:

```typescript
import { useEvent, addListener } from 'expo-modules-core';

useEffect(() => {
  const subscription = addListener('VolumeButtonPressed', () => {
    if (allChecksPassed) {
      capturePhoto();
    }
  });
  return () => subscription.remove();
}, [allChecksPassed]);
```

---

## Onboarding Interactions

### Forced linear flow
- Back button disabled
- Swipe-back gesture disabled
- Each screen has a single "Continue" CTA

```typescript
<Stack.Screen
  options={{
    headerShown: false,
    gestureEnabled: false,
    headerBackVisible: false,
  }}
/>
```

### Validation before advance
- Continue button disabled until question is answered
- Multi-select questions: Continue enabled when ≥1 selected
- Single-select: Continue enabled when 1 selected
- Text input: Continue enabled when valid (or skippable)

### Skip handling
- Optional fields show "Skip" instead of "Continue" when empty
- Tapping "Skip" advances without setting the value
- Doesn't interrupt the AI micro-payoffs

---

## Animation Patterns

### Score reveal animation

```typescript
// On reveal screen
import Animated, { useSharedValue, withSequence, withDelay, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { AnimationDuration, AnimationEasing, SpringConfig } from '@/theme/animations';

const scoreScale = useSharedValue(0.3);
const scoreOpacity = useSharedValue(0);

useEffect(() => {
  scoreOpacity.value = withTiming(1, { duration: AnimationDuration.normal });
  scoreScale.value = withSequence(
    withTiming(1.1, { duration: AnimationDuration.reveal, easing: AnimationEasing.bounce }),
    withTiming(1, SpringConfig.gentle),
  );
}, []);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: scoreOpacity.value,
  transform: [{ scale: scoreScale.value }],
}));
```

### Sub-score stagger

After main score animates, sub-scores fan in with a stagger:

```typescript
const subScoreOpacities = [0, 1, 2, 3, 4].map(() => useSharedValue(0));

useEffect(() => {
  subScoreOpacities.forEach((opacity, i) => {
    opacity.value = withDelay(
      AnimationDuration.reveal + i * 80, // 80ms stagger
      withTiming(1, { duration: AnimationDuration.normal })
    );
  });
}, []);
```

### Tab switch animation

Default Expo Router tab transitions are fine. Don't over-customize.

### Page transitions in onboarding

Use `slide_from_right` for forward, no back navigation.

```typescript
<Stack.Screen
  options={{
    animation: 'slide_from_right',
    gestureEnabled: false,
  }}
/>
```

### Modal sheet animations

```typescript
<Stack.Screen
  options={{
    presentation: 'modal',
    animation: 'slide_from_bottom',
    gestureEnabled: true,
  }}
/>
```

### Reduce Motion support

Always respect the user's reduce motion preference:

```typescript
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);
  
  return reducedMotion;
}

// In animations
const reducedMotion = useReducedMotion();
const duration = reducedMotion ? 0 : AnimationDuration.reveal;
```

---

## Drag and Drop (future v2)

Not used in v1, but planned for routine reordering in v2:

```typescript
// Concept for v2 — using react-native-draggable-flatlist
import DraggableFlatList from 'react-native-draggable-flatlist';

<DraggableFlatList
  data={routine.tasks}
  onDragEnd={({ data }) => updateRoutineOrder(data)}
  keyExtractor={(item) => item.id}
  renderItem={({ item, drag, isActive }) => (
    <TaskCard
      task={item}
      onLongPress={drag}
      isActive={isActive}
    />
  )}
/>
```

---

## Interaction Accessibility

Every gesture must have a non-gesture alternative.

| Gesture | Alternative |
|---------|-------------|
| Compare slider | Side-by-side mode (segmented control) |
| Swipe to delete | Long-press menu with Delete option |
| Swipe to dismiss modal | Close button |
| Pull to refresh | Pull-to-refresh works with VoiceOver |
| Long-press context menu | Tap menu icon |
| Pinch to zoom | Tap to zoom (if implemented) |

### VoiceOver considerations

```typescript
// Custom gestures need accessibility labels
<Pressable
  accessibilityRole="adjustable"
  accessibilityLabel="Compare slider"
  accessibilityValue={{ min: 0, max: 100, now: sliderPosition * 100 }}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === 'increment') {
      sliderX.value += 10;
    } else if (event.nativeEvent.actionName === 'decrement') {
      sliderX.value -= 10;
    }
  }}
  accessibilityActions={[
    { name: 'increment' },
    { name: 'decrement' },
  ]}
>
  {/* slider component */}
</Pressable>
```

---

## Interaction Anti-Patterns

### Don't use these
1. **Hover states** on touch — they don't fire
2. **Double-tap to toggle** — confusing, not discoverable
3. **Multi-finger gestures** for primary actions — too easy to miss
4. **Shake to undo** — Apple removed this from default iOS, don't bring it back
5. **Force touch / 3D touch** — deprecated on newer devices
6. **Edge swipes for non-back actions** — conflicts with system gestures

### Do this instead
- Tap states with visual + haptic feedback
- Single-tap to toggle, with clear visual state
- Single-finger gestures with optional alternatives
- Explicit Undo button when undoing matters
- Long-press for context menus
- Standard swipe-back for navigation

---

## Settings for User Control

Some users want to disable certain interactions. Provide options:

```typescript
// In Settings → Accessibility section
- [Toggle] Reduce motion (overrides system)
- [Toggle] Disable haptics
- [Toggle] Larger touch targets (uses 56pt minimum)
- [Toggle] Increase contrast
```

These toggles affect:
- Animation duration → `0` when reduce motion enabled
- All `Haptics.X()` calls → no-ops when disabled
- All buttons get larger padding when "larger targets" enabled
- Border thickness increases when "increase contrast" enabled
