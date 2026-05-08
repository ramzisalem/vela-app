# 02 — Types, Models, and State

## Overview
All TypeScript types, Zustand stores, and WatermelonDB schemas. This file defines the data shape of the entire app. Reference constantly.

---

## Core Types

```typescript
// src/types/profile.ts

export type Gender = 'man' | 'woman' | 'non_binary' | 'prefer_not_to_say';

/**
 * Scoring framework controls weight curves and definition formulas in file 05.
 * It is **derived from gender by default** but is user-overridable for
 * `non_binary` and `prefer_not_to_say` users (see file 07, Q1b).
 *
 * Rules:
 *   man                → 'masculine'
 *   woman              → 'feminine'
 *   non_binary         → user picks any of the three (default 'neutral')
 *   prefer_not_to_say  → user picks any of the three (default 'neutral')
 *
 * Always read `profile.scoringFramework` directly. Do not re-derive from
 * `profile.gender` in feature code — the derivation lives in `frameworkForGender()`
 * below and is applied once at onboarding.
 */
export type ScoringFramework = 'masculine' | 'feminine' | 'neutral';

export function frameworkForGender(gender: Gender): ScoringFramework {
  switch (gender) {
    case 'man':   return 'masculine';
    case 'woman': return 'feminine';
    case 'non_binary':
    case 'prefer_not_to_say':
      return 'neutral'; // default — user can override in onboarding
  }
}

export type FitzpatrickSkinType = 1 | 2 | 3 | 4 | 5 | 6;

export type EthnicityOption =
  | 'east_asian'
  | 'south_asian'
  | 'southeast_asian'
  | 'black_african_descent'
  | 'middle_eastern_north_african'
  | 'hispanic_latino'
  | 'white_european'
  | 'indigenous'
  | 'mixed'
  | 'other'
  | 'prefer_not_to_say';

export type SkinCondition =
  | 'acne'
  | 'rosacea'
  | 'eczema'
  | 'psoriasis'
  | 'melasma'
  | 'hyperpigmentation'
  | 'sensitive_skin'
  | 'none';

export type HairSituation =
  | 'full_thick_man' | 'starting_thin_man' | 'noticeable_thinning'
  | 'receding_hairline' | 'mostly_bald' | 'shaved_choice'
  | 'full_thick_woman' | 'fine_but_full' | 'starting_thin_woman'
  | 'hair_loss' | 'postpartum_shedding' | 'other_hair_concern';

export type FacialHairSituation = 'full_beard' | 'patchy' | 'clean_shaven' | 'cant_grow_much';
export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond' | 'not_sure';
export type FaceRegion = 'forehead' | 't_zone' | 'left_cheek' | 'right_cheek' | 'chin' | 'nose' | 'around_eyes' | 'jawline';

export type AppearanceGoal =
  | 'skin_clarity'
  | 'aging_signs'
  | 'jawline_definition'
  | 'hair_concerns'
  | 'facial_fat'
  | 'dark_circles'
  | 'overall_confidence'
  | 'treatment_tracking';

export type IdealOutcome = 'subtly_better' | 'noticeable' | 'transformation' | 'maintain';
export type TimeAvailability = '5_min' | '10_min' | '15_min' | '30_plus_min';
export type BudgetRange = 'under_30' | '30_to_100' | '100_to_300' | 'over_300';
export type RoutineIntensity = 'none' | 'minimal' | 'basic' | 'standard' | 'extensive';
export type SPFHabit = 'daily' | 'sometimes' | 'only_beach' | 'never';
export type ExerciseFrequency = 'sedentary' | '1_2_week' | '3_4_week' | '5_plus_week';
export type DietPattern = 'pretty_good' | 'mixed' | 'dont_think' | 'restrictive';
export type WaterIntake = 'under_1l' | '1_2l' | '2_plus_l' | 'dont_track';
export type SleepHours = 'under_5' | '5_6' | '6_7' | '7_8' | '8_plus';
export type StressLevel = 'low' | 'moderate' | 'high' | 'very_high';

export type SubstanceHabit =
  | 'smoke_regularly' | 'smoke_occasionally' | 'vape'
  | 'drink_heavily' | 'drink_moderately' | 'drink_rarely'
  | 'none';

export type HormonalFactor =
  | 'hormonal_bc' | 'pregnant' | 'postpartum' | 'perimenopausal' | 'menopausal' | 'on_hrt'
  | 'on_trt' | 'on_finasteride' | 'on_minoxidil'
  | 'none';

export type CosmeticProcedure =
  | 'prescription_skincare' | 'botox' | 'filler' | 'laser_ipl'
  | 'chemical_peel' | 'microneedling' | 'hair_transplant' | 'rhinoplasty'
  | 'prefer_not_to_share' | 'none';

export interface UserLocation {
  city?: string;
  country: string;
  timezone: string;
}

export interface UserProfile {
  // Demographics
  firstName?: string;
  gender: Gender;
  /**
   * Set during onboarding via `frameworkForGender(gender)` and overridable
   * for `non_binary` / `prefer_not_to_say` users in onboarding Q1b.
   * All scoring code (file 05) and routine code (file 09) reads this field
   * directly — never re-derive from `gender`.
   */
  scoringFramework: ScoringFramework;
  age: number;
  location?: UserLocation;
  ethnicity: EthnicityOption[];
  
  // Physical
  skinType: FitzpatrickSkinType;
  skinConditions: SkinCondition[];
  hairSituation: HairSituation;
  facialHair?: FacialHairSituation;
  faceShape?: FaceShape;
  skinConcernRegions: FaceRegion[];
  
  // Goals
  primaryGoal: AppearanceGoal;
  secondaryGoals: AppearanceGoal[];
  idealOutcome: IdealOutcome;
  dailyTimeAvailable: TimeAvailability;
  monthlyBudget: BudgetRange;
  
  // Current routine
  currentRoutineIntensity: RoutineIntensity;
  spfHabit: SPFHabit;
  currentProducts: UserProduct[];
  exerciseFrequency: ExerciseFrequency;
  dietPattern: DietPattern;
  waterIntake: WaterIntake;
  
  // Lifestyle
  sleepHours: SleepHours;
  stressLevel: StressLevel;
  substanceHabits: SubstanceHabit[];
  hormonalFactors: HormonalFactor[];
  procedures: CosmeticProcedure[];
  
  // Self-perception
  selfPerceivedSkinClarity: number; // 1-5
  selfPerceivedAge?: number;
  
  // Additional
  additionalNotes?: string;
  
  // Metadata
  profileVersion: string;
  lastUpdated: string; // ISO date
}

export interface UserProduct {
  id: string;
  name: string;
  brand?: string;
  category?: ProductCategory;
  barcode?: string;
  startedUsing?: string; // ISO date
  notes?: string;
}

export type ProductCategory =
  | 'cleanser' | 'moisturizer' | 'spf' | 'serum' | 'toner' | 'eye_cream'
  | 'retinoid' | 'exfoliant' | 'mask_treatment'
  | 'shampoo' | 'conditioner' | 'hair_treatment' | 'hair_styling'
  | 'beard' | 'shaving' | 'aftershave'
  | 'supplement' | 'tool';
```

