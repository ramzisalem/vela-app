/**
 * Diary store (file 37).
 *
 * Local-first. Persisted to WatermelonDB in v1.5; the Zustand store is the
 * runtime cache the UI reads from.
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  DiaryAttachment,
  DiaryEntry,
  DiaryUserTag,
} from '@/types/diary';
import {
  persistDiaryEntry,
  loadAllDiaryEntries,
  upsertDiaryEntry,
  deleteDiaryEntryLocal,
} from '@/db/persistence';

interface DiaryStore {
  entries: DiaryEntry[];
  /** Add a new entry; returns the persisted record. */
  addEntry: (input: {
    userId: string;
    body: string;
    userTags: DiaryUserTag[];
    attachedTo: DiaryAttachment;
    excludeFromAnalysis?: boolean;
    source?: 'typed' | 'voice';
  }) => DiaryEntry;
  updateEntry: (id: string, patch: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string) => void;
  /** Returns entries within an inclusive ISO date range. */
  entriesInRange: (startIso: string, endIso: string) => DiaryEntry[];
  /** Replace all entries (used on cold-start hydrate). */
  hydrate: (entries: DiaryEntry[]) => void;
  /** Cold-start path: loads from WatermelonDB if available. */
  loadFromLocal: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  entries: [],

  addEntry: (input) => {
    const now = new Date().toISOString();
    const entry: DiaryEntry = {
      id: uuidv4(),
      userId: input.userId,
      body: input.body,
      userTags: input.userTags,
      inferredTags: [],
      attachedTo: input.attachedTo,
      excludeFromAnalysis: input.excludeFromAnalysis ?? false,
      source: input.source ?? 'typed',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ entries: [entry, ...s.entries] }));
    void persistDiaryEntry(entry).catch(() => {
      /* best-effort local cache */
    });
    return entry;
  },

  updateEntry: (id, patch) => {
    let updated: DiaryEntry | undefined;
    set((s) => ({
      entries: s.entries.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
    }));
    if (updated) {
      void upsertDiaryEntry(updated).catch(() => {
        /* best-effort local cache */
      });
    }
  },

  deleteEntry: (id) => {
    const entry = get().entries.find((e) => e.id === id);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    if (entry) {
      void deleteDiaryEntryLocal(entry.id, entry.userId).catch(() => {});
    }
  },

  entriesInRange: (startIso, endIso) => {
    return get().entries.filter((e) => {
      const t = Date.parse(e.createdAt);
      return t >= Date.parse(startIso) && t <= Date.parse(endIso);
    });
  },

  hydrate: (entries) => set({ entries }),

  loadFromLocal: async (userId) => {
    try {
      const local = await loadAllDiaryEntries(userId);
      if (local.length > 0) {
        const sorted = [...local].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        );
        set({ entries: sorted });
      }
    } catch {
      // Native adapter not present (e.g. tests). Best-effort.
    }
  },

  reset: () => set({ entries: [] }),
}));
