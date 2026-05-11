/**
 * scoringEngine (file 05).
 *
 * processCaptureSession is the canonical entry point after the user finishes
 * three angles. It:
 *   1. Persists each angle's photo from temp → Documents/VelaPhotos/<sessionId>/.
 *   2. Computes raw geometric metrics on-device.
 *   3. Calls AI for grooming + skin assessments.
 *   4. Combines + calibrates into ScanScores.
 *   5. Builds the ScanSession (with pending_sync if profile preflight fails).
 */
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import type {
  CaptureAngle,
  CanonicalPose,
  RawMetrics,
  ScanContext,
  ScanScores,
  ScanSession,
  UserProfile,
} from '@/types';
import { saveScanResult, ProfileMissingError } from '@/services/supabase/profileService';
import { AIService } from '@/services/ai';
import { calibrateScore } from './calibration';
import { buildCapture3D } from '@/core/capture3D';
import type { CaptureResult } from '../../../modules/vela-face-tracker/src/types';

interface PersistedAngle extends CaptureResult {
  angle: CaptureAngle;
  photoPath: string;
}

const PHOTOS_DIR = `${FileSystem.documentDirectory}VelaPhotos/`;

async function ensurePhotosDir(sessionId: string) {
  const sessionDir = `${PHOTOS_DIR}${sessionId}/`;
  await FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true });
  return sessionDir;
}

async function persistPhoto(temp: string, dir: string, angle: CaptureAngle): Promise<string> {
  const dest = `${dir}${angle}.jpg`;
  await FileSystem.copyAsync({ from: temp, to: dest });
  // Delete the temp file. iOS may purge — never score off temp URIs.
  try {
    await FileSystem.deleteAsync(temp, { idempotent: true });
  } catch {
    // Best-effort.
  }
  return dest;
}

function calculateRawMetrics(_angles: PersistedAngle[]): RawMetrics {
  // The real computation runs through Vision/CoreImage in the native module
  // (file 04) — this stub returns plausible defaults until that path lands.
  return {
    symmetryScore: 0.78,
    jawLineSharpness: 0.6,
    faceWidthHeightRatio: 0.74,
    underEyeAreaRatio: 0.18,
    redness: 0.22,
    blemishCount: 2,
    poreVisibility: 0.32,
  };
}

function computeBaseScores(raw: RawMetrics, framework: UserProfile['scoringFramework']): ScanScores {
  return {
    skin: calibrateScore(1 - raw.redness, framework, 'skin'),
    symmetry: calibrateScore(raw.symmetryScore, framework, 'symmetry'),
    grooming: calibrateScore(0.7, framework, 'grooming'),
    lighting: calibrateScore(0.65, framework, 'lighting'),
    contour: calibrateScore(raw.jawLineSharpness, framework, 'contour'),
    overall: 0,
  };
}

function combineOverall(scores: ScanScores): number {
  const weights = { skin: 0.3, symmetry: 0.2, grooming: 0.2, lighting: 0.1, contour: 0.2 };
  const w =
    weights.skin * scores.skin +
    weights.symmetry * scores.symmetry +
    weights.grooming * scores.grooming +
    weights.lighting * scores.lighting +
    weights.contour * scores.contour;
  return Math.round(w);
}

interface ProcessArgs {
  userId: string;
  weekNumber: number;
  isBaseline: boolean;
  angles: ReadonlyArray<{ angle: CaptureAngle; capture: CaptureResult }>;
  profile: UserProfile;
  canonicalPose?: CanonicalPose;
  context?: ScanContext;
}

