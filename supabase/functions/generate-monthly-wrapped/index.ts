// supabase/functions/generate-monthly-wrapped/index.ts
//
// Monthly Wrapped generator (file 38).
//
// Triggered by Supabase Cron (or any job) with `GENERATE_WRAPPED_INTERNAL_SECRET`
// + `x-vela-internal-secret` + JSON `{ userId, month? }` per user, **or** by the
// mobile client with a normal user JWT (no internal header).
//
// Output: a `monthly_wrapped` row keyed by (user_id, month). Statistical
// cards are computed deterministically server-side; AI cards (cover tagline,
// quiet-note, treatment progress note) are filled in via the ai-proxy (OpenAI).
//
// The diary "in-your-words" card stores a placeholder; the device fills in
// the three fragments at view time (diary text is encrypted on-device).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { getAuthedUser } from '../_shared/auth.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface GenerateRequest {
  /** YYYY-MM. Defaults to the previous month. */
  month?: string;
  /** When true, regenerate even if a row already exists. */
  force?: boolean;
  /**
   * Trusted batch path only: requires header `x-vela-internal-secret` matching
   * `GENERATE_WRAPPED_INTERNAL_SECRET` (same value as Supabase Edge secret).
   */
  userId?: string;
}

let outboundOrigin: string | null = null;

serve(async (req) => {
  outboundOrigin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    const pf = preflight(outboundOrigin);
    if (pf) return pf;
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    body = {};
  }

  const internalSecret = Deno.env.get('GENERATE_WRAPPED_INTERNAL_SECRET') ?? '';
  const headerSecret = req.headers.get('x-vela-internal-secret') ?? '';
  const internalUserId =
    internalSecret &&
    headerSecret === internalSecret &&
    typeof body.userId === 'string' &&
    UUID_RE.test(body.userId)
      ? body.userId
      : null;

  let effectiveUserId: string | null = internalUserId;
  if (!effectiveUserId) {
    const authed = await getAuthedUser(req);
    if (!authed.user) return json({ error: 'unauthorized' }, 401);
    effectiveUserId = authed.user.id;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const month = body.month ?? defaultPriorMonth(new Date());
  const { monthStart, monthEnd } = monthRange(month);

  if (!body.force) {
    const { data: existing } = await supabase
      .from('monthly_wrapped')
      .select('payload, ai_cards_ready, color_seed')
      .eq('user_id', effectiveUserId)
      .eq('month', month)
      .maybeSingle();
    if (existing) {
      return json({ ok: true, payload: existing.payload, aiCardsReady: existing.ai_cards_ready });
    }
  }

  const scanSelect =
    'id, created_at, week_number, is_baseline, score_overall, score_skin, score_symmetry, score_grooming, score_lighting, score_contour';
  const { data: monthRows } = await supabase
    .from('scan_results')
    .select(scanSelect)
    .eq('user_id', effectiveUserId)
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', monthEnd.toISOString())
    .order('created_at');
  const priorStart = new Date(monthStart);
  priorStart.setMonth(priorStart.getMonth() - 1);
  const { data: priorRows } = await supabase
    .from('scan_results')
    .select(scanSelect)
    .eq('user_id', effectiveUserId)
    .gte('created_at', priorStart.toISOString())
    .lt('created_at', monthStart.toISOString())
    .order('created_at');

  const monthScans = (monthRows ?? []).map(rowToRawScan);
  const priorScans = (priorRows ?? []).map(rowToRawScan);

  const { data: streakDays } = await supabase
    .from('streak_day_records')
    .select('date, consistent')
    .eq('user_id', effectiveUserId)
    .gte('date', monthStart.toISOString().slice(0, 10))
    .lt('date', monthEnd.toISOString().slice(0, 10));

  const consistentDays = (streakDays ?? []).filter((d: { consistent: boolean }) => d.consistent).length;

  const cards = composeStatisticalCards({
    month,
    scansThisMonth: monthScans,
    scansLastMonth: priorScans,
    consistentDaysThisMonth: consistentDays,
    totalDaysInMonth: daysInMonth(month),
  });

  const colorSeed = fnv1aHex(`${effectiveUserId}|${month}`);

  const payload = { cards };
  const { error } = await supabase.from('monthly_wrapped').upsert(
    {
      user_id: effectiveUserId,
      month,
      payload,
      generated_at: new Date().toISOString(),
      ai_cards_ready: false,
      color_seed: colorSeed,
    },
    { onConflict: 'user_id,month' },
  );
  if (error) return json({ error: 'persist_failed', detail: error.message }, 500);

  return json({ ok: true, payload, aiCardsReady: false, colorSeed });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(outboundOrigin), 'content-type': 'application/json' },
  });
}

function defaultPriorMonth(now: Date): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { monthStart: Date; monthEnd: Date } {
  const [y, m] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m, 1));
  return { monthStart, monthEnd };
}

function daysInMonth(month: string): number {
  const { monthStart, monthEnd } = monthRange(month);
  return Math.round((monthEnd.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000));
}

interface RawScan {
  id: string;
  created_at: string;
  scores: { overall: number; skin: number; symmetry: number; grooming: number; lighting: number; contour: number };
}

function rowToRawScan(row: {
  id: string;
  created_at: string;
  score_overall: number;
  score_skin: number;
  score_symmetry: number;
  score_grooming: number;
  score_lighting: number;
  score_contour: number;
}): RawScan {
  return {
    id: row.id,
    created_at: row.created_at,
    scores: {
      overall: row.score_overall,
      skin: row.score_skin,
      symmetry: row.score_symmetry,
      grooming: row.score_grooming,
      lighting: row.score_lighting,
      contour: row.score_contour,
    },
  };
}

function composeStatisticalCards(input: {
  month: string;
  scansThisMonth: RawScan[];
  scansLastMonth: { scores: RawScan['scores'] }[];
  consistentDaysThisMonth: number;
  totalDaysInMonth: number;
}): unknown[] {
  const cards: unknown[] = [];
  cards.push({ kind: 'cover', month: input.month, tagline: 'A month of showing up.' });
  cards.push({
    kind: 'scans',
    count: input.scansThisMonth.length,
    consistencyNote:
      input.scansThisMonth.length >= 4
        ? 'Every week.'
        : input.scansThisMonth.length >= 2
          ? 'Most weeks.'
          : undefined,
  });
  const heatmap: boolean[] = Array.from({ length: input.totalDaysInMonth }, () => false);
  for (let i = 0; i < Math.min(input.consistentDaysThisMonth, heatmap.length); i++) {
    heatmap[i] = true;
  }
  cards.push({ kind: 'streak', days: input.consistentDaysThisMonth, calendarHeatmap: heatmap });
  cards.push({ kind: 'outro' });
  return cards;
}

/** Stable 32-bit FNV-1a hash (8 hex chars). */
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