---

## Scan Types

```typescript
// src/types/scan.ts

export type CaptureAngle = 'front' | 'left_turn' | 'right_turn';
export type AlignmentQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface FaceTransformData {
  transform: number[]; // 16 floats (4x4 matrix flattened)
  distance: number;    // meters
  eulerAngles: {
    pitch: number;
    yaw: number;
    roll: number;
  };
}

export interface RawMetrics {
  asymmetryCoefficient: number;
  skinToneVariance: number;
  underEyeDarknessRatio: number;
  jawDefinitionScore: number;
  cheekVolumeDistribution: number;
  facialLandmarks: { x: number; y: number }[];
  estimatedAge: number;
  captureTimestamp: string;
}

export interface ScanScores {
  overall: number;        // 0-100
  skin: number;
  symmetry: number;
  definition: number;
  vitality: number;
  grooming: number;
  perceivedAge?: number;
  
  // Previous scores for delta calculation
  previousOverall?: number;
  previousSkin?: number;
  previousSymmetry?: number;
  previousDefinition?: number;
  previousVitality?: number;
  previousGrooming?: number;
  
  // AI-generated explanations
  skinExplanation?: string;
  symmetryExplanation?: string;
  definitionExplanation?: string;
  vitalityExplanation?: string;
  groomingExplanation?: string;
  overallSummary?: string;
}

export interface ScanContext {
  sleepQuality?: number; // 1-5
  stressLevel?: number;  // 1-5
  notes?: string;
  newProductsStarted: string[];
  newTreatmentsStarted: string[];
}

export interface ScanSession {
  id: string;
  userId: string;
  capturedAt: string;
  weekNumber: number;
  isBaseline: boolean;
  
  // Photo paths (in app file system)
  frontPhotoPath: string;
  leftPhotoPath: string;
  rightPhotoPath: string;
  
  // ARKit metadata
  frontFaceTransform: FaceTransformData;
  leftFaceTransform: FaceTransformData;
  rightFaceTransform: FaceTransformData;
  
  // Quality flags
  alignmentQuality: AlignmentQuality;
  lightingConsistency: number;
  
  // Scores (synced to Supabase)
  scores: ScanScores;
  
  // User context
  context: ScanContext;
  
  shareCardCached: boolean;
}

// Helper: compute deltas
export function getScoreDelta(scores: ScanScores, key: keyof Pick<ScanScores, 'overall' | 'skin' | 'symmetry' | 'definition' | 'vitality' | 'grooming'>): number | undefined {
  const previousKey = `previous${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof ScanScores;
  const prev = scores[previousKey];
  if (typeof prev !== 'number') return undefined;
  return scores[key] - prev;
}

