/**
 * Unit tests for the diary store (file 37).
 */
import {
  persistDiaryEntry,
  upsertDiaryEntry,
  deleteDiaryEntryLocal,
} from '@/db/persistence';
import { useDiaryStore } from './diaryStore';

jest.mock('@/db/persistence', () => ({
  persistDiaryEntry: jest.fn().mockResolvedValue(undefined),
  upsertDiaryEntry: jest.fn().mockResolvedValue(undefined),
  deleteDiaryEntryLocal: jest.fn().mockResolvedValue(undefined),
  loadAllDiaryEntries: jest.fn().mockResolvedValue([]),
}));

const mockPersist = persistDiaryEntry as jest.MockedFunction<typeof persistDiaryEntry>;
const mockUpsert = upsertDiaryEntry as jest.MockedFunction<typeof upsertDiaryEntry>;
const mockDeleteLocal = deleteDiaryEntryLocal as jest.MockedFunction<
  typeof deleteDiaryEntryLocal
>;

beforeEach(() => {
  jest.clearAllMocks();
  useDiaryStore.getState().reset();
});

describe('diaryStore', () => {
  test('adds an entry with sensible defaults', () => {
    const entry = useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'A small thing.',
      userTags: ['stressed'],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    expect(entry.body).toBe('A small thing.');
    expect(entry.userTags).toEqual(['stressed']);
    expect(entry.source).toBe('typed');
    expect(entry.excludeFromAnalysis).toBe(false);
    expect(useDiaryStore.getState().entries).toHaveLength(1);
    expect(mockPersist).toHaveBeenCalledTimes(1);
  });

  test('newest entries appear first', () => {
    useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'first',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'second',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    const entries = useDiaryStore.getState().entries;
    expect(entries[0]?.body).toBe('second');
    expect(entries[1]?.body).toBe('first');
  });

  test('updateEntry patches fields and bumps updatedAt', async () => {
    const entry = useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'original',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    await new Promise((r) => setTimeout(r, 10));
    useDiaryStore.getState().updateEntry(entry.id, { body: 'edited' });
    const after = useDiaryStore.getState().entries.find((e) => e.id === entry.id);
    expect(after?.body).toBe('edited');
    expect(after?.updatedAt).not.toBe(entry.updatedAt);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: entry.id, body: 'edited', userId: 'u1' }),
    );
  });

  test('deleteEntry removes a single entry', () => {
    const a = useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'a',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'b',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    useDiaryStore.getState().deleteEntry(a.id);
    expect(useDiaryStore.getState().entries).toHaveLength(1);
    expect(useDiaryStore.getState().entries[0]?.body).toBe('b');
    expect(mockDeleteLocal).toHaveBeenCalledWith(a.id, 'u1');
  });

  test('entriesInRange filters by created date inclusive', () => {
    const e1 = useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: '1',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    // Force createdAt to be older.
    useDiaryStore.setState({
      entries: useDiaryStore
        .getState()
        .entries.map((e) =>
          e.id === e1.id ? { ...e, createdAt: '2026-04-01T00:00:00.000Z' } : e,
        ),
    });
    useDiaryStore.getState().addEntry({
      userId: 'u1',
      body: 'recent',
      userTags: [],
      attachedTo: { kind: 'date', date: '2026-04-30' },
    });
    const inRange = useDiaryStore
      .getState()
      .entriesInRange('2026-03-01T00:00:00.000Z', '2026-04-30T00:00:00.000Z');
    expect(inRange.length).toBe(1);
    expect(inRange[0]?.body).toBe('1');
  });
});
