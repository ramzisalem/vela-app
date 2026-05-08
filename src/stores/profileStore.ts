/**
 * Profile store (file 02 + file 08).
 *
 * CANONICAL race fix (file 08 SPEC_REVIEW_3): During onboarding the profile
 * lives ONLY in this Zustand store. It syncs to Supabase via
 * `completePostPaywallSignup` AFTER auth + profile insert succeed.
 * `saveScanResult` must NOT be reachable until that's done.
 */
import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { fetchProfile, upsertProfile } from '@/services/supabase/profileService';

interface ProfileStore {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  clear: () => void;

  /** Loaded by ProfileService once authenticated. */
  loadProfile: (userId: string) => Promise<void>;
  /** Persists to Supabase. Only allowed post-signup. */
  saveProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),

  updateProfile: (patch) => {
    const current = get().profile;
    if (!current) {
      set({ profile: { ...patch } as UserProfile });
      return;
    }
    set({ profile: { ...current, ...patch, updatedAt: new Date().toISOString() } });
  },

  clear: () => set({ profile: null, error: null }),

  loadProfile: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const row = await fetchProfile(userId);
      if (row) {
        set({ profile: rowToProfile(row), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  saveProfile: async () => {
    const profile = get().profile;
    if (!profile?.id) return;
    set({ isLoading: true, error: null });
    try {
      await upsertProfile(profile);
      set({ isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },
}));

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row['id']),
    email: (row['email'] as string | null) ?? undefined,
    gender: row['gender'] as UserProfile['gender'],
    scoringFramework: row['scoring_framework'] as UserProfile['scoringFramework'],
    age: (row['age'] as number | null) ?? undefined,
    skinConditions: (row['skin_conditions'] as UserProfile['skinConditions']) ?? undefined,
    hairSituation: (row['hair_situation'] as UserProfile['hairSituation']) ?? undefined,
    facialHair: (row['facial_hair'] as UserProfile['facialHair']) ?? undefined,
    primaryGoal: (row['primary_goal'] as UserProfile['primaryGoal']) ?? undefined,
    appearanceGoals: (row['appearance_goals'] as UserProfile['appearanceGoals']) ?? undefined,
    routineIntensity: (row['routine_intensity'] as UserProfile['routineIntensity']) ?? undefined,
    timeAvailable: (row['time_available'] as UserProfile['timeAvailable']) ?? undefined,
    budget: (row['budget'] as UserProfile['budget']) ?? undefined,
    spfHabit: (row['spf_habit'] as UserProfile['spfHabit']) ?? undefined,
    notificationsEnabled: (row['notifications_enabled'] as boolean) ?? false,
    checkinDay: (row['checkin_day'] as number | null) ?? undefined,
    checkinHour: (row['checkin_hour'] as number | null) ?? undefined,
    checkinMinute: (row['checkin_minute'] as number | null) ?? undefined,
    sexAtBirthForBands:
      (row['sex_at_birth_for_bands'] as UserProfile['sexAtBirthForBands']) ?? undefined,
    hideAgingBand: (row['hide_aging_band'] as boolean) ?? false,
    profileVersion: (row['profile_version'] as number) ?? 1,
    createdAt: (row['created_at'] as string) ?? new Date().toISOString(),
    updatedAt: (row['updated_at'] as string) ?? new Date().toISOString(),
  } as UserProfile;
}
