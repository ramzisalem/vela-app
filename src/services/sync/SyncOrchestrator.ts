/**
 * SyncOrchestrator (file 03 + file 05).
 *
 * Flushes **`pending_sync`** scans (not `failed`) after cold start or when the
 * profile row becomes available (e.g. post-paywall signup). Foreground and
 * broader retries use `useScanStore.retryPendingSync` — both delegate to
 * `flushScansToRemote` — see `Docs/SYNC_SCAN_RETRY.md`.
 */
import { useScanStore } from '@/stores/scanStore';
import { flushScansToRemote } from '@/services/sync/flushScanSync';

export const SyncOrchestrator = {
  async flushPending(): Promise<void> {
    const sessions = useScanStore.getState().sessions;
    const next = await flushScansToRemote(sessions, 'pending_sync');
    useScanStore.getState().setSessions(next);
  },
};
