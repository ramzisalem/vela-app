/**
 * NotificationService (file 12).
 *
 * Wraps expo-notifications with a budget engine. Rejects schedule calls that
 * exceed perWeek budgets or fall inside DEFAULT_HOURS_BETWEEN_NOTIFS of an
 * already-scheduled notification.
 *
 * Permission timing: NEVER at app launch. Requested AFTER baseline reveal
 * (file 12 canonical timing).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  BUDGET,
  DEFAULT_HOURS_BETWEEN_NOTIFS,
  type NotificationSurfaceId,
} from '@/core/notifications/types';
import { useProfileStore } from '@/stores/profileStore';

interface ScheduleArgs {
  surface: NotificationSurfaceId;
  title: string;
  body: string;
  trigger: Notifications.NotificationTriggerInput;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = 'vela.notifications.history';

interface HistoryEntry {
  surface: NotificationSurfaceId;
  scheduledAt: string;
  notificationId: string;
}

let memoryHistory: HistoryEntry[] = [];

async function readHistory(): Promise<HistoryEntry[]> {
  return memoryHistory;
}

async function appendHistory(entry: HistoryEntry): Promise<void> {
  memoryHistory.push(entry);
  void STORAGE_KEY;
}

function withinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000;
}

export const NotificationService = {
  async ensurePermission(): Promise<'granted' | 'denied'> {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return 'granted';
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted ? 'granted' : 'denied';
  },

  async configureChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  },

  /**
   * Schedule respecting budget. Returns the notification id, or `null` if
   * suppressed (over budget, opted out, or rate-limited).
   */
  async schedule(args: ScheduleArgs): Promise<string | null> {
    const rule = BUDGET[args.surface];
    if (!rule) return null;
    if (rule.perWeek === 0) return null;

    const profile = useProfileStore.getState().profile;
    if (rule.respectGlobalOptOut && profile && profile.notificationsEnabled === false) {
      return null;
    }

    const history = await readHistory();
    // Per-surface weekly budget.
    const sameSurfaceThisWeek = history.filter(
      (h) => h.surface === args.surface && withinDays(h.scheduledAt, 7),
    );
    if (sameSurfaceThisWeek.length >= rule.perWeek) {
      return null;
    }
    // Global rate limit: no two notifications within 24 hours.
    const recent = history.find((h) =>
      withinDays(h.scheduledAt, DEFAULT_HOURS_BETWEEN_NOTIFS / 24),
    );
    if (recent) return null;

    const permission = await NotificationService.ensurePermission();
    if (permission !== 'granted') return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: { title: args.title, body: args.body, data: args.data ?? {} },
      trigger: args.trigger,
    });

    await appendHistory({
      surface: args.surface,
      scheduledAt: new Date().toISOString(),
      notificationId: id,
    });
    return id;
  },

  async cancelBySurface(surface: NotificationSurfaceId): Promise<void> {
    const history = await readHistory();
    const matching = history.filter((h) => h.surface === surface);
    for (const h of matching) {
      await Notifications.cancelScheduledNotificationAsync(h.notificationId).catch(() => undefined);
    }
    memoryHistory = history.filter((h) => h.surface !== surface);
  },

  async clearAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    memoryHistory = [];
  },
};
