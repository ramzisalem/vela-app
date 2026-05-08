/**
 * Deep links (file 30 + file 47 + file 45).
 *
 * Schemes:
 *   vela://delete-account/confirm?token=<uuid>
 *   vela://reset-password
 *   vela://scan
 *   vela://compare?weeks=12,18
 *   vela://winback/scan                 (file 47, lapsed-grace digest)
 *   vela://wrapped/<month>              (file 45, monthly digest CTA)
 *   vela://journal/<slug>               (file 50, monthly essay link)
 *   vela://experiment/<id>              (file 44)
 *   vela://treatment/<id>               (file 34)
 *
 * Two paths in: cold start (`Linking.getInitialURL`) and runtime
 * (`Linking.addEventListener`). Both feed the same router.
 */
import { Linking } from 'react-native';
import type { Router } from 'expo-router';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/feedback/toastService';

let router: Router | null = null;
let deepLinkListenerStarted = false;

export function setDeepLinkRouter(r: Router) {
  router = r;
}

export function startDeepLinkListener() {
  if (deepLinkListenerStarted) return;
  deepLinkListenerStarted = true;
  Linking.addEventListener('url', ({ url }) => handle(url));
  Linking.getInitialURL().then((url) => {
    if (url) handle(url);
  });
}

function handle(url: string) {
  const parsed = parseUrl(url);
  if (!parsed) return;
  const segments = parsed.path.split('/').filter(Boolean);
  const head = segments[0];
  switch (head) {
    case 'delete-account':
      if (segments[1] === 'confirm') handleAccountDeletion(parsed.query['token']);
      break;
    case 'scan':
      router?.push('/(capture)/capture');
      break;
    case 'compare':
      router?.push('/(main)/compare');
      break;
    case 'reset-password':
      toast.info('Open the email to reset your password.');
      break;
    case 'winback':
      if (segments[1] === 'scan') {
        router?.push('/(capture)/capture');
      }
      break;
    case 'wrapped':
      if (segments[1]) {
        router?.push({ pathname: '/wrapped', params: { month: segments[1] } });
      } else {
        router?.push('/wrapped');
      }
      break;
    case 'journal':
      if (segments[1]) {
        router?.push({ pathname: '/journal/[slug]', params: { slug: segments[1] } });
      } else {
        router?.push('/journal');
      }
      break;
    case 'experiment':
      if (segments[1]) {
        router?.push({ pathname: '/experiment/[id]', params: { id: segments[1] } });
      } else {
        router?.push('/experiment');
      }
      break;
    case 'treatment':
      if (segments[1]) {
        router?.push({ pathname: '/treatment/[id]', params: { id: segments[1] } });
      } else {
        router?.push('/treatment');
      }
      break;
    case 'diary':
      router?.push('/diary');
      break;
    case 'health':
      router?.push('/health');
      break;
    case 'hair':
      router?.push('/hair');
      break;
    default:
      break;
  }
}

async function handleAccountDeletion(token?: string) {
  if (!token) return;
  await supabase.functions
    .invoke('confirm-account-deletion', { body: { token } })
    .catch(() => undefined);
  toast.success('Your account has been removed.');
  router?.replace('/');
}

interface ParsedUrl {
  path: string;
  query: Record<string, string>;
}

function parseUrl(url: string): ParsedUrl | null {
  try {
    const u = new URL(url);
    // Custom schemes put the first path segment in `hostname` (e.g.
    // vela://delete-account/confirm → host delete-account, pathname /confirm).
    const host = u.hostname || u.host;
    const pathPart = (u.pathname || '').replace(/^\//, '');
    const path = [host, pathPart].filter(Boolean).join('/');
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    return { path, query };
  } catch {
    return null;
  }
}