// First-scan UI rule (canonical):
// When getScoreDelta returns undefined, the dashboard MUST render an explicit
// "First scan" pill instead of an empty spacer. Code reference:
//   const delta = getScoreDelta(scores, 'overall');
//   {delta === undefined ? <FirstScanPill /> : <DeltaBadge value={delta} />}
// Never render the absence as blank — users read blank deltas as bugs.
```

---

## Routine Types

```typescript
// src/types/routine.ts

export type SubScore = 'skin' | 'symmetry' | 'definition' | 'vitality' | 'grooming' | 'overall';
export type TaskCategory = 'skin_am' | 'skin_pm' | 'grooming' | 'sleep' | 'hydration' | 'posture' | 'fitness' | 'nutrition';
export type TimeOfDay = 'morning' | 'evening' | 'anytime';
export type EvidenceLevel = 'well_established' | 'moderate' | 'anecdotal';

export interface ProductRecommendation {
  name: string;
  brand: string;
  category: ProductCategory;
  priceRange: BudgetRange;
  reasonForRecommendation: string;
  affiliateURL?: string;
}

export interface RoutineTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  timeOfDay: TimeOfDay;
  durationMinutes: number;
  evidenceLevel: EvidenceLevel;
  whyItMatters: string;
  productRecommendation?: ProductRecommendation;
  targetSubScore: SubScore;
  genderSpecific?: Gender;
  isCompleted: boolean;
}

export interface DailyRoutine {
  id: string;
  userId: string;
  generatedAt: string;
  weekNumber: number;
  tasks: RoutineTask[];
  completedDates: Record<string, string[]>; // date -> [task_ids]
  currentStreak: number;
  lastCompletedDate?: string;
  personalizationNote?: string; // AI-generated explanation
}

import type { ProductCategory, BudgetRange, Gender } from './profile';
```

---

## App State Types

```typescript
// src/types/appState.ts

export type AppFlow = 'onboarding' | 'capture' | 'paywall' | 'main' | 'subscription_expired';

