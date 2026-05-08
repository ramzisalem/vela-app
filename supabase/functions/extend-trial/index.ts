// supabase/functions/extend-trial/index.ts
//
// Trial extension Edge Function (file 41).
//
// Eligibility (server-checked):
//   - User must be in active trial.
//   - Must NOT have already extended once.
//   - Must NOT have ever paid (lapsed-paid users route to file 47/46).
//
// Implementation: grants a 14-day promotional entitlement via RevenueCat's
// admin API and stamps `profiles.trial_extended_at`.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { getAuthedUser } from '../_shared/auth.ts';

const RC_API_KEY = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
const RC_ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'vela_premium';

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    const pf = preflight(origin);
    if (pf) return pf;
  }
  const headers = { ...corsHeaders(origin), 'content-type': 'application/json' };

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, headers);
  }

  const { user, error: authErr } = await getAuthedUser(req);
  if (!user) {
    return json({ error: authErr ?? 'unauthorized' }, 401, headers);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, trial_extended_at, has_ever_paid, is_in_trial')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return json({ error: 'profile_not_found' }, 404, headers);
  }
  if (profile.trial_extended_at) {
    return json({ error: 'already-extended' }, 409, headers);
  }
  if (profile.has_ever_paid) {
    return json({ error: 'not-eligible' }, 403, headers);
  }
  if (!profile.is_in_trial) {
    return json({ error: 'not-in-trial' }, 409, headers);
  }

  if (RC_API_KEY) {
    try {
      const grant = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${user.id}/entitlements/${RC_ENTITLEMENT_ID}/promotional`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${RC_API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ duration: 'two_week', start_time_ms: Date.now() }),
        },
      );
      if (!grant.ok) {
        console.error('[extend-trial] RC grant failed', await grant.text());
        return json({ error: 'rc_grant_failed' }, 502, headers);
      }
    } catch (e) {
      console.error('[extend-trial] RC error', e);
      return json({ error: 'rc_unavailable' }, 502, headers);
    }
  }

  const now = new Date();
  const ends = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await supabase
    .from('profiles')
    .update({
      trial_extended_at: now.toISOString(),
      trial_extension_ends_at: ends.toISOString(),
    })
    .eq('id', user.id);

  return json({ ok: true, ends_at: ends.toISOString() }, 200, headers);
});

function json(body: Record<string, unknown>, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}
