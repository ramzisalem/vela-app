import {
  computeProgression,
  findContraindications,
  pickBaselineSessionId,
} from './treatmentEngine';
import type { TreatmentDefinition, UserTreatment } from '@/types/treatment';

describe('treatmentEngine', () => {
  describe('findContraindications', () => {
    it('blocks tretinoin in pregnancy mode', () => {
      const findings = findContraindications('tretinoin', ['pregnancy']);
      expect(findings.length).toBe(1);
      expect(findings[0]?.severity).toBe('block');
    });

    it('warns finasteride in postpartum mode', () => {
      const findings = findContraindications('finasteride', ['postpartum']);
      expect(findings.length).toBe(1);
      expect(findings[0]?.severity).toBe('warn');
    });

    it('informs HRT in cancer-recovery mode', () => {
      const findings = findContraindications('hrt-estrogen', ['cancer_recovery']);
      expect(findings.length).toBe(1);
      expect(findings[0]?.severity).toBe('inform');
    });

    it('returns empty when no modes are active', () => {
      expect(findContraindications('tretinoin', [])).toEqual([]);
    });

    it('returns empty for unknown treatments', () => {
      expect(findContraindications('made-up-treatment', ['pregnancy'])).toEqual([]);
    });
  });

  describe('computeProgression', () => {
    const def: TreatmentDefinition = {
      id: 'tretinoin',
      displayName: 'Tretinoin',
      category: 'topical',
      evidenceLevel: 'strong',
      expectedDurationWeeks: 24,
      primaryFaceMetrics: ['skinClarity'],
      expectedProgression: [
        { weekNumber: 1, expected: 'Dryness.', visualCue: 'getting-worse' },
        { weekNumber: 4, expected: 'Retinization.', visualCue: 'getting-worse' },
        { weekNumber: 12, expected: 'Improvements.', visualCue: 'getting-better' },
      ],
      commonSideEffects: [],
      contraindications: [],
      educationCopy: {
        shortDescription: 'x',
        whatItIs: 'x',
        whatToExpect: 'x',
        consistencyNote: 'x',
      },
      requiresPrescription: true,
      genderRelevance: 'all',
    };

    const treatment: UserTreatment = {
      id: 't1',
      userId: 'u1',
      definitionId: 'tretinoin',
      startDate: '2026-04-01',
      status: 'active',
      hasInformedConsent: true,
      createdAt: '2026-04-01',
      updatedAt: '2026-04-01',
    };

    it('finds the most recent marker at or before weeksIn', () => {
      const ctx = computeProgression(def, treatment, new Date('2026-04-22'));
      expect(ctx.weeksIn).toBe(3);
      expect(ctx.currentMarker?.weekNumber).toBe(1);
      expect(ctx.nextMarker?.weekNumber).toBe(4);
    });

    it('returns no current marker before week 1', () => {
      const ctx = computeProgression(def, treatment, new Date('2026-04-02'));
      expect(ctx.weeksIn).toBe(0);
      expect(ctx.currentMarker).toBeUndefined();
      expect(ctx.nextMarker?.weekNumber).toBe(1);
    });
  });

  describe('pickBaselineSessionId', () => {
    const treatment: UserTreatment = {
      id: 't1',
      userId: 'u1',
      definitionId: 'tretinoin',
      startDate: '2026-04-01',
      status: 'active',
      hasInformedConsent: true,
      createdAt: '2026-04-01',
      updatedAt: '2026-04-01',
    };

    it('picks the first scan on or after startDate', () => {
      const id = pickBaselineSessionId(treatment, [
        { id: 'pre', createdAt: '2026-03-25T00:00:00Z' },
        { id: 'post1', createdAt: '2026-04-03T00:00:00Z' },
        { id: 'post2', createdAt: '2026-04-10T00:00:00Z' },
      ]);
      expect(id).toBe('post1');
    });

    it('returns undefined if no scans exist on or after startDate', () => {
      const id = pickBaselineSessionId(treatment, [
        { id: 'pre', createdAt: '2026-03-25T00:00:00Z' },
      ]);
      expect(id).toBeUndefined();
    });
  });
});
