# 12 — Notifications

## Overview
Expo Notifications handles weekly check-in reminders, missed-check-in nudges, and milestone notifications. Cross-platform-ready (works on iOS now, Android later).

By v1.5 the spec defines notifications across 7 source files. Without a global budget, a user could reasonably receive 6 push notifications in a single day. This file owns the **notification budget contract** that every other file must respect.

---

## Notification Budget (canonical for the whole spec)

The single most retention-relevant rule in the entire spec: **at most 1 push notification per user per day, in steady state.** The budget table below allows narrow exceptions (a milestone PLUS a Wrapped on the same morning is OK, with bundling), but the default ceiling is one.

### Notification categories

Every push notification in Vela falls into exactly one of these five categories:

| Category | Owner | Cadence | Examples |
|---|---|---|---|
| `routine` | file 12, file 39 | Daily, opt-in | Daily routine reminder, streak quiet-nudge |
| `scan` | file 12 | Weekly, opt-out | Weekly scan reminder, missed-scan nudges |
| `insight` | file 33, file 38 | Event-driven, opt-in | "Patterns we noticed" alert, monthly Wrapped ready |
| `milestone` | file 39, file 45 | Event-driven, no toggle | 7/14/21/30-day streak milestones, anniversary |
| `lifecycle` | file 41, file 46, file 47 | Event-driven, opt-out | Trial day-7 forecast ready, lapsed digest, win-back offer |

Any notification that doesn't fit one of these five categories must NOT be added. This is enforced via a single TypeScript enum (see Type below) — Cursor cannot invent a new category.

### Daily budget (per-user, local time)

| Category | Max per day | Bundling rule |
|---|---:|---|
| `routine` | 1 | If multiple routine nudges qualify, the soonest one wins; others suppressed for the day |
| `scan` | 1 | Weekly check-in always wins over a missed-scan nudge |
| `insight` | 1 | Newest wins (e.g., new HealthKit pattern beats older Wrapped if same day; but see priority table below) |
| `milestone` | 1 | Highest-tier milestone wins (annual > 365d > 30d > 7d) |
| `lifecycle` | 1 | Most recent state change wins |
| **Total per day** | **2** | Hard ceiling; see priority table for collisions |

### Cross-category priority (when two categories want to fire same day)

Some days will be high-traffic (e.g., the 1st of the month + a 7-day streak hit). The hard ceiling is **2 push notifications per day per user**, picked by this priority:

| Priority | Category | Reason |
|---:|---|---|
| 1 | `lifecycle` | Time-sensitive trial / lapsed / win-back |
| 2 | `milestone` | Once-only event the user earned |
| 3 | `scan` | Core product loop |
| 4 | `routine` | Daily habit |
| 5 | `insight` | Defers easily; users who care will see it in-app |

**Rule:** when 3+ categories collide, the bottom-priority categories defer to the next eligible day. Insights defer to the user's next dashboard open (where they're shown as cards, not notifications).

### Quiet hours

