/**
 * Local persistence (file 01).
 *
 * Bridges Zustand stores to WatermelonDB. Each helper is best-effort: if
 * the native adapter isn't available (e.g. unit tests, Expo Go without
 * the dev client), the helpers no-op silently. The Supabase remote remains
 * the source of truth for everything that syncs.
 */
import type { DiaryEntry } from '@/types/diary';
import type { ScanSession } from '@/types';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from './index';
import type { ScanSessionModel } from './models/ScanSessionModel';
import type { DiaryEntryModel } from './models/DiaryEntryModel';

function tryDb<T>(fn: (db: ReturnType<typeof getDatabase>) => T): T | null {
  try {
    return fn(getDatabase());
  } catch {
    return null;
  }
}

function applyDiaryFields(
  record: {
    remoteId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    body: string;
    userTagsJson: string;
    inferredTagsJson: string;
    attachedKind: string;
    attachedId: string | null;
    attachedDate: string | null;
    excludeFromAnalysis: boolean;
    source: string;
  },
  entry: DiaryEntry,
) {
  record.remoteId = entry.id;
  record.userId = entry.userId;
  record.createdAt = new Date(entry.createdAt);
  record.updatedAt = new Date(entry.updatedAt);
  record.body = entry.body;
  record.userTagsJson = JSON.stringify(entry.userTags);
  record.inferredTagsJson = JSON.stringify(entry.inferredTags);
  record.attachedKind = entry.attachedTo.kind;
  record.attachedId =
    entry.attachedTo.kind === 'scan'
      ? entry.attachedTo.sessionId
      : entry.attachedTo.kind === 'treatment'
        ? entry.attachedTo.treatmentId
        : null;
  record.attachedDate = entry.attachedTo.kind === 'date' ? entry.attachedTo.date : null;
  record.excludeFromAnalysis = entry.excludeFromAnalysis;
  record.source = entry.source;
}

/** Insert or replace a diary row by `remote_id` + `user_id`. */
export async function upsertDiaryEntry(entry: DiaryEntry): Promise<void> {
  await tryDb(async (db) => {
    await db.write(async () => {
      const collection = db.get<DiaryEntryModel>('diary_entries');
      const found = await collection
        .query(Q.and(Q.where('remote_id', entry.id), Q.where('user_id', entry.userId)))
        .fetch();
      if (found.length > 0) {
        await found[0]!.update((rec) => {
          applyDiaryFields(rec as unknown as Parameters<typeof applyDiaryFields>[0], entry);
        });
        return;
      }
      await collection.create((m: unknown) => {
        applyDiaryFields(
          m as Parameters<typeof applyDiaryFields>[0],
          entry,
        );
      });
    });
  });
}

export async function persistDiaryEntry(entry: DiaryEntry): Promise<void> {
  await upsertDiaryEntry(entry);
}

export async function deleteDiaryEntryLocal(remoteId: string, userId: string): Promise<void> {
  await tryDb(async (db) => {
    await db.write(async () => {
      const collection = db.get<DiaryEntryModel>('diary_entries');
      const rows = await collection
        .query(Q.and(Q.where('remote_id', remoteId), Q.where('user_id', userId)))
        .fetch();
      for (const row of rows) {
        await row.destroyPermanently();
      }
    });
  });
}

export async function loadAllDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  return (await tryDb(async (db) => {
    const collection = db.get('diary_entries');
    const rows = (await collection
      .query(Q.where('user_id', userId))
      .fetch()) as unknown as ReadonlyArray<DiaryRowShape>;
    return rows.map((row) => modelToDiaryEntry(row));
  })) ?? [];
}

interface DiaryRowShape {
  remoteId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  userTagsJson: string;
  inferredTagsJson: string;
  attachedKind: string;
  attachedId: string | null;
  attachedDate: string | null;
  excludeFromAnalysis: boolean;
  source: string;
}

interface ScanSessionDraft {
  remoteId: string;
  userId: string;
  createdAt: Date;
  weekNumber: number;
  isBaseline: boolean;
  scoreOverall: number;
  scoreSkin: number;
  scoreSymmetry: number;
  scoreGrooming: number;
  scoreLighting: number;
  scoreContour: number;
  velaSyncStatus: string;
  photosJson: string;
  contextJson: string;
  rawMetricsJson: string;
  capture3dJson: string | null;
}

