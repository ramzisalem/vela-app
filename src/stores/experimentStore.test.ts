import { useExperimentStore } from './experimentStore';

describe('experimentStore', () => {
  beforeEach(() => {
    useExperimentStore.getState().reset();
  });

  it('starts an experiment in active status', () => {
    const exp = useExperimentStore.getState().startExperiment({
      userId: 'u1',
      hypothesis: { kind: 'add-product', label: 'Niacinamide', dailyAction: 'AM' },
      primaryMetric: 'overall',
      durationWeeks: 6,
      baselineTaskIds: ['t1', 't2'],
    });
    expect(exp.status).toBe('active');
    expect(exp.complianceLog).toEqual([]);
    expect(useExperimentStore.getState().experiments.length).toBe(1);
  });

  it('aborts the prior active experiment when a new one starts', () => {
    const store = useExperimentStore.getState();
    store.startExperiment({
      userId: 'u1',
      hypothesis: { kind: 'add-product', label: 'A', dailyAction: 'AM' },
      primaryMetric: 'overall',
      durationWeeks: 4,
      baselineTaskIds: [],
    });
    store.startExperiment({
      userId: 'u1',
      hypothesis: { kind: 'remove-product', label: 'B', dailyAction: 'PM' },
      primaryMetric: 'overall',
      durationWeeks: 4,
      baselineTaskIds: [],
    });
    const list = useExperimentStore.getState().experiments;
    expect(list.length).toBe(2);
    expect(list.filter((e) => e.status === 'active').length).toBe(1);
    expect(list.filter((e) => e.status === 'aborted').length).toBe(1);
  });

  it('logs compliance and replaces same-day entries', () => {
    const store = useExperimentStore.getState();
    const exp = store.startExperiment({
      userId: 'u1',
      hypothesis: { kind: 'add-product', label: 'A', dailyAction: 'AM' },
      primaryMetric: 'overall',
      durationWeeks: 4,
      baselineTaskIds: [],
    });
    store.logCompliance(exp.id, { date: '2026-05-01', complied: true });
    store.logCompliance(exp.id, { date: '2026-05-01', complied: false });
    const updated = useExperimentStore
      .getState()
      .experiments.find((e) => e.id === exp.id)!;
    expect(updated.complianceLog.length).toBe(1);
    expect(updated.complianceLog[0]?.complied).toBe(false);
  });

  it('completes an experiment when verdict is set', () => {
    const store = useExperimentStore.getState();
    const exp = store.startExperiment({
      userId: 'u1',
      hypothesis: { kind: 'add-product', label: 'A', dailyAction: 'AM' },
      primaryMetric: 'overall',
      durationWeeks: 4,
      baselineTaskIds: [],
    });
    store.setVerdict(exp.id, {
      effectSize: 'unclear',
      primaryMetricDelta: 0.5,
      primaryMetricDeltaConfidence: 0.2,
      expectedDriftFromBand: 0.3,
      attributableDelta: 0.2,
      confounders: [],
      copy: 'Unclear over 4 weeks.',
      complianceRate: 0.8,
      recommendation: 'run-again',
      generatedAt: '2026-06-01T00:00:00Z',
    });
    const updated = useExperimentStore
      .getState()
      .experiments.find((e) => e.id === exp.id)!;
    expect(updated.status).toBe('completed');
    expect(updated.verdict?.effectSize).toBe('unclear');
  });
});
