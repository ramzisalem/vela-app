import { useHairStore } from './hairStore';

jest.mock('@/services/hair', () => ({
  syncHairScanToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchHairScansForUser: jest.fn().mockResolvedValue([]),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('hairStore', () => {
  beforeEach(() => useHairStore.getState().reset());

  it('starts disabled with manual cadence', () => {
    const s = useHairStore.getState();
    expect(s.enabled).toBe(false);
    expect(s.preferences.reminderCadence).toBe('manual');
    expect(s.preferences.backCameraOptIn).toBe(false);
  });

  it('opt-in flips both store and preferences', async () => {
    await useHairStore.getState().setEnabled(true);
    const s = useHairStore.getState();
    expect(s.enabled).toBe(true);
    expect(s.preferences.enabled).toBe(true);
  });

  it('records a scan with stamped capturedAt', async () => {
    await useHairStore.getState().setEnabled(true);
    const scan = useHairStore.getState().recordScan({
      userId: 'u1',
      photoPaths: [{ angle: 'crown-top-down', path: '/local/x.png' }],
      densityScores: {
        crown: 70,
        hairline: 80,
        templeLeft: 75,
        templeRight: 76,
        overall: 75,
      },
    });
    expect(scan.id).toBeTruthy();
    expect(scan.capturedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(useHairStore.getState().scans.length).toBe(1);
  });

  it('updates preferences atomically', async () => {
    await useHairStore.getState().setPreferences({ backCameraOptIn: true });
    expect(useHairStore.getState().preferences.backCameraOptIn).toBe(true);
    expect(useHairStore.getState().preferences.reminderCadence).toBe('manual');
  });
});
