/**
 * Auth helper for Edge Functions. Validates the bearer token via Supabase.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export async function getAuthedUser(req: Request) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.replace(/^bearer\s+/i, '');
  if (!token) {
    return { user: null, error: 'missing token' };
  }
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'invalid token' };
  }
  return { user: data.user, supabase, error: null as string | null };
}
