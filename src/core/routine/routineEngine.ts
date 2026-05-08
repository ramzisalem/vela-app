/**
 * RoutineEngine (file 09).
 *
 * Persona filtering + 8-task cap + life-stage contraindications + treatment
 * complements. The "previewed task ids" stored on profile.flags are honored
 * across the pre-paywall → post-paywall transition (file 40 SPEC_REVIEW_3).
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  DailyRoutine,
  RoutineTask,
  RoutineTaskInstance,
  ScanScores,
  UserProfile,
} from '@/types';
import { TASK_LIBRARY, getTaskById } from './taskLibrary';
import { useLifeStageStore } from '@/stores/lifeStageStore';

interface BuildArgs {
  profile: UserProfile;
  weekNumber: number;
  scores?: ScanScores;
  /** AI-suggested task IDs (file 06). When undefined, deterministic fallback runs. */
  aiTaskIds?: string[];
  personalizationNote?: string;
}

const MAX_TASKS = 8;

function eligibleForProfile(task: RoutineTask, profile: UserProfile): boolean {
  // Framework bias.
  if (task.scoringFrameworkBias !== 'neutral' && task.scoringFrameworkBias !== profile.scoringFramework) {
    return false;
  }
  // Skin condition contraindications.
  if (task.contraindicatedConditions && profile.skinConditions) {
    for (const c of profile.skinConditions) {
      if (task.contraindicatedConditions.includes(c)) return false;
    }
  }
  // Routine intensity (file 09 — minimal users get fewer high-difficulty tasks).
  if (profile.routineIntensity === 'minimal' && (task.difficulty ?? 1) > 1) return false;
  if (profile.routineIntensity === 'standard' && (task.difficulty ?? 1) > 2) return false;
  return true;
}

function eligibleForLifeStage(task: RoutineTask): boolean {
  const active: ReadonlySet<string> = new Set(
    useLifeStageStore.getState().activeModes.map((m) => m.id),
  );
  return !task.contraindicatedInModes.some((m) => active.has(m));
}

function defaultTaskIds(profile: UserProfile): string[] {
  // Always-on AM rituals.
  const always = ['cleanse_am', 'spf_daily', 'moisturize_am', 'cleanse_pm', 'moisturize_pm'];
  // Conditional.
  const extra: string[] = ['expression_release', 'sleep_hygiene'];
  if (profile.scoringFramework === 'masculine') extra.unshift('beard_care');
  if (profile.scoringFramework === 'feminine') extra.unshift('brow_shape');
  if (profile.skinConditions?.includes('redness')) extra.unshift('azelaic_acid');
  if (profile.skinConditions?.includes('fine_lines')) extra.unshift('tretinoin_pm');
  return [...always, ...extra];
}

function buildInstances(taskIds: string[]): RoutineTaskInstance[] {
  return taskIds
    .map((id) => getTaskById(id))
    .filter((t): t is RoutineTask => !!t)
    .map(
      (t): RoutineTaskInstance => ({
        taskId: t.id,
        completedDates: [],
        skippedDates: [],
        addedAt: new Date().toISOString(),
      }),
    );
}

export function buildRoutine(args: BuildArgs): DailyRoutine {
  const { profile, weekNumber, aiTaskIds, personalizationNote } = args;

  const eligible = TASK_LIBRARY.filter(
    (t) => eligibleForProfile(t, profile) && eligibleForLifeStage(t),
  ).map((t) => t.id);

  // Pre-paywall preview: honor locked task IDs (file 40).
  const previewLocked = profile.flags?.previewedRoutineTaskIds;
  if (previewLocked && previewLocked.length > 0) {
    const tasks = buildInstances(previewLocked.filter((id) => eligible.includes(id)));
    return {
      id: uuidv4(),
      userId: profile.id,
      weekNumber,
      generatedAt: new Date().toISOString(),
      tasks,
      personalizationNote,
    };
  }

  const candidate = aiTaskIds && aiTaskIds.length > 0 ? aiTaskIds : defaultTaskIds(profile);
  const filtered = candidate.filter((id) => eligible.includes(id));
  // Cap at 8.
  const final = filtered.slice(0, MAX_TASKS);

  return {
    id: uuidv4(),
    userId: profile.id,
    weekNumber,
    generatedAt: new Date().toISOString(),
    tasks: buildInstances(final),
    personalizationNote,
  };
}

/**
 * Helper for the pre-paywall preview path (file 40). Builds the routine
 * deterministically AND records the chosen task IDs back onto the profile
 * so we don't regenerate them between preview and post-paywall dashboard.
 */
export function buildPreviewRoutine(profile: UserProfile, weekNumber: number) {
  const routine = buildRoutine({ profile, weekNumber });
  const previewedRoutineTaskIds = routine.tasks.map((t) => t.taskId);
  return { routine, previewedRoutineTaskIds };
}
