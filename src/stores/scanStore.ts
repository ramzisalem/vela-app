import { create } from 'zustand';
import type {
  CaptureAngle,
  FaceTransformData,
  RawMetrics,
  ScanContext,
  ScanScores,
  ScanSession,
} from '@/types';
import { supabase } from '@/services/supabase';
import { loadAllScanSessions, persistScanSession } from '@/db/persistence';
import { flushScansToRemote } from '@/services/sync/flushScanSync';

interface ScanStore {
  sessions: ScanSession[];
  latest: ScanSession | null;

  setSessions: (sessions: ScanSession[]) => void;
  addSession: (session: ScanSession) => void;
  getSessionByWeek: (weekNumber: number) => ScanSession | undefined;
  /** Returns oldest + newest if at least two exist (file 11 default). */
  getSessionPair: () => { from: ScanSession; to: ScanSession } | undefined;

  loadSessions: (userId?: string) => Promise<void>;
  /** Retry any locally-stored sessions still in `pending_sync` / `failed`. */
  retryPendingSync: () => Promise<void>;
}

export const useScanStore = create<ScanStore>((set, get) => ({
  sessions: [],
  latest: null,

  setSessions: (sessions) =>
    set({ sessions, latest: sessions.length ? (sessions[sessions.length - 1] ?? null) : null }),

  addSession: (session) => {
    const sessions = [...get().sessions, session].sort(
      (a, b) => a.weekNumber - b.weekNumber,
    );
    set({ sessions, latest: session });
    void persistScanSession(session).catch(() => {
      // Best-effort local cache. Cold-start read tolerates missing rows.
    });
  },

  getSessionByWeek: (weekNumber) => get().sessions.find((s) => s.weekNumber === weekNumber),

  getSessionPair: () => {
    const sessions = get().sessions;
    if (sessions.length < 2) return undefined;
    const from = sessions[0];
    const to = sessions[sessions.length - 1];
    if (!from || !to) return undefined;
    return { from, to };
  },

  loadSessions: async (userId) => {
    if (!userId) return;
    // Local-first: hydrate from WatermelonDB so the app feels instant
    // and works offline. Then fetch remote and reconcile.
    try {
      const local = await loadAllScanSessions(userId);
      if (local.length > 0) {
        const sorted = [...local].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        set({ sessions: sorted, latest: sorted[sorted.length - 1] ?? null });
      }
    } catch {
      // Local store unavailable (Jest, missing native) — fall through to remote.
    }

    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error || !data) return;
    const remote = data.map(rowToSession);
    // Merge: prefer remote rows by id, append any locally-pending
    // sessions that haven't synced yet.
    const remoteIds = new Set(remote.map((s) => s.id));
    const localPending = get().sessions.filter(
      (s) => !remoteIds.has(s.id) && s.syncStatus !== 'synced',
    );
    const merged = [...remote, ...localPending].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    set({ sessions: merged, latest: merged[merged.length - 1] ?? null });
  },

  retryPendingSync: async () => {
    const sessions = get().sessions;
    if (!sessions.some((s) => s.syncStatus === 'pending_sync' || s.syncStatus === 'failed')) {
      return;
    }
    const updated = await flushScansToRemote(sessions, 'pending_sync_or_failed');
    set({
      sessions: updated,
      latest: updated.length ? (updated[updated.length - 1] ?? null) : null,
    });
  },
}));

function rowToSession(row: Record<string, unknown>): ScanSession {
  const scores: ScanScores = {
    overall: Number(row['score_overall']) || 0,
    skin: Number(row['score_skin']) || 0,
    symmetry: Number(row['score_symmetry']) || 0,
    grooming: Number(row['score_grooming']) || 0,
    lighting: Number(row['score_lighting']) || 0,
    contour: Number(row['score_contour']) || 0,
  };
  if (row['perceived_age'] != null) {
    scores.perceivedAge = Number(row['perceived_age']);
  }
  const rawMetrics: RawMetrics = {
    symmetryScore: Number(row['symmetry_score']) || 0,
    jawLineSharpness: Number(row['jaw_line_sharpness']) || 0,
    faceWidthHeightRatio: Number(row['face_width_height_ratio']) || 0,
    underEyeAreaRatio: Number(row['under_eye_area_ratio']) || 0,
    redness: Number(row['redness']) || 0,
  };
  if (row['blemish_count'] != null) {
    rawMetrics.blemishCount = Number(row['blemish_count']);
  }
  if (row['pore_visibility'] != null) {
    rawMetrics.poreVisibility = Number(row['pore_visibility']);
  }
  const context: ScanContext = {};
  if (row['sleep_hours_last_night'] != null) {
    context.sleepHoursLastNight = Number(row['sleep_hours_last_night']);
  }
  if (row['stress_note']) context.stressNote = String(row['stress_note']);
  if (Array.isArray(row['new_products'])) {
    context.newProducts = row['new_products'] as string[];
  }
  if (Array.isArray(row['new_treatments'])) {
    context.newTreatments = row['new_treatments'] as string[];
  }
  if (row['lighting_band']) {
    context.lightingBand = row['lighting_band'] as ScanContext['lightingBand'];
  }
  const session: ScanSession = {
    id: String(row['id']),
    userId: String(row['user_id']),
    createdAt: String(row['created_at']),
    weekNumber: Number(row['week_number']) || 1,
    isBaseline: Boolean(row['is_baseline']),
    capturedAngles: ['front', 'left_turn', 'right_turn'] as CaptureAngle[],
    transforms: {} as Partial<Record<CaptureAngle, FaceTransformData>>,
    photoPaths: {} as Partial<Record<CaptureAngle, string>>,
    rawMetrics,
    scores,
    context,
    syncStatus: 'synced',
  };
  if (row['capture_3d']) session.capture3D = row['capture_3d'] as ScanSession['capture3D'];
  if (row['canonical_pose']) session.canonicalPose = row['canonical_pose'] as ScanSession['canonicalPose'];
  if (row['score_explanation']) session.scoreExplanation = String(row['score_explanation']);
  if (row['qualitative_pending'] != null) {
    session.qualitativePending = Boolean(row['qualitative_pending']);
  }
  return session;
}
