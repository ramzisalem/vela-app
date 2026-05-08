/**
 * Supabase client (file 03).
 *
 * Uses SecureStorageAdapter for auth tokens — NEVER AsyncStorage.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { SecureStorageAdapter } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  console.warn('Supabase env vars missing — set EXPO_PUBLIC_SUPABASE_URL + ANON_KEY');
}

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'placeholder', {
  auth: {
    storage: SecureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Native — OAuth completion uses WebBrowser + exchangeCodeForSession
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'vela-mobile',
    },
  },
});

// Auto-refresh tokens when app returns to foreground.
let started = false;
export function startSupabaseSessionRefresh() {
  if (started) return;
  started = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
