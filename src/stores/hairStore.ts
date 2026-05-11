/**
 * Hair tracking store (file 35).
 *
 * Opt-in via Settings → Health & lifestyle. Photos remain on-device;
 * server only sees aggregated density scores.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { uuidv4 } from '@/utils/uuid';
import type {
  HairCaptureAngle,
  HairDensityScores,
  HairProfilePreferences,
  HairScan,
} from '@/types/hair';
import { syncHairScanToSupabase, fetchHairScansForUser } from '@/services/hair';

const ENABLED_KEY = 'vela.hair.enabled';
const PREFS_KEY = 'vela.hair.prefsJson';

interface HairStore {
  enabled: boolean;
  preferences: HairProfilePreferences;
  scans: HairScan[];
  bootstrapComplete: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setPreferences: (prefs: Partial<HairProfilePreferences>) => Promise<void>;
  recordScan: (input: {
    userId: string;
    photoPaths: ReadonlyArray<{ angle: HairCaptureAngle; path: string }>;
    densityScores: HairDensityScores;
  }) => HairScan;
  hydrate: (scans: HairScan[]) => void;
  /** Cold start: prefs from AsyncStorage + history from Supabase (numeric rows). */
  bootstrap: (userId: string) => Promise<void>;
  reset: () => void;
}

const initialPrefs: HairProfilePreferences = {
  enabled: false,
  backCameraOptIn: false,
  reminderCadence: 'manual',
};

function mergeScans(local: HairScan[], remote: HairScan[]): HairScan[] {
  const map = new Map<string, HairScan>();
  for (const r of remote) {
    map.set(r.id, { ...r });
  }
  for (const l of local) {
    const cur = map.get(l.id);
    if (!cur) {
      map.set(l.id, l);
    } else {
      map.set(l.id, {
        ...cur,
        ...l,
        photoPaths:
          l.photoPaths.length >= cur.photoPaths.length ? l.photoPaths : cur.photoPaths,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
  );
}

export const useHairStore = create<HairStore>((set, get) => ({
  enabled: false,
  preferences: initialPrefs,
  scans: [],
  bootstrapComplete: false,

  setEnabled: async (enabled) => {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
    set((s) => ({
      enabled,
      preferences: { ...s.preferences, enabled },
    }));
  },

  setPreferences: async (prefs) => {
    const next = { ...get().preferences, ...prefs };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    set({ preferences: next });
  },

  recordScan: (input) => {
    const scan: HairScan = {
      id: uuidv4(),
      userId: input.userId,
      capturedAt: new Date().toISOString(),
      photoPaths: input.photoPaths,
      densityScores: input.densityScores,
    };
    set((s) => ({ scans: mergeScans([...s.scans, scan], []) }));
    void syncHairScanToSupabase(scan).catch((e) => {
      console.warn('[hair] sync failed', e);
    });
    return scan;
  },

  hydrate: (scans) => set({ scans: mergeScans(scans, []) }),

  bootstrap: async (userId) => {
    let enabled = false;
    let prefs = { ...initialPrefs };
    try {
      const [e, p] = await Promise.all([
        AsyncStorage.getItem(ENABLED_KEY),
        AsyncStorage.getItem(PREFS_KEY),
      ]);
      if (e === 'true') enabled = true;
      if (p) {
        const parsed = JSON.parse(p) as Partial<HairProfilePreferences>;
        prefs = { ...initialPrefs, ...parsed, enabled };
      }
    } catch {
      /* ignore */
    }

    let remote: HairScan[] = [];
    try {
      remote = await fetchHairScansForUser(userId);
    } catch {
      /* offline / anon */
    }

    set((s) => ({
      enabled,
      preferences: { ...prefs, enabled },
      scans: mergeScans(s.scans, remote),
      bootstrapComplete: true,
    }));
  },

  reset: () =>
    set({ enabled: false, preferences: initialPrefs, scans: [], bootstrapComplete: false }),
}));