export interface NotificationPreference {
  checkInDay: number; // 0-6 (Sunday-Saturday)
  checkInHour: number; // 0-23
  checkInMinute: number; // 0-59
  enabled: boolean;
  missedCheckInReminders: boolean;
  milestoneNotifications: boolean;
}
```

---

## Zustand Stores

### App State Store

```typescript
// src/stores/appStateStore.ts
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { AppFlow } from '@/types/appState';
import Purchases from 'react-native-purchases';

interface AppStateStore {
  flow: AppFlow;
  user: User | null;
  isSubscribed: boolean;
  isInTrial: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedBaseline: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setFlow: (flow: AppFlow) => void;
  setLoading: (loading: boolean) => void;
  checkSubscription: () => Promise<void>;
  updateFlow: () => void;
  completeOnboarding: () => void;
  completeBaseline: () => void;
  signOut: () => Promise<void>;
}

export const useAppState = create<AppStateStore>((set, get) => ({
  flow: 'onboarding',
  user: null,
  isSubscribed: false,
  isInTrial: false,
  hasCompletedOnboarding: false,
  hasCompletedBaseline: false,
  isLoading: true,
  
  setUser: (user) => set({ user }),
  
  setFlow: (flow) => set({ flow }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  checkSubscription: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active['vela_premium'];
      set({
        isSubscribed: !!entitlement,
        isInTrial: entitlement?.periodType === 'TRIAL',
      });
    } catch (error) {
      console.error('Subscription check failed:', error);
      set({ isSubscribed: false });
    }
  },
  
  updateFlow: () => {
    const { hasCompletedOnboarding, hasCompletedBaseline, isSubscribed } = get();
    
    if (!hasCompletedOnboarding) {
      set({ flow: 'onboarding' });
    } else if (!hasCompletedBaseline) {
      set({ flow: 'capture' });
    } else if (!isSubscribed) {
      set({ flow: 'paywall' });
    } else {
      set({ flow: 'main' });
    }
  },
  
  completeOnboarding: () => {
    set({ hasCompletedOnboarding: true });
    get().updateFlow();
  },
  
  completeBaseline: () => {
    set({ hasCompletedBaseline: true });
    get().updateFlow();
  },
  
  signOut: async () => {
    const { supabase } = await import('@/services/supabase');
    await supabase.auth.signOut();
    set({
      user: null,
      flow: 'onboarding',
      isSubscribed: false,
      hasCompletedOnboarding: false,
      hasCompletedBaseline: false,
    });
  },
}));
```

### Profile Store

```typescript
// src/stores/profileStore.ts
import { create } from 'zustand';
import type { UserProfile } from '@/types/profile';
import { ProfileService } from '@/services/profileService';

interface ProfileStore {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  setProfile: (profile: UserProfile) => void;
  loadProfile: (userId: string) => Promise<void>;
  saveProfile: (profile: UserProfile, userId: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,
  
  setProfile: (profile) => set({ profile }),
  
  loadProfile: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await ProfileService.fetchProfile(userId);
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  saveProfile: async (profile, userId) => {
    set({ isLoading: true, error: null });
    try {
      await ProfileService.saveProfile(profile, userId);
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  
  updateProfile: (updates) => {
    const current = get().profile;
    if (!current) return;
    set({
      profile: {
        ...current,
        ...updates,
        lastUpdated: new Date().toISOString(),
      },
    });
  },
}));
```

### Scan Store

```typescript
// src/stores/scanStore.ts
import { create } from 'zustand';
import type { ScanSession } from '@/types/scan';
import { database } from '@/db';
import { ScanSessionModel } from '@/db/models/ScanSession';

interface ScanStore {
  sessions: ScanSession[];
  latestSession: ScanSession | null;
  isLoading: boolean;
  
