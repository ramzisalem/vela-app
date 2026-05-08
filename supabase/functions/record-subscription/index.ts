/**
 * record-subscription — RevenueCat → Supabase mirror (file 03).
 *
 * Configure RevenueCat project webhooks to POST here with the same
 * Authorization header value you set in the dashboard (Bearer …).
 *
 * Env (set in Supabase Edge secrets):
 *   REVENUECAT_WEBHOOK_SECRET — must match RC webhook "Authorization" value
 *   VELA_ENTITLEMENT_ID       — optional; defaults to vela_premium (see init.ts)
 *
 * Upserts `public.subscriptions` on `rc_app_user_id` = event.app_user_id.
 * `user_id` is set when `app_user_id` is a UUID (post–Purchases.logIn identity).
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, preflight } from '../_shared/cors.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
  const authz = req.headers.get('authorization') ?? '';
  if (!secret || authz !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers });
  }

  const event = (body['event'] ?? body) as Record<string, unknown> | null;
  if (!event || typeof event !== 'object') {
    return new Response(JSON.stringify({ error: 'missing_event' }), { status: 400, headers });
  }

  const type = String(event['type'] ?? '');
  if (type === 'TEST') {
    return new Response(JSON.stringify({ ok: true, skipped: 'test' }), { status: 200, headers });
  }

  if (type === 'TRANSFER' || type === 'SUBSCRIBER_ALIAS') {
    return new Response(JSON.stringify({ ok: true, skipped: type }), { status: 200, headers });
  }

  const appUserId = event['app_user_id'];
  if (typeof appUserId !== 'string' || !appUserId.length) {
    return new Response(JSON.stringify({ error: 'missing_app_user_id' }), { status: 400, headers });
  }

  const entitlementId = Deno.env.get('VELA_ENTITLEMENT_ID') ?? 'vela_premium';
  const entitlementIds = event['entitlement_ids'];
  const hasEntitlement =
    Array.isArray(entitlementIds) &&
    entitlementIds.some((id) => typeof id === 'string' && id === entitlementId);

  const expMs = event['expiration_at_ms'];
  const exp =
    typeof expMs === 'number' && Number.isFinite(expMs) ? new Date(expMs) : typeof expMs === 'string'
      ? new Date(Number(expMs))
      : null;
  const expValid = exp && !Number.isNaN(exp.getTime());
  const now = Date.now();

  const periodType = String(event['period_type'] ?? '');
  const isTrialing = periodType === 'TRIAL';

  let isActive = false;
  if (type === 'EXPIRATION') {
    isActive = false;
  } else if (expValid && exp!.getTime() > now) {
    isActive = hasEntitlement;
  } else if (expValid && exp!.getTime() <= now) {
    isActive = false;
  } else {
    isActive = hasEntitlement;
  }

  let willRenew = isActive;
  if (type === 'CANCELLATION' || type === 'EXPIRATION') {
    willRenew = false;
  }
  if (type === 'UNCANCELLATION') {
    willRenew = true;
  }

  const productId = typeof event['product_id'] === 'string' ? event['product_id'] : null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const userId = UUID_RE.test(appUserId) ? appUserId : null;

  const { error } = await supabase.from('subscriptions').upsert(
    {
      rc_app_user_id: appUserId,
      user_id: userId,
      product_id: productId,
      is_active: isActive,
      is_trialing: isTrialing,
      will_renew: willRenew,
      expires_at: expValid ? exp!.toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'rc_app_user_id' },
  );

  if (error) {
    console.error('[record-subscription] upsert failed', error);
    return new Response(JSON.stringify({ error: 'persist_failed', detail: error.message }), {
      status: 500,
      headers,
    });
  }

  if (userId) {
    const trialConversion = type === 'RENEWAL' && event['is_trial_conversion'] === true;
    const paidActive =
      isActive &&
      hasEntitlement &&
      !isTrialing &&
      (periodType === 'NORMAL' || periodType === 'INTRO' || periodType === 'PREPAID');
    const profilePatch: { is_in_trial: boolean; has_ever_paid?: boolean } = {
      is_in_trial: isActive && isTrialing,
    };
    if (paidActive || trialConversion) {
      profilePatch.has_ever_paid = true;
    }
    const { error: profileErr } = await supabase.from('profiles').update(profilePatch).eq('id', userId);
    if (profileErr) {
      console.warn('[record-subscription] profile flags update failed', profileErr);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});
