/**
 * Treatment tracking Supabase sync (file 34).
 *
 * RLS restricts rows to `auth.uid() = user_id`. Client passes explicit ids
 * so offline creates reconcile after sign-in.
 */
import { supabase } from '@/services/supabase';
import type {
  UserTreatment,
  UserTreatmentSideEffect,
  UserTreatmentStatus,
  TreatmentId,
} from '@/types/treatment';

interface TreatmentRow {
  id: string;
  user_id: string;
  definition_id: string;
  custom_name: string | null;
  start_date: string;
  end_date: string | null;
  status: UserTreatmentStatus;
  prescriber_label: string | null;
  notes: string | null;
  has_informed_consent: boolean;
  created_at: string;
  updated_at: string;
}

interface SideEffectRow {
  id: string;
  user_treatment_id: string;
  user_id: string;
  side_effect_id: string;
  logged_on: string;
  severity: number;
  notes: string | null;
  resolved: boolean;
  resolved_on: string | null;
  created_at: string;
}

export function rowToUserTreatment(row: TreatmentRow): UserTreatment {
  return {
    id: row.id,
    userId: row.user_id,
    definitionId: row.definition_id as TreatmentId,
    ...(row.custom_name ? { customName: row.custom_name } : {}),
    startDate: row.start_date,
    ...(row.end_date ? { endDate: row.end_date } : {}),
    status: row.status,
    ...(row.prescriber_label ? { prescriberLabel: row.prescriber_label } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    hasInformedConsent: row.has_informed_consent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToSideEffect(row: SideEffectRow): UserTreatmentSideEffect {
  return {
    id: row.id,
    userTreatmentId: row.user_treatment_id,
    sideEffectId: row.side_effect_id,
    loggedOn: row.logged_on,
    severity: row.severity as 1 | 2 | 3 | 4 | 5,
    ...(row.notes ? { notes: row.notes } : {}),
    resolved: row.resolved,
    ...(row.resolved_on ? { resolvedOn: row.resolved_on } : {}),
  };
}

export async function fetchTreatmentsForUser(userId: string): Promise<{
  treatments: UserTreatment[];
  sideEffects: UserTreatmentSideEffect[];
}> {
  const [tRes, sRes] = await Promise.all([
    supabase.from('user_treatments').select('*').eq('user_id', userId).order('start_date', { ascending: true }),
    supabase
      .from('user_treatment_side_effects')
      .select('*')
      .eq('user_id', userId)
      .order('logged_on', { ascending: true }),
  ]);

  if (tRes.error) throw new Error(`user_treatments: ${tRes.error.message}`);
  if (sRes.error) throw new Error(`user_treatment_side_effects: ${sRes.error.message}`);

  const treatments = (tRes.data as TreatmentRow[] | null)?.map(rowToUserTreatment) ?? [];
  const sideEffects = (sRes.data as SideEffectRow[] | null)?.map(rowToSideEffect) ?? [];

  return { treatments, sideEffects };
}

function treatmentToRow(t: UserTreatment): Record<string, unknown> {
  return {
    id: t.id,
    user_id: t.userId,
    definition_id: t.definitionId,
    custom_name: t.customName ?? null,
    start_date: t.startDate.slice(0, 10),
    end_date: t.endDate ? t.endDate.slice(0, 10) : null,
    status: t.status,
    prescriber_label: t.prescriberLabel ?? null,
    notes: t.notes ?? null,
    has_informed_consent: t.hasInformedConsent,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export async function syncUserTreatmentToSupabase(t: UserTreatment): Promise<void> {
  const { error } = await supabase.from('user_treatments').upsert(treatmentToRow(t), {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function syncSideEffectToSupabase(
  e: UserTreatmentSideEffect,
  userId: string,
): Promise<void> {
  const row = {
    id: e.id,
    user_treatment_id: e.userTreatmentId,
    user_id: userId,
    side_effect_id: e.sideEffectId,
    logged_on: e.loggedOn.slice(0, 10),
    severity: e.severity,
    notes: e.notes ?? null,
    resolved: e.resolved,
    resolved_on: e.resolvedOn ? e.resolvedOn.slice(0, 10) : null,
  };
  const { error } = await supabase.from('user_treatment_side_effects').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export function mergeTreatmentsByRecency(
  local: UserTreatment[],
  remote: UserTreatment[],
): UserTreatment[] {
  const map = new Map<string, UserTreatment>();
  for (const r of remote) map.set(r.id, r);
  for (const l of local) {
    const r = map.get(l.id);
    if (!r) {
      map.set(l.id, l);
      continue;
    }
    const lt = Date.parse(l.updatedAt);
    const rt = Date.parse(r.updatedAt);
    const useLocal = !Number.isFinite(rt) || (Number.isFinite(lt) && lt >= rt);
    map.set(l.id, useLocal ? l : r);
  }
  return [...map.values()].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
}

export function mergeSideEffects(
  local: UserTreatmentSideEffect[],
  remote: UserTreatmentSideEffect[],
): UserTreatmentSideEffect[] {
  const map = new Map<string, UserTreatmentSideEffect>();
  for (const r of remote) map.set(r.id, r);
  for (const l of local) map.set(l.id, l);
  return [...map.values()].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
}