export async function processCaptureSession(args: ProcessArgs): Promise<ScanSession> {
  const sessionId = uuidv4();
  const dir = await ensurePhotosDir(sessionId);

  const persisted: PersistedAngle[] = [];
  for (const a of args.angles) {
    try {
      const photoPath = await persistPhoto(a.capture.imageUri, dir, a.angle);
      persisted.push({ ...a.capture, angle: a.angle, photoPath });
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`[scoringEngine] persistPhoto failed for ${a.angle}, skipping:`, e);
      }
    }
  }
  if (persisted.length === 0) {
    throw new Error('All captured photos failed to persist locally.');
  }

  const raw = calculateRawMetrics(persisted);
  const baseScores = computeBaseScores(raw, args.profile.scoringFramework);

  // AI: grooming + skin from the front-angle photo.
  //
  // ANY failure in this block — base64 read, network error, supabase auth
  // mishap pre-signup, AIService bug — must NOT take the whole scan down.
  // Fall back to `qualitativePending = true`; the user still gets base scores
  // and AI metrics retry later via the deferred sync path (file 06 fallbacks).
  const front = persisted.find((p) => p.angle === 'front');
  let qualitativePending = false;
  let aiSkin: number | undefined;
  let aiGrooming: number | undefined;
  if (front) {
    try {
      const imageBase64 = await FileSystem.readAsStringAsync(front.photoPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const [skinResult, groomResult] = await Promise.all([
        AIService.assessSkin({
          imageBase64,
          profile: args.profile.scoringFramework,
        }),
        AIService.assessGrooming({
          imageBase64,
          profile: args.profile.scoringFramework,
        }),
      ]);
      if (skinResult) aiSkin = skinResult.score;
      if (groomResult) aiGrooming = groomResult.score;
      if (!skinResult || !groomResult) qualitativePending = true;
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[scoringEngine] AI block failed, falling back to base scores:', e);
      }
      qualitativePending = true;
    }
  }
  const scores: ScanScores = {
    ...baseScores,
    skin: aiSkin !== undefined ? Math.round(0.4 * baseScores.skin + 0.6 * aiSkin) : baseScores.skin,
    grooming:
      aiGrooming !== undefined
        ? Math.round(0.3 * baseScores.grooming + 0.7 * aiGrooming)
        : baseScores.grooming,
    overall: 0,
  };
  scores.overall = combineOverall(scores);

  const frontTransform = front
    ? {
        matrix: front.transform,
        distance: front.distance,
        rotation: front.rotation,
        lightIntensity: front.lightIntensity,
        alignmentQuality: front.alignmentQuality,
      }
    : undefined;

  const capture3D = front
    ? buildCapture3D({
        captured: {
          yaw: front.rotation.yaw,
          pitch: front.rotation.pitch,
          roll: front.rotation.roll,
          lightIntensity: front.lightIntensity,
        },
        canonical: args.canonicalPose,
        symmetry3D: raw.symmetryScore,
      })
    : undefined;

  const session: ScanSession = {
    id: sessionId,
    userId: args.userId,
    createdAt: new Date().toISOString(),
    weekNumber: args.weekNumber,
    isBaseline: args.isBaseline,
    capturedAngles: persisted.map((p) => p.angle),
    transforms: persisted.reduce<ScanSession['transforms']>((acc, p) => {
      acc[p.angle] = {
        matrix: p.transform,
        distance: p.distance,
        rotation: p.rotation,
        lightIntensity: p.lightIntensity,
        alignmentQuality: p.alignmentQuality,
      };
      return acc;
    }, {}),
    photoPaths: persisted.reduce<ScanSession['photoPaths']>((acc, p) => {
      acc[p.angle] = p.photoPath;
      return acc;
    }, {}),
    rawMetrics: raw,
    scores,
    context: args.context ?? {},
    capture3D,
    canonicalPose: args.canonicalPose,
    qualitativePending,
    syncStatus: 'pending_sync',
  };
  void frontTransform;

  // Backend sync. If profile preflight fails (file 03 retry), keep local
  // pending_sync — file 05 fallback. Otherwise mark synced.
  try {
    await saveScanResult(session);
    session.syncStatus = 'synced';
  } catch (e) {
    if (e instanceof ProfileMissingError) {
      session.syncStatus = 'pending_sync';
    } else {
      session.syncStatus = 'failed';
    }
  }

  return session;
}