  loadSessions: (userId: string) => Promise<void>;
  addSession: (session: ScanSession) => Promise<void>;
  getSessionByWeek: (weekNumber: number) => ScanSession | undefined;
  getSessionPair: (fromId: string, toId: string) => [ScanSession?, ScanSession?];
}

export const useScanStore = create<ScanStore>((set, get) => ({
  sessions: [],
  latestSession: null,
  isLoading: false,
  
  loadSessions: async (userId) => {
    set({ isLoading: true });
    
    const records = await database
      .get<ScanSessionModel>('scan_sessions')
      .query()
      .fetch();
    
    const sessions: ScanSession[] = records.map((r) => r.toJSON());
    const sorted = sessions.sort((a, b) => 
      new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    );
    
    set({
      sessions: sorted,
      latestSession: sorted[0] || null,
      isLoading: false,
    });
  },
  
  addSession: async (session) => {
    await database.write(async () => {
      await database.get<ScanSessionModel>('scan_sessions').create((record) => {
        record.fromJSON(session);
      });
    });
    
    const sessions = [session, ...get().sessions];
    set({ sessions, latestSession: session });
  },
  
  getSessionByWeek: (weekNumber) => {
    return get().sessions.find((s) => s.weekNumber === weekNumber);
  },
  
  getSessionPair: (fromId, toId) => {
    const sessions = get().sessions;
    return [
      sessions.find((s) => s.id === fromId),
      sessions.find((s) => s.id === toId),
    ];
  },
}));
```

### Routine Store

```typescript
// src/stores/routineStore.ts
import { create } from 'zustand';
import type { DailyRoutine, RoutineTask } from '@/types/routine';
import { database } from '@/db';
import { format } from 'date-fns';

interface RoutineStore {
  currentRoutine: DailyRoutine | null;
  
  setRoutine: (routine: DailyRoutine) => void;
  toggleTask: (taskId: string) => Promise<void>;
  getCompletedToday: () => string[];
  getStreakInfo: () => { current: number; lastCompleted?: string };
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  currentRoutine: null,
  
  setRoutine: (routine) => set({ currentRoutine: routine }),
  
  toggleTask: async (taskId) => {
    const routine = get().currentRoutine;
    if (!routine) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const completedToday = routine.completedDates[today] || [];
    
    let newCompleted: string[];
    if (completedToday.includes(taskId)) {
      newCompleted = completedToday.filter((id) => id !== taskId);
    } else {
      newCompleted = [...completedToday, taskId];
    }
    
    const updated: DailyRoutine = {
      ...routine,
      completedDates: {
        ...routine.completedDates,
        [today]: newCompleted,
      },
    };
    
    // Update streak if all tasks completed today
    if (newCompleted.length === routine.tasks.length) {
      updated.currentStreak += 1;
      updated.lastCompletedDate = today;
    }
    
    set({ currentRoutine: updated });
    
    // Persist to DB
    // ... WatermelonDB write
  },
  
  getCompletedToday: () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return get().currentRoutine?.completedDates[today] || [];
  },
  
