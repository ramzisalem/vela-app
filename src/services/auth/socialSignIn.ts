/**
 * Apple (native) + Google (Supabase OAuth / PKCE) for the same sign-up / sign-in UX.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SocialSignInResult =
  | { ok: true; user: User; email?: string }
  | { ok: false; cancelled?: true; error?: string };

function extractOAuthCode(callbackUrl: string): string | null {
  const fromQuery = callbackUrl.match(/[?&]code=([^&#]+)/);
  if (fromQuery?.[1]) {
    try {
      return decodeURIComponent(fromQuery[1]);
    } catch {
      return fromQuery[1];
    }
  }
  return null;
}

export async function signInWithAppleNative(): Promise<SocialSignInResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple Sign-In is only available on iOS.' };
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, error: 'Apple Sign-In is not available on this device.' };
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    if (!credential.identityToken) {
      return { ok: false, error: 'Apple did not return a token.' };
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? 'Sign-in failed.' };
    }
    const email = data.user.email ?? credential.email ?? undefined;
    return { ok: true, user: data.user, email };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, cancelled: true };
    }
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Opens the system browser for Google consent, then exchanges the PKCE code via Supabase.
 * Configure Google under Supabase Auth → Providers, and add this `redirectTo` URL to Redirect URLs.
 */
export async function signInWithGoogleOAuth(): Promise<SocialSignInResult> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (oauthErr || !data?.url) {
    return { ok: false, error: oauthErr?.message ?? 'Could not start Google sign-in.' };
  }
  const browser = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (browser.type === 'cancel' || browser.type === 'dismiss') {
    return { ok: false, cancelled: true };
  }
  if (browser.type !== 'success' || !('url' in browser) || !browser.url) {
    return { ok: false, error: 'Google sign-in did not complete.' };
  }
  const code = extractOAuthCode(browser.url);
  if (!code) {
    return {
      ok: false,
      error:
        'Missing authorization code. In Supabase → Auth → URL Configuration, add this redirect URL to the allow list.',
    };
  }
  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !sessionData.user) {
    return { ok: false, error: exchangeError?.message ?? 'Could not finish sign-in.' };
  }
  return { ok: true, user: sessionData.user, email: sessionData.user.email ?? undefined };
}
