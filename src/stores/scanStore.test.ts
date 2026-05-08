/**
 * Unit tests for the scan store (file 04 + 05).
 *
 * Focus: addSession ordering, the retry-pending-sync loop, and the
 * local-first hydrate path.
 */
import type { ScanSession } from '@/types';

jest.mock('@/db/persistence', () => ({
  loadAllScanSessions: jest.fn().mockResolvedValue([]),
  persistScanSession: jest.fn().mockResolvedValue(undefined),
}));

const saveScanResult = jest.fn();
class ProfileMissingError extends Error {
  constructor() {
    super('profile-missing');
    this.name = 'ProfileMissingError';
  }
}
jest.mock('@/services/supabase/profileService', () => ({
  saveScanResult: (...args: unknown[]) => saveScanResult(...args),
  ProfileMissingError,
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

import { useScanStore } from './scanStore';

function fakeSession(overrides: Partial<ScanSession> = {}): ScanSession {
  return {
    id: overrides.id ?? 'session-1',
    userId: 'u1',
    createdAt: '2026-04-30T10:00:00Z',
    weekNumber: 1,
    isBaseline: false,
    capturedAngles: ['front'],
    transforms: {},
    photoPaths: {},
    rawMetrics: {
      symmetryScore: 0.8,
      jawLineSharpness: 0.6,
      faceWidthHeightRatio: 0.74,
      underEyeAreaRatio: 0.18,
      redness: 0.2,
    },
    scores: {
      overall: 70,
      skin: 70,
      symmetry: 75,
      grooming: 60,
      lighting: 65,
      contour: 70,
    },
    context: {},
    syncStatus: 'pending_sync',
    ...overrides,
  };
}

beforeEach(() => {
  useScanStore.setState({ sessions: [], latest: null });
  saveScanResult.mockReset();
});

describe('scanStore', () => {
  test('adds sessions in week-number order', () => {
    useScanStore.getState().addSession(fakeSession({ id: 'a', weekNumber: 2 }));
    useScanStore.getState().addSession(fakeSession({ id: 'b', weekNumber: 1 }));
    const ids = useScanStore.getState().sessions.map((s) => s.id);
    expect(ids).toEqual(['b', 'a']);
    expect(useScanStore.getState().latest?.id).toBe('b');
  });

  test('retryPendingSync marks session synced on success', async () => {
    saveScanResult.mockResolvedValueOnce(undefined);
    useScanStore.getState().addSession(fakeSession({ id: 'a' }));
    await useScanStore.getState().retryPendingSync();
    const updated = useScanStore.getState().sessions[0];
    expect(updated?.syncStatus).toBe('synced');
    expect(saveScanResult).toHaveBeenCalledTimes(1);
  });

  test('retryPendingSync keeps pending on profile-missing', async () => {
    saveScanResult.mockRejectedValueOnce(new ProfileMissingError());
    useScanStore.getState().addSession(fakeSession({ id: 'a' }));
    await useScanStore.getState().retryPendingSync();
    expect(useScanStore.getState().sessions[0]?.syncStatus).toBe('pending_sync');
  });

  test('retryPendingSync transitions to failed on other errors', async () => {
    saveScanResult.mockRejectedValueOnce(new Error('boom'));
    useScanStore.getState().addSession(fakeSession({ id: 'a' }));
    await useScanStore.getState().retryPendingSync();
    expect(useScanStore.getState().sessions[0]?.syncStatus).toBe('failed');
  });

  test('loadSessions noop without userId', async () => {
    await useScanStore.getState().loadSessions(undefined);
    expect(useScanStore.getState().sessions).toEqual([]);
  });

  test('getSessionPair returns oldest + newest', () => {
    useScanStore
      .getState()
      .addSession(fakeSession({ id: 'a', weekNumber: 1, createdAt: '2026-04-01T00:00:00Z' }));
    useScanStore
      .getState()
      .addSession(fakeSession({ id: 'b', weekNumber: 4, createdAt: '2026-04-22T00:00:00Z' }));
    const pair = useScanStore.getState().getSessionPair();
    expect(pair?.from.id).toBe('a');
    expect(pair?.to.id).toBe('b');
  });
});
