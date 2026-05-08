/**
 * ProfileService (file 03).
 *
 * `saveScanResult` MUST preflight `retryUntilExists` before insert — file 03
 * canonical rule. Three attempts at 300ms / 900ms / 2700ms backoff. On
 * failure, throws ProfileMissingError so callers can queue locally.
 */
import { supabase } from './index';
import type { UserProfile, ScanSession } from '@/types';

export class ProfileMissingError extends Error {
  constructor(public userId: string) {
    super(`Profile missing for user ${userId}`);
    this.name = 'ProfileMissingError';
  }
}

const RETRY_DELAYS_MS = [300, 900, 2700];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function profileExists(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('id', userId);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function retryUntilExists(userId: string): Promise<void> {
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    if (await profileExists(userId)) return;
    const delay = RETRY_DELAYS_MS[i] ?? 300;
    await sleep(delay);
  }
  if (!(await profileExists(userId))) {
    throw new ProfileMissingError(userId);
  }
}

export interface ProfileRow {
  id: string;
  email: string | null;
  gender: UserProfile['gender'];
  scoring_framework: UserProfile['scoringFramework'];
  age: number | null;
  notifications_enabled: boolean;
  checkin_day: number | null;
  checkin_hour: number | null;
  checkin_minute: number | null;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(profile: UserProfile) {
  const row = {
    id: profile.id,
    email: profile.email ?? null,
    gender: profile.gender,
    scoring_framework: profile.scoringFramework,
    age: profile.age ?? null,
    skin_conditions: profile.skinConditions ?? null,
    hair_situation: profile.hairSituation ?? null,
    facial_hair: profile.facialHair ?? null,
    primary_goal: profile.primaryGoal ?? null,
    appearance_goals: profile.appearanceGoals ?? null,
    routine_intensity: profile.routineIntensity ?? null,
    time_available: profile.timeAvailable ?? null,
    budget: profile.budget ?? null,
    spf_habit: profile.spfHabit ?? null,
    notifications_enabled: profile.notificationsEnabled ?? false,
    checkin_day: profile.checkinDay ?? null,
    checkin_hour: profile.checkinHour ?? null,
    checkin_minute: profile.checkinMinute ?? null,
    sex_at_birth_for_bands: profile.sexAtBirthForBands ?? null,
    hide_aging_band: profile.hideAgingBand ?? false,
    profile_version: profile.profileVersion,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function saveScanResult(scan: ScanSession): Promise<void> {
  await retryUntilExists(scan.userId);
  const row = {
    id: scan.id,
    user_id: scan.userId,
    created_at: scan.createdAt,
    week_number: scan.weekNumber,
    is_baseline: scan.isBaseline,
    score_overall: scan.scores.overall,
    score_skin: scan.scores.skin,
    score_symmetry: scan.scores.symmetry,
    score_grooming: scan.scores.grooming,
    score_lighting: scan.scores.lighting,
    score_contour: scan.scores.contour,
    perceived_age: scan.scores.perceivedAge ?? null,
    symmetry_score: scan.rawMetrics.symmetryScore,
    jaw_line_sharpness: scan.rawMetrics.jawLineSharpness,
    face_width_height_ratio: scan.rawMetrics.faceWidthHeightRatio,
    under_eye_area_ratio: scan.rawMetrics.underEyeAreaRatio,
    redness: scan.rawMetrics.redness,
    blemish_count: scan.rawMetrics.blemishCount ?? null,
    pore_visibility: scan.rawMetrics.poreVisibility ?? null,
    sleep_hours_last_night: scan.context.sleepHoursLastNight ?? null,
    stress_note: scan.context.stressNote ?? null,
    new_products: scan.context.newProducts ?? [],
    new_treatments: scan.context.newTreatments ?? [],
    lighting_band: scan.context.lightingBand ?? null,
    capture_3d: scan.capture3D ?? null,
    canonical_pose: scan.canonicalPose ?? null,
    pose_error_rad: scan.capture3D?.poseErrorRad ?? null,
    score_explanation: scan.scoreExplanation ?? null,
    qualitative_pending: scan.qualitativePending ?? false,
  };
  const { error } = await supabase.from('scan_results').insert(row);
  if (error) throw error;
}
