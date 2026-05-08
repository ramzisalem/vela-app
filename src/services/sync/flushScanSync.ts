/**
 * Shared scan → Supabase flush logic for `SyncOrchestrator` and `retryPendingSync`.
 */
import type { ScanSession } from '@/types';
import { persistScanSession } from '@/db/persistence';
import { saveScanResult, ProfileMissingError } from '@/services/supabase/profileService';

export type ScanFlushMode = 'pending_sync' | 'pending_sync_or_failed';

function shouldAttemptFlush(s: ScanSession, mode: ScanFlushMode): boolean {
  if (mode === 'pending_sync') return s.syncStatus === 'pending_sync';
  return s.syncStatus === 'pending_sync' || s.syncStatus === 'failed';
}

/**
 * Attempts `saveScanResult` for sessions matching `mode`. Returns a new array;
 * does not mutate `sessions`. On success, persists Watermelon rows best-effort.
 */
export async function flushScansToRemote(
  sessions: ScanSession[],
  mode: ScanFlushMode,
): Promise<ScanSession[]> {
  const byId = new Map(sessions.map((s) => [s.id, { ...s }]));
  const toTry = sessions.filter((s) => shouldAttemptFlush(s, mode));

  for (const session of toTry) {
    const current = byId.get(session.id);
    if (!current) continue;
    try {
      await saveScanResult(current);
      const synced = { ...current, syncStatus: 'synced' as const };
      byId.set(session.id, synced);
      void persistScanSession(synced).catch(() => {});
    } catch (e) {
      if (e instanceof ProfileMissingError) {
        continue;
      }
      byId.set(session.id, { ...current, syncStatus: 'failed' as const });
    }
  }

  return sessions.map((s) => byId.get(s.id) ?? s);
}
