// supabase/functions/evaluate-cancel-save/index.ts
//
// Server-side cancel-save evaluator (file 47).
//
// The client also runs `selectSaveOffer()` for instant rendering, but the
// server is the authority: it cross-checks engagement signals against the
// profile and the audit table (`cancel_offers_log`) so the user only ever
// sees an offer they're entitled to once.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { getAuthedUser } from '../_shared/auth.ts';

type OfferKind =
  | 'extension-month-free'
  | 'price-match-yearly'
  | 'consolation-doctor-export'
  | 'no-offer-respectful-goodbye'
  | 'route-to-trial-extension';

interface CancelEvaluation {
  offer: OfferKind;
  reasoning: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    const pf = preflight(origin);
    if (pf) return pf;
  }
  const headers = { ...corsHeaders(origin), 'content-type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers,
    });
  }

  const { user, error: authErr } = await getAuthedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: authErr ?? 'unauthorized' }), {
      status: 401,
      headers,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const [profileRes, scansRes, treatmentsRes, exitedRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, created_at, has_ever_paid, is_in_trial, trial_extended_at, life_stage_modes')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('scan_results')
      .select('created_at')
      .eq('user_id', user.id),
    supabase
      .from('user_treatments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('cancel_offers_log')
      .select('offer_kind')
      .eq('user_id', user.id),
  ]);

  if (profileRes.error || !profileRes.data) {
    return new Response(JSON.stringify({ error: 'profile_not_found' }), {
      status: 404,
      headers,
    });
  }
  const profile = profileRes.data as {
    id: string;
    created_at: string;
    has_ever_paid: boolean;
    is_in_trial: boolean;
    trial_extended_at: string | null;
    life_stage_modes: unknown;
  };
  const scans = (scansRes.data ?? []) as Array<{ created_at: string }>;
  const activeTreatments = (treatmentsRes.data ?? []).length;
  const previousOffers = new Set((exitedRes.data ?? []).map((r) => r.offer_kind as string));

  const activeLifeStageModes = parseActiveLifeStageModeIds(profile.life_stage_modes);

  const now = Date.now();
  const last30 = now - 30 * 24 * 60 * 60 * 1000;
  const scansLast30 = scans.filter((s) => Date.parse(s.created_at) >= last30).length;
  const totalScans = scans.length;
  const daysSinceFirstScan = scans.length
    ? Math.floor((now - Date.parse(scans[0]!.created_at)) / (24 * 60 * 60 * 1000))
    : 0;
  const tenureWeeks = Math.floor(
    (now - Date.parse(profile.created_at)) / (7 * 24 * 60 * 60 * 1000),
  );

  const evaluation = pickOffer({
    isInTrial: profile.is_in_trial,
    hasExtended: profile.trial_extended_at !== null,
    hasEverPaid: profile.has_ever_paid,
    activeLifeStageModes,
    totalScans,
    scansLast30,
    activeTreatments,
    tenureWeeks,
    daysSinceFirstScan,
    previousOffers,
  });

  await supabase.from('cancel_offers_log').insert({
    user_id: user.id,
    offer_kind: evaluation.offer,
    reasoning: evaluation.reasoning,
    decided_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true, ...evaluation }), { status: 200, headers });
});

/** Derive mode ids from `profiles.life_stage_modes` jsonb (strings or { id } objects). */
function parseActiveLifeStageModeIds(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) out.push(item);
    else if (item && typeof item === 'object' && 'id' in item) {
      const id = (item as { id: unknown }).id;
      if (typeof id === 'string' && id.length > 0) out.push(id);
    }
  }
  return out;
}

interface PickOfferInput {
  isInTrial: boolean;
  hasExtended: boolean;
  hasEverPaid: boolean;
  activeLifeStageModes: string[];
  totalScans: number;
  scansLast30: number;
  activeTreatments: number;
  tenureWeeks: number;
  daysSinceFirstScan: number;
  previousOffers: Set<string>;
}

function pickOffer(i: PickOfferInput): CancelEvaluation {
  if (i.isInTrial && !i.hasExtended) {
    return {
      offer: 'route-to-trial-extension',
      reasoning: 'Trial-eligible, never extended',
    };
  }
  if (
    i.activeLifeStageModes.length > 0 &&
    i.totalScans >= 4 &&
    !i.previousOffers.has('extension-month-free')
  ) {
    return {
      offer: 'extension-month-free',
      reasoning: 'Active life-stage mode with engagement',
    };
  }
  if (
    i.tenureWeeks <= 4 &&
    i.totalScans <= 2 &&
    !i.previousOffers.has('extension-month-free')
  ) {
    return {
      offer: 'extension-month-free',
      reasoning: 'Sparse short-tenure user',
    };
  }
  if (i.activeTreatments > 0 && i.totalScans >= 6) {
    return {
      offer: 'consolation-doctor-export',
      reasoning: 'Engaged + active treatment',
    };
  }
  if (
    i.tenureWeeks >= 12 &&
    i.scansLast30 >= 3 &&
    !i.previousOffers.has('price-match-yearly')
  ) {
    return {
      offer: 'price-match-yearly',
      reasoning: 'Long-tenure engaged user',
    };
  }
  return {
    offer: 'no-offer-respectful-goodbye',
    reasoning: 'No matching offer',
  };
}