All notifications respect:
- iOS Do Not Disturb (system-level; we don't override)
- Quiet Hours settings in Settings → Notifications (v1.5; a per-user 22:00–08:00 default)
- Sundays are routine-quiet by default (file 39 streak rule); only `scan` reminders fire on Sundays

### Per-state suppression (the lapsed-user rule)

A user's `subscription_status` gates entire categories:

| Status | `routine` | `scan` | `insight` | `milestone` | `lifecycle` |
|---|:-:|:-:|:-:|:-:|:-:|
| `trial` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `active` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `lapsed-grace` (days 1-30) | ✓ | ✓ | ✗ | ✓ | ✓ |
| `lapsed-readonly` (days 30+) | ✗ | ✗ | ✗ | ✗ | ✓ (digest only) |
| `cancelled` (hard delete) | ✗ | ✗ | ✗ | ✗ | ✗ |

This single table resolves ~6 cross-file findings about "notification fires when it shouldn't."

### Type

```typescript
// src/types/notifications.ts
// Add to 02_TYPES_AND_MODELS.md.

export type NotificationCategory = 'routine' | 'scan' | 'insight' | 'milestone' | 'lifecycle';

export interface ScheduledNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  ownerFile: string;                 // 'file_38_wrapped' etc., for traceability
  cardKind: string;                  // unique per emission type
  bodyTemplate: string;              // copy template, not the rendered string
  scheduledFor: string;              // ISO datetime (local timezone)
  priority: number;                  // for cross-category collision; lower wins
  // Lifecycle
  status: 'pending' | 'sent' | 'suppressed' | 'cancelled';
  suppressedReason?: 'budget-cap' | 'quiet-hours' | 'subscription-status' | 'duplicate' | 'user-opted-out';
  sentAt?: string;
  bundledWith?: string;              // if bundled with another notification, the partner's id
}

export interface NotificationSendRecord {
  // The audit log of what actually fired. Used by the budget evaluator.
  userId: string;
  date: string;                      // YYYY-MM-DD local
  category: NotificationCategory;
  cardKind: string;
  sentAt: string;
}
```

### The budget evaluator

```typescript
// src/services/notifications/budgetEvaluator.ts
import { ScheduledNotification, NotificationSendRecord } from '@/types/notifications';

export interface BudgetEvaluation {
  shouldSend: boolean;
  suppressedReason?: ScheduledNotification['suppressedReason'];
  bundleWith?: string;
}

export function evaluateBudget(
  candidate: ScheduledNotification,
  todaysSent: NotificationSendRecord[],
  todaysScheduled: ScheduledNotification[],
  userStatus: SubscriptionStatus,
): BudgetEvaluation {
  // 1. Subscription-status gate
  if (!isCategoryAllowedForStatus(candidate.category, userStatus)) {
    return { shouldSend: false, suppressedReason: 'subscription-status' };
  }
  // 2. Quiet hours / DND respected at OS level for iOS; nothing to do here.
  // 3. Per-category daily cap
  const sameCat = todaysSent.filter(s => s.category === candidate.category);
  if (sameCat.length >= 1) {
    return { shouldSend: false, suppressedReason: 'duplicate' };
  }
  // 4. Total daily cap of 2
  if (todaysSent.length >= 2) {
    return { shouldSend: false, suppressedReason: 'budget-cap' };
  }
  // 5. Cross-category priority (resolves collisions among today's pending)
  const pendingThisCategory = todaysScheduled.filter(s => s.status === 'pending');
  const winner = pickHighestPriority([...pendingThisCategory, candidate]);
  if (winner.id !== candidate.id) {
    return { shouldSend: false, suppressedReason: 'budget-cap' };
  }
  return { shouldSend: true };
}
```

The evaluator runs at every scheduled-notification fire time. Suppressed notifications either defer to the next day OR convert to in-app cards (insights become Slot 2 candidates per file 10).

### Lint rule for new notification kinds

Any new notification added by any feature file MUST:
1. Declare its `category` from the enum (no inventing categories).
2. Provide a `priority` value within its category.
3. Provide a `cardKind` unique across all files.
4. Write its `ownerFile` field for traceability.
5. NOT add a new top-level category.

CI lints against the union type so new kinds can't sneak in without registration.

### Per-feature-file checklist (what every notification-emitting file must verify)

When adding a notification, the owning file must answer:
- [ ] Which category? (one of the five)
- [ ] What priority within the category?
- [ ] What's the bundling rule when this collides with same-category?
- [ ] What's the per-status visibility (per the suppression table)?
- [ ] What happens on suppression — does it defer, become an in-app card, or get dropped?
- [ ] Has the cardKind been registered in the global enum?

This list is reproduced in every notification spec section across files 12, 33, 37, 38, 39, 41, 46.

---

## Permission Request Timing (canonical)

`NotificationService.requestPermission()` MUST be called at exactly one place: **immediately after the baseline-reveal screen finishes, alongside the "set your check-in day" picker** (file 07 onboarding's permissions screen). It is NOT called:
- During onboarding before the baseline scan (asking before showing value lowers grant rate)
- From Settings (Settings only re-routes the user to iOS Settings if denied; never re-prompts)
- On every app launch (would be ignored by iOS after first decline anyway)

If denied, the calling surface uses the canonical permission-recovery banner pattern from file 22. Future re-prompts only happen if the user explicitly taps "Enable notifications" from Settings.

---

## Notification Setup

```typescript
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are presented
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  // MARK: - Permission
  static async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5B8DB8',
      });
    }
    
    return finalStatus === 'granted';
  }
  
  // MARK: - Weekly Check-In
  static async scheduleWeeklyCheckIn(weekday: number, hour: number, minute: number): Promise<void> {
    // weekday: 1 = Sunday, 7 = Saturday (Expo convention)
    
    // Cancel existing
    await Notifications.cancelScheduledNotificationAsync('weekly_checkin').catch(() => {});
    
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly_checkin',
      content: {
        title: 'Time for your weekly Vela',
        body: '90 seconds to see this week\'s changes.',
        sound: 'default',
        data: { type: 'weekly_checkin' },
      },
      trigger: {
        weekday,
        hour,
        minute,
        repeats: true,
      },
    });
  }
  
  // MARK: - Missed Check-In Nudges
  static async scheduleMissedCheckInReminder(daysOverdue: number): Promise<void> {
    const messages: Record<number, [string, string]> = {
      2: [
        'Your weekly Vela is overdue',
        'Take 90 seconds — your scoring depends on consistency.',
      ],
      5: [
        'Your tracking is paused',
        'You missed last week\'s scan. Catch up to keep your trends accurate.',
      ],
      14: [
        'Your tracking has been paused for 2 weeks',
        'A long gap will create a discontinuity in your data. Resume when you can.',
      ],
    };
    
    const message = messages[daysOverdue];
    if (!message) return;
    
    await Notifications.scheduleNotificationAsync({
      identifier: `missed_checkin_${daysOverdue}`,
      content: {
        title: message[0],
        body: message[1],
        sound: 'default',
        data: { type: 'missed_checkin', daysOverdue },
      },
      trigger: {
        seconds: daysOverdue * 86400,
      },
    });
  }
  
  // MARK: - Milestone Notifications
  static async sendMilestoneNotification(weekNumber: number): Promise<void> {
    const milestones: Record<number, [string, string]> = {
      4: ['4 weeks of Vela', 'Your first monthly reveal is ready. See what changed.'],
      8: ['8 weeks tracked', 'Two months of consistent data. Your patterns are emerging.'],
      12: ['3 months of Vela', 'Your most comprehensive comparison yet is ready.'],
      26: ['6 months of Vela', 'Half a year of real tracking. Your transformation reveal is ready.'],
      52: ['One year of Vela', 'A full year of weekly data. Your annual reveal is ready.'],
    };
    
    const message = milestones[weekNumber];
    if (!message) return;
    
    await Notifications.scheduleNotificationAsync({
      identifier: `milestone_${weekNumber}`,
      content: {
        title: message[0],
        body: message[1],
        sound: 'default',
        data: { type: 'milestone', weekNumber },
      },
      trigger: { seconds: 1 },
    });
  }
  
  // MARK: - Routine Completion Reminder
  static async scheduleRoutineReminder(hour: number, minute: number): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync('routine_reminder').catch(() => {});
    
    await Notifications.scheduleNotificationAsync({
      identifier: 'routine_reminder',
      content: {
        title: 'Wrapping up your day',
        body: 'A quick check on today\'s routine before bed.',
        sound: 'default',
        data: { type: 'routine_reminder' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }
  
  // MARK: - Cancel All
  static async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  
  // MARK: - Get Scheduled
  static async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }
  
  // MARK: - Update Badge
  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
  
  static async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }
}
```

---

## Notification Listener Setup

Set up in the root layout to handle notification taps and update app state.

```typescript
// In app/_layout.tsx — add notification handling
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  
  useEffect(() => {
    // ... other setup
    
    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });
    
    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      // Route based on notification type
      switch (data.type) {
        case 'weekly_checkin':
        case 'missed_checkin':
          router.push('/(capture)/capture');
          break;
        case 'milestone':
          router.push('/(main)/dashboard');
          break;
        case 'routine_reminder':
          router.push('/(main)/dashboard');
          break;
      }
    });
    
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
  
  // ... rest of layout
}
```

---

## Smart Scheduling Logic

The notification system needs intelligence beyond simple weekly triggers.

```typescript
// src/core/notifications/scheduleManager.ts
import { NotificationService } from '@/services/notifications';
import { useScanStore } from '@/stores/scanStore';
import { differenceInDays, addDays } from 'date-fns';
import { useProfileStore } from '@/stores/profileStore';

export class NotificationScheduleManager {
  /**
   * Called after each scan completion to:
   * 1. Cancel old missed-check-in nudges
   * 2. Schedule new missed-check-in nudges starting 2 days after next expected check-in
   * 3. Schedule milestone notification if applicable
   */
  static async refreshSchedule(weekNumber: number): Promise<void> {
    // Cancel old missed nudges
    await NotificationService.cancelAll();
    
    const profile = useProfileStore.getState().profile;
    if (!profile) return;
    
    // Reschedule weekly check-in (use stored preferences)
    // Note: this requires storing preferences. In v1, just schedule from existing prefs.
    const checkInDay = 2; // Monday — should come from profile preferences
    const checkInHour = 9;
    const checkInMinute = 0;
    
    await NotificationService.scheduleWeeklyCheckIn(checkInDay, checkInHour, checkInMinute);
    
    // Schedule progressive nudges
    await NotificationService.scheduleMissedCheckInReminder(2);
    await NotificationService.scheduleMissedCheckInReminder(5);
    await NotificationService.scheduleMissedCheckInReminder(14);
    
    // Send milestone notification if applicable
    const milestoneWeeks = [4, 8, 12, 26, 52];
    if (milestoneWeeks.includes(weekNumber)) {
      await NotificationService.sendMilestoneNotification(weekNumber);
    }
  }
  
  /**
   * Check if user is overdue for check-in
   */
  static isOverdue(): boolean {
    const { latestSession } = useScanStore.getState();
    if (!latestSession) return false;
    
    const lastCapture = new Date(latestSession.capturedAt);
    const daysSince = differenceInDays(new Date(), lastCapture);
    
    return daysSince > 7;
  }
  
  /**
   * Get days until next expected check-in (negative = overdue)
   */
  static daysUntilNextCheckIn(): number {
    const { latestSession } = useScanStore.getState();
    if (!latestSession) return 0;
    
    const lastCapture = new Date(latestSession.capturedAt);
    const nextCheckIn = addDays(lastCapture, 7);
    return differenceInDays(nextCheckIn, new Date());
  }
}
```

---

## Notification Preferences UI

User-facing controls for notification settings (used in Settings).

```typescript
// src/components/settings/NotificationPreferences.tsx
import { View, Text, Switch, StyleSheet, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import { NotificationService } from '@/services/notifications';
import { Colors } from '@/theme/colors';

const DAYS = [
  { label: 'Sunday', value: 1 },
  { label: 'Monday', value: 2 },
  { label: 'Tuesday', value: 3 },
  { label: 'Wednesday', value: 4 },
  { label: 'Thursday', value: 5 },
  { label: 'Friday', value: 6 },
  { label: 'Saturday', value: 7 },
];

export function NotificationPreferences() {
  const [enabled, setEnabled] = useState(true);
  const [day, setDay] = useState(2); // Monday default
  const [hour, setHour] = useState(9);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  useEffect(() => {
    // Save preferences and reschedule when changed
    if (enabled) {
      NotificationService.scheduleWeeklyCheckIn(day, hour, 0);
    } else {
      NotificationService.cancelAll();
    }
  }, [enabled, day, hour]);
  
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Weekly check-in reminder</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: Colors.border, true: Colors.accent }}
        />
      </View>
      
      {enabled && (
        <>
          <Pressable style={styles.row} onPress={() => setShowDayPicker(!showDayPicker)}>
            <Text style={styles.label}>Day</Text>
            <Text style={styles.value}>
              {DAYS.find((d) => d.value === day)?.label}
            </Text>
          </Pressable>
          
          {showDayPicker && (
            <Picker selectedValue={day} onValueChange={setDay}>
              {DAYS.map((d) => (
                <Picker.Item key={d.value} label={d.label} value={d.value} />
              ))}
            </Picker>
          )}
          
          <Pressable style={styles.row} onPress={() => setShowTimePicker(!showTimePicker)}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>
              {hour < 12 ? `${hour || 12}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
            </Text>
          </Pressable>
          
          {showTimePicker && (
            <Picker selectedValue={hour} onValueChange={setHour}>
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <Picker.Item
                  key={h}
                  label={h < 12 ? `${h || 12}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                  value={h}
                />
              ))}
            </Picker>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: { fontSize: 15 },
  value: { fontSize: 14 },
});
```

---

## App.json Configuration

Make sure `app.json` includes the notification icon and color (already in file 01):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#5B8DB8",
          "sounds": []
        }
      ]
    ]
  }
}
```

The notification icon should be a 96x96 white-on-transparent PNG (Android requirement, but Expo uses it for both platforms).
