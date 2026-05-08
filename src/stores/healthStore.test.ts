/**
 * Unit tests for the health correlation store (file 33).
 */
import { useHealthStore } from './healthStore';
import type { Correlation } from '@/types/health';

beforeEach(() => useHealthStore.getState().reset());

const baseCorrelation: Correlation = {
  id: 'c1',
  faceMetric: 'redness',
  healthSignal: 'sleep',
  pearsonR: -0.42,
  pValue: 0.04,
  sampleSize: 30,
  insight: 'Sleep tends to track with redness here.',
  generatedAt: new Date('2026-04-30').toISOString(),
};

describe('healthStore', () => {
  test('starts ungranted with empty caches', () => {
    const s = useHealthStore.getState();
    expect(s.permission.granted).toBe(false);
    expect(s.snapshots).toEqual([]);
    expect(s.correlations).toEqual([]);
  });

  test('setPermission persists granted + readTypes', () => {
    useHealthStore.getState().setPermission({
      granted: true,
      readTypes: ['sleep', 'hrv'],
      updatedAt: new Date().toISOString(),
    });
    expect(useHealthStore.getState().permission.granted).toBe(true);
    expect(useHealthStore.getState().permission.readTypes).toEqual(['sleep', 'hrv']);
  });

  test('setSnapshots replaces the cache', () => {
    useHealthStore.getState().setSnapshots([
      {
        date: '2026-04-01',
        sleepHours: 7,
        sleepEfficiency: 0.9,
        sleepLatencyMin: 12,
        hrvSdnn: null,
        restingHeartRate: null,
        cyclePhase: null,
        cycleDay: null,
        weightKg: null,
        hydrationMl: null,
        alcoholDrinks: null,
        stepCount: 8000,
        hadIntenseWorkout: false,
      },
    ]);
    expect(useHealthStore.getState().snapshots).toHaveLength(1);
  });

  test('markCorrelationShown stamps shownToUserAt only on the matching id', () => {
    useHealthStore.getState().setCorrelations([
      baseCorrelation,
      { ...baseCorrelation, id: 'c2' },
    ]);
    useHealthStore.getState().markCorrelationShown('c1');
    const map = Object.fromEntries(
      useHealthStore.getState().correlations.map((c) => [c.id, c]),
    );
    expect(map['c1']?.shownToUserAt).toBeTruthy();
    expect(map['c2']?.shownToUserAt).toBeUndefined();
  });

  test('reset clears the entire store', () => {
    useHealthStore.getState().setSnapshots([
      {
        date: '2026-04-01',
        sleepHours: null,
        sleepEfficiency: null,
        sleepLatencyMin: null,
        hrvSdnn: null,
        restingHeartRate: null,
        cyclePhase: null,
        cycleDay: null,
        weightKg: null,
        hydrationMl: null,
        alcoholDrinks: null,
        stepCount: null,
        hadIntenseWorkout: null,
      },
    ]);
    useHealthStore.getState().setCorrelations([baseCorrelation]);
    useHealthStore.getState().reset();
    const s = useHealthStore.getState();
    expect(s.snapshots).toEqual([]);
    expect(s.correlations).toEqual([]);
    expect(s.permission.granted).toBe(false);
  });
});
