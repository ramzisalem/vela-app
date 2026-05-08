import {
  emptySnapshot,
  getHealthService,
  inferCyclePhase,
  setHealthServiceForTesting,
} from './index';
import type { HealthService } from './index';

describe('health service', () => {
  beforeEach(() => {
    getHealthService().reset();
  });

  it('starts with no granted permissions', () => {
    expect(getHealthService().getPermissionState().granted).toBe(false);
  });

  it('grants permissions after request', async () => {
    const state = await getHealthService().requestPermissions();
    expect(state.granted).toBe(true);
    expect(state.readTypes.length).toBeGreaterThan(0);
  });

  it('gates the lazy ask on min scans', () => {
    const service = getHealthService();
    expect(service.isEligibleForHealthAsk(0, null)).toBe(false);
    expect(service.isEligibleForHealthAsk(2, oldestIso(30))).toBe(false);
    expect(service.isEligibleForHealthAsk(3, oldestIso(20))).toBe(false);
    expect(service.isEligibleForHealthAsk(3, oldestIso(22))).toBe(true);
  });

  it('returns empty snapshots in a date range with all-null fields', async () => {
    const range = await getHealthService().fetchSnapshotRange(
      '2026-01-01',
      '2026-01-03',
    );
    expect(range.length).toBe(3);
    for (const snap of range) {
      expect(snap.sleepHours).toBeNull();
      expect(snap.hrvSdnn).toBeNull();
    }
  });

  it('infers cycle phase by day with 28-day default', () => {
    expect(inferCyclePhase(2, 28)).toBe('menstrual');
    expect(inferCyclePhase(8, 28)).toBe('follicular');
    expect(inferCyclePhase(14, 28)).toBe('ovulatory');
    expect(inferCyclePhase(22, 28)).toBe('luteal');
  });

  it('emptySnapshot returns the right shape', () => {
    const s = emptySnapshot('2026-05-08');
    expect(s.date).toBe('2026-05-08');
    expect(s.sleepHours).toBeNull();
    expect(s.cyclePhase).toBeNull();
  });

  it('allows test-only override of the service singleton', () => {
    const stub: HealthService = {
      isAvailable: async () => false,
      requestPermissions: async () => ({
        granted: false,
        readTypes: [],
        updatedAt: '0',
      }),
      getPermissionState: () => ({ granted: false, readTypes: [], updatedAt: '0' }),
      fetchSnapshot: async (d) => emptySnapshot(d),
      fetchSnapshotRange: async () => [],
      isEligibleForHealthAsk: () => false,
      reset: () => {},
    };
    setHealthServiceForTesting(stub);
    expect(getHealthService()).toBe(stub);
  });
});

function oldestIso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
