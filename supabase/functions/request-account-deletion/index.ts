/**
 * request-account-deletion (file 14 + file 03 + file 30).
 *
 * Two-step deletion: this endpoint emails the user a deep link
 * `vela://delete-account/confirm?token=...`. The link triggers
 * confirm-account-deletion which actually deletes.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { getAuthedUser } from '../_shared/auth.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    const pf = preflight(origin);
    if (pf) return pf;
  }
  const headers = corsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  const { user } = await getAuthedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(url, serviceKey);

  const token = crypto.randomUUID();
  const { error } = await admin
    .from('account_deletion_requests')
    .insert({ user_id: user.id, token, requested_at: new Date().toISOString() });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }

  // Send email — Postmark / Supabase mailer. For now, log to stdout.
  console.log(`[delete-account] token for ${user.id}: vela://delete-account/confirm?token=${token}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...headers, 'content-type': 'application/json' },
  });
});
