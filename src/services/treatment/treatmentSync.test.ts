jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import type { UserTreatment, UserTreatmentSideEffect } from '@/types/treatment';
import { supabase } from '@/services/supabase';
import {
  fetchTreatmentsForUser,
  mergeTreatmentsByRecency,
  mergeSideEffects,
  rowToSideEffect,
  rowToUserTreatment,
} from './treatmentSync';

function t(partial: Partial<UserTreatment> & Pick<UserTreatment, 'id'>): UserTreatment {
  return {
    userId: 'u',
    definitionId: 'tretinoin',
    startDate: '2026-01-01',
    status: 'active',
    hasInformedConsent: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function e(partial: Partial<UserTreatmentSideEffect> & Pick<UserTreatmentSideEffect, 'id'>): UserTreatmentSideEffect {
  return {
    userTreatmentId: 'ut',
    sideEffectId: 'dryness',
    loggedOn: '2026-01-01',
    severity: 2,
    resolved: false,
    ...partial,
  };
}

describe('mergeTreatmentsByRecency', () => {
  it('returns empty when both empty', () => {
    expect(mergeTreatmentsByRecency([], [])).toEqual([]);
  });

  it('merges by id and prefers newer updatedAt', () => {
    const local = t({
      id: 'a',
      startDate: '2026-01-01',
      updatedAt: '2026-02-02T00:00:00.000Z',
      status: 'paused',
    });
    const remote = t({
      id: 'a',
      startDate: '2026-01-01',
      updatedAt: '2026-02-01T00:00:00.000Z',
      status: 'active',
    });
    const out = mergeTreatmentsByRecency([local], [remote]);
    expect(out).toHaveLength(1);
    expect(out[0]?.status).toBe('paused');
  });

  it('keeps remote when it is newer', () => {
    const local = t({
      id: 'a',
      startDate: '2026-01-01',
      updatedAt: '2026-02-01T00:00:00.000Z',
      status: 'paused',
    });
    const remote = t({
      id: 'a',
      startDate: '2026-01-01',
      updatedAt: '2026-02-02T00:00:00.000Z',
      status: 'active',
    });
    const out = mergeTreatmentsByRecency([local], [remote]);
    expect(out[0]?.status).toBe('active');
  });

  it('appends local-only rows and sorts by startDate', () => {
    const remote = t({ id: 'a', startDate: '2026-02-01' });
    const local = t({ id: 'b', startDate: '2026-01-01' });
    const out = mergeTreatmentsByRecency([local], [remote]);
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('prefers local when remote updatedAt is not a valid time', () => {
    const local = t({
      id: 'a',
      startDate: '2026-01-01',
      updatedAt: '2026-02-01T00:00:00.000Z',
      status: 'paused',
    });
    const remote = t({
      id: 'a',
      startDate: '2026-01-01',
      updatedAt: 'invalid',
      status: 'active',
    });
    expect(mergeTreatmentsByRecency([local], [remote])[0]?.status).toBe('paused');
  });
});

describe('mergeSideEffects', () => {
  it('overlays local on remote for same id', () => {
    const remote = e({ id: 'x', resolved: false });
    const local = e({ id: 'x', resolved: true, resolvedOn: '2026-02-01' });
    const out = mergeSideEffects([local], [remote]);
    expect(out).toHaveLength(1);
    expect(out[0]?.resolved).toBe(true);
  });

  it('sorts by loggedOn', () => {
    const a = e({ id: '1', loggedOn: '2026-02-01' });
    const b = e({ id: '2', loggedOn: '2026-01-01' });
    expect(mergeSideEffects([a, b], []).map((x) => x.id)).toEqual(['2', '1']);
  });
});

describe('row mappers', () => {
  it('rowToUserTreatment maps snake_case and optional fields', () => {
    const u = rowToUserTreatment({
      id: 'i',
      user_id: 'uid',
      definition_id: 'tretinoin',
      custom_name: 'My cream',
      start_date: '2026-01-15',
      end_date: null,
      status: 'active',
      prescriber_label: null,
      notes: null,
      has_informed_consent: true,
      created_at: '2026-01-15T00:00:00.000Z',
      updated_at: '2026-01-16T00:00:00.000Z',
    });
    expect(u).toMatchObject({
      id: 'i',
      userId: 'uid',
      customName: 'My cream',
      startDate: '2026-01-15',
      hasInformedConsent: true,
    });
    expect(u.endDate).toBeUndefined();
  });

  it('rowToSideEffect maps optional notes and resolved_on', () => {
    const s = rowToSideEffect({
      id: 'i',
      user_treatment_id: 'ut',
      user_id: 'uid',
      side_effect_id: 'dryness',
      logged_on: '2026-01-10',
      severity: 3,
      notes: 'itchy',
      resolved: true,
      resolved_on: '2026-01-12',
      created_at: '2026-01-10T00:00:00.000Z',
    });
    expect(s).toMatchObject({
      sideEffectId: 'dryness',
      severity: 3,
      notes: 'itchy',
      resolved: true,
      resolvedOn: '2026-01-12',
    });
  });
});

describe('fetchTreatmentsForUser', () => {
  beforeEach(() => {
    jest.mocked(supabase.from).mockReset();
  });

  it('throws when user_treatments returns an error', async () => {
    const ok = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const bad = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'rls' } }),
    };
    jest.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'user_treatments' ? bad : ok) as unknown as ReturnType<typeof supabase.from>,
    );
    await expect(fetchTreatmentsForUser('user-uuid')).rejects.toThrow('user_treatments: rls');
  });

  it('throws when user_treatment_side_effects returns an error', async () => {
    const ok = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const bad = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }),
    };
    jest.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'user_treatment_side_effects' ? bad : ok) as unknown as ReturnType<
        typeof supabase.from
      >,
    );
    await expect(fetchTreatmentsForUser('user-uuid')).rejects.toThrow(
      'user_treatment_side_effects: offline',
    );
  });
});
