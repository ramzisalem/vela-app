/**
 * Routine engine tests (file 09 + 40 + 50).
 *
 * Validates persona filtering, the 8-task cap, life-stage contraindications,
 * and pre-paywall preview locking.
 */
import { buildRoutine, buildPreviewRoutine } from './routineEngine';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import type { UserProfile } from '@/types';

const baseProfile = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  profileVersion: 1,
  gender: 'non_binary',
  scoringFramework: 'neutral',
  routineIntensity: 'standard',
  notificationsEnabled: true,
  flags: {},
  age: 30,
  ...over,
});

beforeEach(() => {
  useLifeStageStore.setState({ activeModes: [] });
});

describe('buildRoutine', () => {
  it('caps at 8 tasks', () => {
    const r = buildRoutine({ profile: baseProfile(), weekNumber: 1 });
    expect(r.tasks.length).toBeLessThanOrEqual(8);
  });

  it('honors previewedRoutineTaskIds across the paywall (file 40)', () => {
    const r = buildRoutine({
      profile: baseProfile({ flags: { previewedRoutineTaskIds: ['cleanse_am', 'spf_daily'] } }),
      weekNumber: 1,
    });
    expect(r.tasks.map((t) => t.taskId)).toEqual(['cleanse_am', 'spf_daily']);
  });

  it('excludes feminine-only tasks for masculine profiles', () => {
    const r = buildRoutine({
      profile: baseProfile({ scoringFramework: 'masculine' }),
      weekNumber: 1,
    });
    expect(r.tasks.map((t) => t.taskId)).not.toContain('brow_shape');
  });

  it('excludes masculine-only tasks for feminine profiles', () => {
    const r = buildRoutine({
      profile: baseProfile({ scoringFramework: 'feminine' }),
      weekNumber: 1,
    });
    expect(r.tasks.map((t) => t.taskId)).not.toContain('beard_care');
  });

  it('excludes tretinoin during pregnancy', () => {
    useLifeStageStore.setState({
      activeModes: [
        {
          id: 'pregnancy',
          enabledAt: new Date().toISOString(),
          aiOptIn: false,
          clinicOptIn: false,
        },
      ],
    });
    const r = buildRoutine({
      profile: baseProfile({
        skinConditions: ['fine_lines'],
        flags: {},
      }),
      weekNumber: 1,
    });
    expect(r.tasks.map((t) => t.taskId)).not.toContain('tretinoin_pm');
  });

  it('excludes tretinoin when eczema is reported', () => {
    const r = buildRoutine({
      profile: baseProfile({ skinConditions: ['eczema'] }),
      weekNumber: 1,
      aiTaskIds: ['tretinoin_pm', 'cleanse_am'],
    });
    expect(r.tasks.map((t) => t.taskId)).not.toContain('tretinoin_pm');
    expect(r.tasks.map((t) => t.taskId)).toContain('cleanse_am');
  });

  it('caps difficulty for minimal-intensity profiles', () => {
    const r = buildRoutine({
      profile: baseProfile({ routineIntensity: 'minimal' }),
      weekNumber: 1,
      aiTaskIds: ['tretinoin_pm', 'cleanse_am', 'spf_daily'],
    });
    // tretinoin has difficulty 3 — should be filtered out for minimal users
    expect(r.tasks.map((t) => t.taskId)).not.toContain('tretinoin_pm');
  });
});

describe('buildPreviewRoutine', () => {
  it('returns the routine and the locked task IDs to persist on profile', () => {
    const { routine, previewedRoutineTaskIds } = buildPreviewRoutine(baseProfile(), 1);
    expect(previewedRoutineTaskIds).toEqual(routine.tasks.map((t) => t.taskId));
    expect(previewedRoutineTaskIds.length).toBeGreaterThan(0);
  });
});
