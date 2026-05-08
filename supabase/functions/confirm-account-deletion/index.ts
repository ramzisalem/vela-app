/**
 * confirm-account-deletion (file 14 + file 03).
 *
 * Validates the token, deletes the auth user (cascading to all RLS-owned
 * rows), and writes an audit row.
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

serve(async (req) => {
  let token = '';
  // Accept both GET (browser-initiated link) and POST (in-app proxied call).
  try {
    const url = new URL(req.url);
    token = url.searchParams.get('token') ?? '';
    if (!token && req.method === 'POST') {
      const body = (await req.clone().json()) as { token?: string };
      token = body.token ?? '';
    }
  } catch {
    // ignore
  }
  if (!token) {
    return new Response('Missing token', { status: 400 });
  }
  const sbUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(sbUrl, serviceKey);

  const { data, error } = await admin
    .from('account_deletion_requests')
    .select('user_id, requested_at, confirmed_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data || data.confirmed_at) {
    return new Response('Invalid or used token', { status: 400 });
  }

  const requestedMs = new Date(data.requested_at).getTime();
  if (Date.now() - requestedMs > 24 * 60 * 60 * 1000) {
    return new Response('Token expired', { status: 400 });
  }

  await admin.auth.admin.deleteUser(data.user_id);
  await admin
    .from('account_deletion_requests')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('token', token);
  await admin
    .from('account_deletion_audit')
    .insert({ user_id: data.user_id, deleted_at: new Date().toISOString() });

  return new Response('Account deleted. You can close this tab.', { status: 200 });
});
