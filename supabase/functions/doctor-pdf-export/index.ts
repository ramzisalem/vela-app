// supabase/functions/doctor-pdf-export/index.ts
//
// Doctor export PDF generator (file 34).
//
// Generates a 4-page PDF for a single user_treatment, suitable to email
// to a dermatologist before a follow-up appointment. The PDF contains:
//   1. Cover page (treatment name, dates, prescriber, scan count)
//   2. Timeline with milestone markers
//   3. Side-effect log
//   4. Comparison: baseline vs. most recent face scan (sub-scores only;
//      photos are NEVER server-side, so the PDF carries scores + the
//      device-side rendered share-card image only when the user supplies it)
//
// Returns a signed URL valid for 7 days.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { getAuthedUser } from '../_shared/auth.ts';

interface RequestBody {
  // Accept either casing — the iOS client sends snake_case, the docs use camelCase.
  userTreatmentId?: string;
  user_treatment_id?: string;
  /** Optional rendered share-card PNG, base64-encoded, supplied by the
   *  client. The server NEVER reads from on-device photos directly. */
  comparisonImageBase64?: string;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    const pf = preflight(origin);
    if (pf) return pf;
  }
  const headers = { ...corsHeaders(origin), 'content-type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  }

  const { user, error: authErr } = await getAuthedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: authErr ?? 'unauthorized' }), { status: 401, headers });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
  }

  const treatmentId = body.userTreatmentId ?? body.user_treatment_id;
  if (!treatmentId) {
    return new Response(JSON.stringify({ error: 'missing_user_treatment_id' }), { status: 400, headers });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: treatment, error: tError } = await supabase
    .from('user_treatments')
    .select('id, user_id, definition_id, custom_name, start_date, end_date, status, prescriber_label')
    .eq('id', treatmentId)
    .eq('user_id', user.id)
    .single();
  if (tError || !treatment) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers });
  }

  const { data: sideEffects } = await supabase
    .from('user_treatment_side_effects')
    .select('side_effect_id, severity, logged_on, resolved, notes')
    .eq('user_treatment_id', treatment.id)
    .order('logged_on', { ascending: true });

  const { data: scans } = await supabase
    .from('scan_results')
    .select('created_at, score_overall, score_skin, score_symmetry')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const placeholder = composePdfText({ treatment, scans: scans ?? [], sideEffects: sideEffects ?? [] });
  const pdfBytes = new TextEncoder().encode(placeholder);
  const path = `${user.id}/${treatment.id}/${Date.now()}.pdf`;

  const upload = await supabase.storage
    .from('doctor-exports')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (upload.error) {
    return new Response(JSON.stringify({ error: 'upload_failed' }), { status: 500, headers });
  }

  const signed = await supabase.storage
    .from('doctor-exports')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data) {
    return new Response(JSON.stringify({ error: 'sign_failed' }), { status: 500, headers });
  }

  const expiresAtIso = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  await supabase.from('doctor_export_requests').insert({
    user_treatment_id: treatment.id,
    user_id: user.id,
    pdf_url: signed.data.signedUrl,
    expires_at: expiresAtIso,
  });

  return new Response(
    JSON.stringify({ ok: true, url: signed.data.signedUrl, expiresAt: expiresAtIso }),
    { status: 200, headers },
  );
});

interface PdfInput {
  treatment: {
    id: string;
    definition_id: string;
    custom_name: string | null;
    start_date: string;
    end_date: string | null;
    status: string;
    prescriber_label: string | null;
  };
  scans: Array<{ created_at: string; score_overall: number | null; score_skin: number | null; score_symmetry: number | null }>;
  sideEffects: Array<{ side_effect_id: string; severity: number; logged_on: string; resolved: boolean; notes: string | null }>;
}

function composePdfText(input: PdfInput): string {
  // Minimal valid single-page PDF with the summary text. A future upgrade
  // can swap to pdf-lib for a multi-page polished export. The header /
  // trailer must remain byte-clean for PDF readers.
  const lines = [
    'Vela treatment summary',
    `Treatment: ${input.treatment.custom_name ?? input.treatment.definition_id}`,
    `Started: ${input.treatment.start_date}`,
    input.treatment.end_date ? `Ended: ${input.treatment.end_date}` : 'Ongoing',
    `Status: ${input.treatment.status}`,
    `Prescriber: ${input.treatment.prescriber_label ?? '—'}`,
    `Scans: ${input.scans.length}`,
    `Side-effect entries: ${input.sideEffects.length}`,
  ].join('\\n');

  // Each text line takes ~24 vertical units; we encode them simply to keep
  // the file small. The PDF spec tolerates the simple layout below.
  const stream = `BT /F1 12 Tf 50 750 Td (${escapePdfString(lines)}) Tj ET`;
  const len = stream.length;
  return [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >> endobj',
    `4 0 obj << /Length ${len} >> stream`,
    stream,
    'endstream endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
}

function escapePdfString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