function applyScanFields(record: ScanSessionDraft, session: ScanSession) {
  record.remoteId = session.id;
  record.userId = session.userId;
  record.createdAt = new Date(session.createdAt);
  record.weekNumber = session.weekNumber;
  record.isBaseline = session.isBaseline;
  record.scoreOverall = session.scores.overall;
  record.scoreSkin = session.scores.skin;
  record.scoreSymmetry = session.scores.symmetry;
  record.scoreGrooming = session.scores.grooming;
  record.scoreLighting = session.scores.lighting;
  record.scoreContour = session.scores.contour;
  record.velaSyncStatus = session.syncStatus;
  record.photosJson = JSON.stringify(session.photoPaths);
  record.contextJson = JSON.stringify(session.context);
  record.rawMetricsJson = JSON.stringify(session.rawMetrics);
  record.capture3dJson = session.capture3D ? JSON.stringify(session.capture3D) : null;
}

/** Upsert local cache row by `remote_id` + `user_id` (retry sync must not duplicate rows). */
export async function persistScanSession(session: ScanSession): Promise<void> {
  await tryDb(async (db) => {
    await db.write(async () => {
      const collection = db.get<ScanSessionModel>('scan_sessions');
      const found = await collection
        .query(Q.and(Q.where('remote_id', session.id), Q.where('user_id', session.userId)))
        .fetch();
      if (found.length > 0) {
        await found[0]!.update((rec) => {
          applyScanFields(rec as unknown as ScanSessionDraft, session);
        });
        return;
      }
      await collection.create((m: unknown) => {
        applyScanFields(m as ScanSessionDraft, session);
      });
    });
  });
}

export async function loadAllScanSessions(userId: string): Promise<ScanSession[]> {
  const rows =
    (await tryDb(async (db) => {
      const collection = db.get('scan_sessions');
      return (await collection
        .query(Q.where('user_id', userId))
        .fetch()) as unknown as ReadonlyArray<ScanSessionRowShape>;
    })) ?? [];
  return rows.map(modelToScanSession);
}

interface ScanSessionRowShape {
  remoteId: string;
  userId: string;
  createdAt: Date;
  weekNumber: number;
  isBaseline: boolean;
  scoreOverall: number;
  scoreSkin: number;
  scoreSymmetry: number;
  scoreGrooming: number;
  scoreLighting: number;
  scoreContour: number;
  velaSyncStatus: string;
  photosJson: string;
  contextJson: string;
  rawMetricsJson: string;
  capture3dJson: string | null;
}

function modelToDiaryEntry(row: DiaryRowShape): DiaryEntry {
  return {
    id: row.remoteId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    body: row.body,
    userTags: safeParseArray(row.userTagsJson) as DiaryEntry['userTags'],
    inferredTags: safeParseArray(row.inferredTagsJson) as DiaryEntry['inferredTags'],
    attachedTo:
      row.attachedKind === 'scan'
        ? { kind: 'scan', sessionId: row.attachedId ?? '' }
        : row.attachedKind === 'treatment'
          ? { kind: 'treatment', treatmentId: row.attachedId ?? '' }
          : { kind: 'date', date: row.attachedDate ?? '' },
    excludeFromAnalysis: row.excludeFromAnalysis,
    source: row.source as DiaryEntry['source'],
  };
}

function modelToScanSession(row: ScanSessionRowShape): ScanSession {
  const photos = safeParseObject(row.photosJson) as unknown as ScanSession['photoPaths'];
  const context = safeParseObject(row.contextJson) as unknown as ScanSession['context'];
  const rawMetrics = safeParseObject(row.rawMetricsJson) as unknown as ScanSession['rawMetrics'];
  const capture3D = row.capture3dJson
    ? (safeParseObject(row.capture3dJson) as unknown as ScanSession['capture3D'])
    : undefined;
  const session: ScanSession = {
    id: row.remoteId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    weekNumber: row.weekNumber,
    isBaseline: row.isBaseline,
    capturedAngles: ['front', 'left_turn', 'right_turn'],
    transforms: {},
    photoPaths: photos,
    rawMetrics,
    scores: {
      overall: row.scoreOverall,
      skin: row.scoreSkin,
      symmetry: row.scoreSymmetry,
      grooming: row.scoreGrooming,
      lighting: row.scoreLighting,
      contour: row.scoreContour,
    },
    context,
    syncStatus: row.velaSyncStatus as ScanSession['syncStatus'],
  };
  if (capture3D) session.capture3D = capture3D;
  return session;
}

function safeParseArray(s: string): unknown[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function safeParseObject(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