  getStreakInfo: () => {
    const routine = get().currentRoutine;
    return {
      current: routine?.currentStreak || 0,
      lastCompleted: routine?.lastCompletedDate,
    };
  },
}));
```

---

## WatermelonDB Schema

> **Migration policy.** Any change to a column (add / rename / type change) requires:
>
> 1. Bumping `version` below by exactly one.
> 2. Adding a corresponding entry in `migrations` (next code block) using `addColumns`, `createTable`, etc. WatermelonDB does not support `removeColumn` or `renameColumn` — for those, add the new column, dual-write for one release, then mark the old column as deprecated in code (the data stays).
> 3. Releasing migration changes in their own commit, separate from product features, so you can revert cleanly.
>
> **Never edit a past migration after release** — that's a data-loss bug. Add a new migration instead.

```typescript
// src/db/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1, // ⚠️ bump on every column / table change. See migrations below.
  tables: [
    tableSchema({
      name: 'scan_sessions',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'captured_at', type: 'number', isIndexed: true },
        { name: 'week_number', type: 'number', isIndexed: true },
        { name: 'is_baseline', type: 'boolean' },
        { name: 'front_photo_path', type: 'string' },
        { name: 'left_photo_path', type: 'string' },
        { name: 'right_photo_path', type: 'string' },
        { name: 'front_transform_json', type: 'string' },
        { name: 'left_transform_json', type: 'string' },
        { name: 'right_transform_json', type: 'string' },
        { name: 'alignment_quality', type: 'string' },
        { name: 'lighting_consistency', type: 'number' },
        { name: 'scores_json', type: 'string' },
        { name: 'context_json', type: 'string' },
        { name: 'share_card_cached', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'daily_routines',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'generated_at', type: 'number' },
        { name: 'week_number', type: 'number', isIndexed: true },
        { name: 'tasks_json', type: 'string' },
        { name: 'completion_json', type: 'string' },
        { name: 'current_streak', type: 'number' },
        { name: 'last_completed_date', type: 'string', isOptional: true },
        { name: 'personalization_note', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'user_products',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'brand', type: 'string', isOptional: true },
        { name: 'category', type: 'string', isOptional: true },
        { name: 'barcode', type: 'string', isOptional: true, isIndexed: true },
        { name: 'started_using', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
```

```typescript
// src/db/migrations.ts
import { schemaMigrations, addColumns, createTable }
  from '@nozbe/watermelondb/Schema/migrations';

/**
 * Append a new entry every time `schema.version` is bumped.
 * Migrations run in order from the user's installed version → current.
 *
 * Example for a future v2:
 *   { toVersion: 2, steps: [
 *       addColumns({ table: 'user_products',
 *                    columns: [{ name: 'is_archived', type: 'boolean' }] }),
 *     ]
 *   }
 */
export const migrations = schemaMigrations({
  migrations: [
    // v1 is the initial schema — no migration entries needed.
  ],
});
```

```typescript
// src/db/index.ts (initialization — referenced from file 01)
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';

const adapter = new SQLiteAdapter({
  schema,
  migrations,                // ← required for safe column changes
  jsi: true,
  onSetUpError: (error) => {
    // Sentry capture happens in initializeServices (file 03).
    console.error('[DB] setup error', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [ /* ScanSessionModel, DailyRoutineModel, UserProductModel */ ],
});
```

## WatermelonDB Models

```typescript
// src/db/models/ScanSession.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, json, readonly } from '@nozbe/watermelondb/decorators';
import type { ScanSession, FaceTransformData, ScanScores, ScanContext, AlignmentQuality } from '@/types/scan';

export class ScanSessionModel extends Model {
  static table = 'scan_sessions';
  
  @field('user_id') userId!: string;
  @date('captured_at') capturedAt!: Date;
  @field('week_number') weekNumber!: number;
  @field('is_baseline') isBaseline!: boolean;
  @field('front_photo_path') frontPhotoPath!: string;
  @field('left_photo_path') leftPhotoPath!: string;
  @field('right_photo_path') rightPhotoPath!: string;
  @json('front_transform_json', sanitizeJson) frontFaceTransform!: FaceTransformData;
  @json('left_transform_json', sanitizeJson) leftFaceTransform!: FaceTransformData;
  @json('right_transform_json', sanitizeJson) rightFaceTransform!: FaceTransformData;
  @field('alignment_quality') alignmentQuality!: AlignmentQuality;
  @field('lighting_consistency') lightingConsistency!: number;
  @json('scores_json', sanitizeJson) scores!: ScanScores;
  @json('context_json', sanitizeJson) context!: ScanContext;
  @field('share_card_cached') shareCardCached!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  
  toJSON(): ScanSession {
    return {
      id: this.id,
      userId: this.userId,
      capturedAt: this.capturedAt.toISOString(),
      weekNumber: this.weekNumber,
      isBaseline: this.isBaseline,
      frontPhotoPath: this.frontPhotoPath,
      leftPhotoPath: this.leftPhotoPath,
      rightPhotoPath: this.rightPhotoPath,
      frontFaceTransform: this.frontFaceTransform,
      leftFaceTransform: this.leftFaceTransform,
      rightFaceTransform: this.rightFaceTransform,
      alignmentQuality: this.alignmentQuality,
      lightingConsistency: this.lightingConsistency,
      scores: this.scores,
      context: this.context,
      shareCardCached: this.shareCardCached,
    };
  }
  
  fromJSON(session: ScanSession) {
    this.userId = session.userId;
    this.capturedAt = new Date(session.capturedAt);
    this.weekNumber = session.weekNumber;
    this.isBaseline = session.isBaseline;
    this.frontPhotoPath = session.frontPhotoPath;
    this.leftPhotoPath = session.leftPhotoPath;
    this.rightPhotoPath = session.rightPhotoPath;
    this.frontFaceTransform = session.frontFaceTransform;
    this.leftFaceTransform = session.leftFaceTransform;
    this.rightFaceTransform = session.rightFaceTransform;
    this.alignmentQuality = session.alignmentQuality;
    this.lightingConsistency = session.lightingConsistency;
    this.scores = session.scores;
    this.context = session.context;
    this.shareCardCached = session.shareCardCached;
  }
}

function sanitizeJson(value: any): any {
  return value ?? {};
}
```

## Database Initialization

```typescript
// src/db/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { ScanSessionModel } from './models/ScanSession';
import { DailyRoutineModel } from './models/DailyRoutine';
import { UserProductModel } from './models/UserProduct';

let database: Database;

export async function initializeDatabase() {
  const adapter = new SQLiteAdapter({
    schema,
    jsi: true, // Enable JSI for performance
  });
  
  database = new Database({
    adapter,
    modelClasses: [ScanSessionModel, DailyRoutineModel, UserProductModel],
  });
}

export { database };
```

---

## Validation Schemas (Zod)

```typescript
// src/utils/validation.ts
import { z } from 'zod';

export const userProfileSchema = z.object({
  firstName: z.string().optional(),
  gender: z.enum(['man', 'woman', 'non_binary', 'prefer_not_to_say']),
  age: z.number().int().min(13).max(120),
  ethnicity: z.array(z.string()),
  skinType: z.number().int().min(1).max(6),
  primaryGoal: z.string(),
  // ... rest of profile validation
});

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>;
```

---

## Types defined in adjacent files (referenced here)

The following type families are canonically defined in their feature files but are part of the typed surface area:

- `Capture3D`, `CanonicalPose` — `32_3D_CAPTURE.md`
- `HealthSnapshot`, `Correlation`, `CyclePhase` — `33_HEALTHKIT.md`
- `TreatmentDefinition`, `UserTreatment`, `TreatmentId`, `TreatmentCategory`, `ProgressionMarker`, `SideEffect`, `TreatmentCopy`, `FaceMetric` — `34_TREATMENT_TRACKING.md`
- `HairScanSession`, `HairScanRegionResult`, `HairScanRegion`, `HairScanQuality` — `35_HAIR_TRACKING.md`
- `AgingBand`, `UserBandPreferences`, `AgingContext` — `36_AGING_ACCEPTANCE.md`
- `DiaryEntry`, `DiaryUserTag`, `DiaryInferredTag`, `DiaryWeeklySummary` — `37_DIARY.md`
- `MonthlyWrapped`, `WrappedCard` — `38_MONTHLY_WRAPPED.md`
- `StreakState`, `StreakDayRecord`, `StreakSurfacePreferences` — `39_DAILY_STREAKS.md`
- `ScanAnchor`, `FeatureReveal`, `FeatureRevealId`, `EligibilityContext` — `42_IOS_SURFACES.md`, `43_FEATURE_REVEALS.md`
- `Experiment`, `ExperimentHypothesis`, `ExperimentVerdict`, `Confounder` — `44_EXPERIMENT_MODE.md`
- `CancelSaveContext`, `CancelSaveOffer`, `CancelSaveOfferKind` — `47_CANCEL_SAVE.md`
- `LifeStageMode`, `LifeStageModeId`, `LifeStageMetadata` — `48_LIFE_STAGE_MODES.md`
- `PracticeEnrollment`, `ConsentScope` — `49_PRACTICE_TIER.md`
- `RoutineTaskEvidence`, `EvidenceReference`, `JournalEssay`, `JournalSubscription` — `50_EVIDENCE_VOICE.md`

When implementing, move each of these type blocks into a sibling file in `src/types/` rather than re-declaring inline. The canonical-source matrix in `00_INDEX.md` is the source of truth for which file owns each type.
