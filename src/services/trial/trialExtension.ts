/**
 * Trial-extension client service (file 41).
 *
 * Calls the `extend-trial` Edge Function. Eligibility is server-side; the
 * client just calls and reacts to the response. Reversible window of 24h
 * is tracked in the user's profile.
 */
import { supabase } from '@/services/supabase';

export type ExtendTrialOutcome =
  | { ok: true; endsAt: string }
  | { ok: false; error: 'already-extended' | 'not-eligible' | 'not-in-trial' | 'unavailable' };

export async function extendTrial(): Promise<ExtendTrialOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      ends_at?: string;
      error?: string;
    }>('extend-trial', { method: 'POST' });
    if (error) {
      console.info('[extend-trial] error', error);
      return { ok: false, error: 'unavailable' };
    }
    if (data?.ok && data.ends_at) {
      return { ok: true, endsAt: data.ends_at };
    }
    if (data?.error === 'already-extended') return { ok: false, error: 'already-extended' };
    if (data?.error === 'not-in-trial') return { ok: false, error: 'not-in-trial' };
    if (data?.error === 'not-eligible') return { ok: false, error: 'not-eligible' };
    return { ok: false, error: 'unavailable' };
  } catch (e) {
    console.info('[extend-trial] threw', e);
    return { ok: false, error: 'unavailable' };
  }
}
