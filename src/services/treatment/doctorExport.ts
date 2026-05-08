/**
 * Doctor export service (file 34).
 *
 * Calls the `doctor-pdf-export` Supabase Edge Function and returns the
 * signed URL for the resulting PDF. The function does the heavy lifting:
 * pulls the user's treatment, side-effect log, and a small set of
 * scan-derived metrics, renders a single-page PDF, and records it in
 * `doctor_export_requests` with a short-lived signed URL.
 */
import { supabase } from '@/services/supabase';

export interface DoctorExportResult {
  ok: true;
  url: string;
  expiresAt: string;
}

export interface DoctorExportError {
  ok: false;
  error: string;
}

export async function requestDoctorExport(input: {
  userTreatmentId: string;
}): Promise<DoctorExportResult | DoctorExportError> {
  try {
    const { data, error } = await supabase.functions.invoke('doctor-pdf-export', {
      body: { user_treatment_id: input.userTreatmentId },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'invalid_response' };
    }
    const payload = data as { url?: string; expiresAt?: string };
    if (!payload.url || !payload.expiresAt) {
      return { ok: false, error: 'missing_fields' };
    }
    return { ok: true, url: payload.url, expiresAt: payload.expiresAt };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
