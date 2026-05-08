// supabase/functions/journal-subscribe/index.ts
//
// Journal subscriber capture (file 50, Part B).
//
// Anonymous-allowed. Email + source. Stores into `journal_subscribers`
// with the service role (RLS forbids direct inserts from clients).
// Idempotent: re-subscribing updates `last_seen_at` and clears
// `unsubscribed_at`.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';

interface Payload {
  email: string;
  source: 'in-app' | 'web' | 'cancel-flow' | 'external';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers,
    });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), {
      status: 400,
      headers,
    });
  }

  const allowedSources: Payload['source'][] = ['in-app', 'web', 'cancel-flow', 'external'];
  const source: Payload['source'] = allowedSources.includes(body.source) ? body.source : 'external';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('journal_subscribers')
    .upsert(
      {
        email,
        source,
        subscribed_at: now,
        last_seen_at: now,
        unsubscribed_at: null,
      },
      { onConflict: 'email' },
    );

  if (error) {
    console.error('[journal-subscribe] upsert failed', error);
    return new Response(JSON.stringify({ error: 'db_failure' }), {
      status: 502,
      headers,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});
