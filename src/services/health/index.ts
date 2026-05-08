/**
 * HealthKit service (file 33).
 *
 * On-device first. Raw HealthKit values **never** leave the device — only
 * aggregated correlations (Pearson r, p-value, sample size) ever reach the
 * AI proxy. Eligibility for the lazy permission ask is gated behind ≥3
 * weeks of scans (see `isEligibleForHealthAsk`).
 *
 * The native bridge is provided by `react-native-health` in v1.1; this
 * service wraps it with a typed, mockable surface so the rest of the app
 * never has to think about HK identifiers.
 */
import type {
  HealthPermissionState,
  HealthSnapshot,
  CyclePhase,
} from '@/types/health';

export interface HealthService {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<HealthPermissionState>;
  getPermissionState(): HealthPermissionState;
  /**
   * Pulls a single calendar-day snapshot. Returns nulls for fields the user
   * has not granted access to. **Never** returns raw samples.
   */
  fetchSnapshot(dateIso: string): Promise<HealthSnapshot>;
  /**
   * Pulls snapshots for a closed inclusive ISO range. The implementation
   * batches under the hood so callers don't have to.
   */
  fetchSnapshotRange(startIso: string, endIso: string): Promise<ReadonlyArray<HealthSnapshot>>;
  /**
   * True if the user is eligible for the lazy ask. We only prompt once the
   * user has at least 3 weeks of scans in the local store.
   */
  isEligibleForHealthAsk(scanCount: number, oldestScanIso: string | null): boolean;
  reset(): void;
}

const DEFAULT_PERMISSION: HealthPermissionState = {
  granted: false,
  readTypes: [],
  updatedAt: new Date(0).toISOString(),
};

const ELIGIBILITY_MIN_DAYS = 21;
const ELIGIBILITY_MIN_SCANS = 3;

class StubHealthService implements HealthService {
  private permission: HealthPermissionState = DEFAULT_PERMISSION;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async requestPermissions(): Promise<HealthPermissionState> {
    this.permission = {
      granted: true,
      readTypes: [
        'sleepAnalysis',
        'hrvSdnn',
        'restingHeartRate',
        'cycleTracking',
        'bodyMass',
        'water',
        'mindfulMinutes',
        'stepCount',
      ],
      updatedAt: new Date().toISOString(),
    };
    return this.permission;
  }

  getPermissionState(): HealthPermissionState {
    return this.permission;
  }

  async fetchSnapshot(dateIso: string): Promise<HealthSnapshot> {
    return emptySnapshot(dateIso);
  }

  async fetchSnapshotRange(
    startIso: string,
    endIso: string,
  ): Promise<ReadonlyArray<HealthSnapshot>> {
    const out: HealthSnapshot[] = [];
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      out.push(emptySnapshot(cur.toISOString().slice(0, 10)));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  isEligibleForHealthAsk(scanCount: number, oldestScanIso: string | null): boolean {
    if (scanCount < ELIGIBILITY_MIN_SCANS) return false;
    if (!oldestScanIso) return false;
    const ageDays = Math.floor(
      (Date.now() - Date.parse(oldestScanIso)) / (24 * 60 * 60 * 1000),
    );
    return ageDays >= ELIGIBILITY_MIN_DAYS;
  }

  reset(): void {
    this.permission = DEFAULT_PERMISSION;
  }
}

export function emptySnapshot(date: string): HealthSnapshot {
  return {
    date,
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
  };
}

export function inferCyclePhase(cycleDay: number, cycleLength: number): CyclePhase {
  if (cycleDay <= 5) return 'menstrual';
  const ovulationDay = Math.max(cycleLength - 14, 10);
  if (cycleDay < ovulationDay - 1) return 'follicular';
  if (cycleDay <= ovulationDay + 1) return 'ovulatory';
  return 'luteal';
}

let instance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (!instance) instance = new StubHealthService();
  return instance;
}

export function setHealthServiceForTesting(service: HealthService): void {
  instance = service;
}
