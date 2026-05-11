/**
 * Experiment store (file 44).
 *
 * Local-first; syncs to `experiments` table (added in v1.1 migration). One
 * change at a time means there is at most one experiment in `'active'`
 * status per user — `addExperiment` enforces that contract by aborting the
 * prior active one if the user explicitly opts in.
 */
import { create } from 'zustand';
import { uuidv4 } from '@/utils/uuid';
import type {
  ComplianceLogEntry,
  Experiment,
  ExperimentHypothesis,
  ExperimentVerdict,
} from '@/types/experiment';
import type { FaceMetric } from '@/types/aging';

interface ExperimentStore {
  experiments: Experiment[];
  startExperiment: (input: {
    userId: string;
    hypothesis: ExperimentHypothesis;
    primaryMetric: FaceMetric;
    secondaryMetrics?: FaceMetric[];
    durationWeeks: 4 | 6 | 8;
    baselineTaskIds: ReadonlyArray<string>;
    userPrediction?: Experiment['userPrediction'];
  }) => Experiment;
  logCompliance: (id: string, entry: ComplianceLogEntry) => void;
  setVerdict: (id: string, verdict: ExperimentVerdict) => void;
  abortExperiment: (id: string) => void;
  hydrate: (experiments: Experiment[]) => void;
  reset: () => void;
}

export const useExperimentStore = create<ExperimentStore>((set, get) => ({
  experiments: [],

  startExperiment: (input) => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + input.durationWeeks * 7);
    const exp: Experiment = {
      id: uuidv4(),
      userId: input.userId,
      hypothesis: input.hypothesis,
      primaryMetric: input.primaryMetric,
      ...(input.secondaryMetrics ? { secondaryMetrics: input.secondaryMetrics } : {}),
      durationWeeks: input.durationWeeks,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      status: 'active',
      baselineRoutineSnapshot: {
        taskIds: input.baselineTaskIds,
        capturedAt: start.toISOString(),
      },
      ...(input.userPrediction ? { userPrediction: input.userPrediction } : {}),
      complianceLog: [],
      createdAt: start.toISOString(),
      updatedAt: start.toISOString(),
    };
    const aborted = get().experiments.map((e) =>
      e.status === 'active' ? { ...e, status: 'aborted' as const, updatedAt: start.toISOString() } : e,
    );
    set({ experiments: [...aborted, exp] });
    return exp;
  },

  logCompliance: (id, entry) =>
    set((s) => ({
      experiments: s.experiments.map((e) =>
        e.id === id
          ? {
              ...e,
              complianceLog: replaceCompliance(e.complianceLog, entry),
              updatedAt: new Date().toISOString(),
            }
          : e,
      ),
    })),

  setVerdict: (id, verdict) =>
    set((s) => ({
      experiments: s.experiments.map((e) =>
        e.id === id
          ? { ...e, verdict, status: 'completed' as const, updatedAt: new Date().toISOString() }
          : e,
      ),
    })),

  abortExperiment: (id) =>
    set((s) => ({
      experiments: s.experiments.map((e) =>
        e.id === id ? { ...e, status: 'aborted' as const, updatedAt: new Date().toISOString() } : e,
      ),
    })),

  hydrate: (experiments) => set({ experiments }),
  reset: () => set({ experiments: [] }),
}));

function replaceCompliance(
  list: ComplianceLogEntry[],
  next: ComplianceLogEntry,
): ComplianceLogEntry[] {
  const idx = list.findIndex((c) => c.date === next.date);
  if (idx < 0) return [...list, next];
  const copy = [...list];
  copy[idx] = next;
  return copy;
}
