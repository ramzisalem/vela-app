import type { ScanSession } from '@/types';

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

jest.mock('@/db/persistence', () => ({
  persistScanSession: jest.fn().mockResolvedValue(undefined),
}));

import { flushScansToRemote } from './flushScanSync';

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
  saveScanResult.mockReset();
});

describe('flushScansToRemote', () => {
  test('pending_sync mode skips failed rows', async () => {
    saveScanResult.mockResolvedValue(undefined);
    const sessions = [
      fakeSession({ id: 'a', syncStatus: 'failed' }),
      fakeSession({ id: 'b', syncStatus: 'pending_sync' }),
    ];
    const next = await flushScansToRemote(sessions, 'pending_sync');
    expect(saveScanResult).toHaveBeenCalledTimes(1);
    expect(saveScanResult).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(next.find((s) => s.id === 'a')?.syncStatus).toBe('failed');
    expect(next.find((s) => s.id === 'b')?.syncStatus).toBe('synced');
  });

  test('pending_sync_or_failed retries both', async () => {
    saveScanResult.mockResolvedValue(undefined);
    const sessions = [
      fakeSession({ id: 'a', syncStatus: 'failed' }),
      fakeSession({ id: 'b', syncStatus: 'pending_sync' }),
    ];
    const next = await flushScansToRemote(sessions, 'pending_sync_or_failed');
    expect(saveScanResult).toHaveBeenCalledTimes(2);
    expect(next.every((s) => s.syncStatus === 'synced')).toBe(true);
  });

  test('ProfileMissingError leaves prior status', async () => {
    saveScanResult.mockRejectedValueOnce(new ProfileMissingError());
    const sessions = [fakeSession({ id: 'x', syncStatus: 'failed' })];
    const next = await flushScansToRemote(sessions, 'pending_sync_or_failed');
    expect(next[0]?.syncStatus).toBe('failed');
  });

  test('does not mutate input sessions array elements', async () => {
    saveScanResult.mockResolvedValue(undefined);
    const original = fakeSession({ id: 'z' });
    const sessions = [original];
    await flushScansToRemote(sessions, 'pending_sync');
    expect(original.syncStatus).toBe('pending_sync');
    expect(sessions[0]?.syncStatus).toBe('pending_sync');
  });
});
