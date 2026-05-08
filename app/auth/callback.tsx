/**
 * OAuth redirect target (`vela://auth/callback?...`) — primary completion runs
 * inside `WebBrowser.openAuthSessionAsync`; this screen is a safe fallback if
 * the OS opens the app via the callback URL.
 */
import { Redirect } from 'expo-router';

export default function AuthCallback() {
  return <Redirect href="/" />;
}
