/**
 * Persist deferred onboarding answers to the server after account creation (file 07 + 08).
 */
import type { UserProfile } from '@/types';
import { Analytics } from '@/services/analytics';
import { toast } from '@/components/feedback/toastService';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfileStore } from '@/stores/profileStore';

/** Merge composed fields without wiping existing keys when composed has `undefined`. */
function mergeProfileDefined(base: UserProfile, composed: UserProfile): UserProfile {
  const next = { ...base };
  (Object.entries(composed) as [keyof UserProfile, UserProfile[keyof UserProfile]][]).forEach(
    ([key, val]) => {
      if (val !== undefined) {
        (next as Record<string, unknown>)[key as string] = val;
      }
    },
  );
  next.updatedAt = new Date().toISOString();
  return next;
}

export async function flushDeferredProfileToServer(): Promise<boolean> {
  const profile = useProfileStore.getState().profile;
  if (!profile?.id) {
    toast.error('No profile to update.');
    return false;
  }
  try {
    const composed = useOnboardingStore.getState().composeProfile(profile.id, profile.email, {
      preserveTimestampsFrom: profile,
    });
    const next = mergeProfileDefined(profile, composed);
    useProfileStore.getState().updateProfile(next);
    await useProfileStore.getState().saveProfile();
    useOnboardingStore.getState().setQuestionPhase('complete');
    Analytics.track('onboarding_deferred_profile_saved');
    return true;
  } catch (e) {
    toast.error('Could not save profile. Try again from settings.');
    return false;
  }
}
