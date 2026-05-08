// supabase/functions/send-lapsed-digest/index.ts
//
// Lapsed-grace monthly digest (file 47).
//
// Cron-triggered. Picks users whose RevenueCat-mirrored subscription row is
// inactive, expired within the last 30 days (`subscriptions.expires_at`), who
// opted into email digests, and who have not received a digest in 30 days
// (`profiles.last_digest_sent_at`).
//
// External email provider is plugged in via the `RESEND_API_KEY` env var.
// If unset, the function logs the queued list and returns 200 — useful for
// dry runs in staging.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_ADDR = Deno.env.get('LAPSED_DIGEST_FROM') ?? 'Vela <hello@getvela.app>';
const SUBJECT = 'A quiet recap of your Vela';

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const thirtyDaysAgoIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: lapsedSubs, error } = await supabase
    .from('subscriptions')
    .select('user_id, expires_at')
    .eq('is_active', false)
    .not('user_id', 'is', null)
    .gt('expires_at', thirtyDaysAgoIso)
    .lte('expires_at', nowIso);

  if (error) {
    console.error('[send-lapsed-digest] query failed', error);
    return new Response(JSON.stringify({ error: 'db_failure' }), {
      status: 502,
      headers,
    });
  }

  const userIdSet = new Set(
    (lapsedSubs ?? [])
      .map((r) => r.user_id as string | null)
      .filter((id): id is string => typeof id === 'string'),
  );

  let sent = 0;
  let considered = 0;

  for (const userId of userIdSet) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, email_digest_optin, last_digest_sent_at')
      .eq('id', userId)
      .maybeSingle();

    if (pErr || !profile?.email || !profile.email_digest_optin) continue;

    considered += 1;

    if (
      profile.last_digest_sent_at &&
      Date.parse(profile.last_digest_sent_at) >= now - 30 * 24 * 60 * 60 * 1000
    ) {
      continue;
    }

    const { count } = await supabase
      .from('scan_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: lastScan } = await supabase
      .from('scan_results')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const message = composeBody({
      totalScans: count ?? 0,
      lastScanAt: (lastScan as { created_at?: string } | null)?.created_at ?? null,
    });
    const ok = await sendOne(profile.email, message);
    if (ok) {
      await supabase
        .from('profiles')
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq('id', userId);
      sent += 1;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, considered, sent }),
    { status: 200, headers },
  );
});

function composeBody({ totalScans, lastScanAt }: { totalScans: number; lastScanAt: string | null }) {
  const last = lastScanAt
    ? new Date(lastScanAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : null;
  const stats = `You did ${totalScans} scan${totalScans === 1 ? '' : 's'}${last ? ` (most recent ${last})` : ''}.`;
  return [
    'Hi from Vela,',
    '',
    'No upsell, just a recap.',
    stats,
    '',
    'If you ever want to see your data again, the door is open in the app.',
    'Tap "Restore" on the home screen to come back where you left off.',
    '',
    '— Vela',
  ].join('\n');
}

async function sendOne(to: string, body: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('[send-lapsed-digest] (dry-run) would send to', to);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDR,
        to: [to],
        subject: SUBJECT,
        text: body,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('[send-lapsed-digest] send failed', e);
    return false;
  }
}
