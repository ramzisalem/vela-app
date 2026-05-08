import { useTreatmentStore } from './treatmentStore';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/services/treatment/treatmentSync', () => {
  const actual = jest.requireActual<typeof import('@/services/treatment/treatmentSync')>(
    '@/services/treatment/treatmentSync',
  );
  return {
    ...actual,
    fetchTreatmentsForUser: jest.fn().mockResolvedValue({ treatments: [], sideEffects: [] }),
    syncUserTreatmentToSupabase: jest.fn().mockResolvedValue(undefined),
    syncSideEffectToSupabase: jest.fn().mockResolvedValue(undefined),
  };
});

describe('treatmentStore', () => {
  beforeEach(() => useTreatmentStore.getState().reset());

  it('starts a treatment in active status', () => {
    const t = useTreatmentStore.getState().startTreatment({
      userId: 'u1',
      definitionId: 'tretinoin',
      startDate: '2026-04-01',
    });
    expect(t.status).toBe('active');
    expect(t.hasInformedConsent).toBe(true);
    expect(useTreatmentStore.getState().treatments.length).toBe(1);
  });

  it('transitions status', () => {
    const t = useTreatmentStore.getState().startTreatment({
      userId: 'u1',
      definitionId: 'tretinoin',
      startDate: '2026-04-01',
    });
    useTreatmentStore.getState().setStatus(t.id, 'paused');
    expect(useTreatmentStore.getState().treatments[0]?.status).toBe('paused');
  });

  it('logs and resolves side effects', () => {
    const t = useTreatmentStore.getState().startTreatment({
      userId: 'u1',
      definitionId: 'tretinoin',
      startDate: '2026-04-01',
    });
    const e = useTreatmentStore.getState().logSideEffect({
      userTreatmentId: t.id,
      userId: 'u1',
      sideEffectId: 'dryness',
      severity: 2,
    });
    expect(useTreatmentStore.getState().sideEffects.length).toBe(1);
    expect(e.resolved).toBe(false);
    useTreatmentStore.getState().resolveSideEffect(e.id, 'u1');
    const stored = useTreatmentStore.getState().sideEffects[0];
    expect(stored?.resolved).toBe(true);
    expect(stored?.resolvedOn).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
