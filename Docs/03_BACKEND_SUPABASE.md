# 03 — Backend & Supabase

## Overview
Same backend architecture as the native iOS spec, with React Native client. Photos stay on device. Numerical data and profile sync to Supabase. AI calls proxied through Edge Function.

---

## Supabase Project Setup

1. Create project at supabase.com
2. Enable **Apple** provider in Authentication → Providers
3. Enable **Email** provider as fallback  
4. Run the schema SQL (next section)
5. Deploy the AI proxy Edge Function

---

## Database Schema

Run in Supabase SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
-- Cross-app schema shared with future Vela Scan
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    profile_version TEXT DEFAULT '1.0',
    
    -- Demographics
    first_name TEXT,
    gender TEXT,
    age INTEGER CHECK (age >= 13 AND age <= 120),
    country TEXT,
    city TEXT,
    timezone TEXT,
    ethnicity JSONB DEFAULT '[]'::JSONB,
    
    -- Physical
    skin_type INTEGER CHECK (skin_type >= 1 AND skin_type <= 6),
    skin_conditions JSONB DEFAULT '[]'::JSONB,
    hair_situation TEXT,
    facial_hair TEXT,
    face_shape TEXT,
    skin_concern_regions JSONB DEFAULT '[]'::JSONB,
    
    -- Goals
    primary_goal TEXT,
    secondary_goals JSONB DEFAULT '[]'::JSONB,
    ideal_outcome TEXT,
    daily_time_available TEXT,
    monthly_budget TEXT,
    
    -- Routine
    current_routine_intensity TEXT,
    spf_habit TEXT,
    exercise_frequency TEXT,
    diet_pattern TEXT,
    water_intake TEXT,
    
    -- Lifestyle
    sleep_hours TEXT,
    stress_level TEXT,
    substance_habits JSONB DEFAULT '[]'::JSONB,
    hormonal_factors JSONB DEFAULT '[]'::JSONB,
    procedures JSONB DEFAULT '[]'::JSONB,
    
    -- Self-perception
    self_perceived_skin_clarity INTEGER CHECK (self_perceived_skin_clarity >= 1 AND self_perceived_skin_clarity <= 5),
    self_perceived_age INTEGER,
    
    -- Additional
    additional_notes TEXT,
    
    -- Notification preferences
    checkin_day INTEGER,
    checkin_hour INTEGER,
    checkin_minute INTEGER,
    notifications_enabled BOOLEAN DEFAULT TRUE
);

-- SCAN RESULTS TABLE
CREATE TABLE scan_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    week_number INTEGER NOT NULL,
    is_baseline BOOLEAN DEFAULT FALSE,
    
    score_overall INTEGER CHECK (score_overall >= 0 AND score_overall <= 100),
    score_skin INTEGER CHECK (score_skin >= 0 AND score_skin <= 100),
    score_symmetry INTEGER CHECK (score_symmetry >= 0 AND score_symmetry <= 100),
    score_definition INTEGER CHECK (score_definition >= 0 AND score_definition <= 100),
    score_vitality INTEGER CHECK (score_vitality >= 0 AND score_vitality <= 100),
    score_grooming INTEGER CHECK (score_grooming >= 0 AND score_grooming <= 100),
    perceived_age INTEGER,
    
    raw_asymmetry_coefficient FLOAT,
    raw_skin_tone_variance FLOAT,
    raw_undereye_darkness FLOAT,
    raw_jaw_definition FLOAT,
    raw_cheek_volume FLOAT,
    
    explanation_skin TEXT,
    explanation_symmetry TEXT,
    explanation_definition TEXT,
    explanation_vitality TEXT,
    explanation_grooming TEXT,
    overall_summary TEXT,
    
    alignment_quality TEXT,
    lighting_consistency FLOAT,
    
    context_sleep_quality INTEGER,
    context_stress_level INTEGER,
    context_notes TEXT,
    context_new_products JSONB DEFAULT '[]'::JSONB,
    context_new_treatments JSONB DEFAULT '[]'::JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ROUTINE_STATE TABLE
CREATE TABLE routine_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tasks_json JSONB NOT NULL,
    completion_json JSONB DEFAULT '{}'::JSONB,
    current_streak INTEGER DEFAULT 0,
    last_completed_date DATE,
    personalization_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(user_id, week_number)
);

-- USER_PRODUCTS TABLE
CREATE TABLE user_products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    barcode TEXT,
    started_using DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- INDEXES
CREATE INDEX idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX idx_scan_results_captured_at ON scan_results(captured_at DESC);
CREATE INDEX idx_routine_state_user_id ON routine_state(user_id);
CREATE INDEX idx_user_products_user_id ON user_products(user_id);
CREATE INDEX idx_user_products_barcode ON user_products(barcode);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

CREATE POLICY "Users can view own scan results" ON scan_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan results" ON scan_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own routine state" ON routine_state
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own products" ON user_products
    FOR ALL USING (auth.uid() = user_id);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Supabase Client (React Native)

Auth tokens are stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android), **not** AsyncStorage. AsyncStorage is unencrypted and a stolen-or-compromised device would leak the refresh token. SecureStore has a 2 KB per-key limit; we shard the session blob into two keys to stay under it.

```bash
npx expo install expo-secure-store
```

```typescript
// src/services/secureStorageAdapter.ts
import * as SecureStore from 'expo-secure-store';

/**
 * Supabase storage adapter backed by expo-secure-store.
 * Splits long values across multiple keys to dodge the 2 KB SecureStore limit
 * (refresh-token blobs can exceed this).
 */
const CHUNK_SIZE = 1800; // safety margin under 2 KB

export const SecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) return null;
    // Reassemble chunks if the value was sharded
    if (!head.startsWith('__chunked__:')) return head;
    const count = parseInt(head.slice('__chunked__:'.length), 10);
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, `__chunked__:${chunks}`);
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    const head = await SecureStore.getItemAsync(key);
    if (head?.startsWith('__chunked__:')) {
      const count = parseInt(head.slice('__chunked__:'.length), 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};
```

```typescript
// src/services/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SecureStorageAdapter } from './secureStorageAdapter';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStorageAdapter, // ⚠️ never AsyncStorage — tokens must be encrypted
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Mobile doesn't use URL detection
  },
});
```

**What stays in AsyncStorage:** non-sensitive preferences only — theme choice (file 15), promo codes (file 31), onboarding-progress flags. Anything that authenticates the user goes to SecureStore.

---

## Auth Service

```typescript
// src/services/authService.ts
import { supabase } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAppState } from '@/stores/appStateStore';

export class AuthService {
  // Sign in with Apple (recommended)
  static async signInWithApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      if (!credential.identityToken) {
        throw new Error('No identity token from Apple');
      }
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      
      if (error) throw error;
      
      // Create profile if first sign-in
      if (data.user) {
        await this.ensureProfile(data.user.id, credential.fullName?.givenName);
        useAppState.getState().setUser(data.user);
      }
      
      return data;
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled
        return null;
      }
      throw error;
    }
  }
  
  // Sign in with Email (fallback)
  static async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    if (data.user) {
      useAppState.getState().setUser(data.user);
    }
    
    return data;
  }
  
  // Sign up with Email
  //
  // ⚠️ Order matters. RevenueCat must be identified BEFORE we mark the
  // app state as authenticated, because:
  //   1. The user may have just subscribed anonymously on the paywall.
  //   2. Any code that reacts to "user is logged in" (analytics, route
  //      guards, the dashboard fetching entitlements) must see the
  //      already-merged RC identity, not the pre-merge anonymous one.
  //   3. The Supabase Edge Function `record-subscription` webhook
  //      (file 03 → "Subscription webhook") is idempotent — even if it
  //      fires twice (anonymous + identified), the upsert on
  //      `subscriptions.rc_app_user_id` deduplicates.
  static async signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      await this.ensureProfile(data.user.id);

      // Merge any anonymous RC purchase onto this user.
      // Awaited — do NOT proceed until RC has the new identity.
      const { identifyRevenueCatUser } = await import(
        '@/services/revenuecat/init'
      );
      await identifyRevenueCatUser(data.user.id);

      useAppState.getState().setUser(data.user);
    }

    return data;
  }

  // Sign in (existing user) — same merge rule applies.
  static async signInWithEmailAndIdentify(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await this.ensureProfile(data.user.id);
      const { identifyRevenueCatUser } = await import(
        '@/services/revenuecat/init'
      );
      await identifyRevenueCatUser(data.user.id);
      useAppState.getState().setUser(data.user);
    }
    return data;
  }
  
  // Sign Out
  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    useAppState.getState().setUser(null);
  }
  
  // Ensure profile exists
  private static async ensureProfile(userId: string, firstName?: string) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!existing) {
      await supabase.from('profiles').insert({
        id: userId,
        first_name: firstName,
        created_at: new Date().toISOString(),
      });
    }
  }
}
```

---

## Profile Service

```typescript
// src/services/profileService.ts
import { supabase } from './supabase';
import type { UserProfile } from '@/types/profile';
import type { ScanSession } from '@/types/scan';

export class ProfileService {
  // Fetch full profile
  static async fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data ? this.dbToProfile(data) : null;
  }
  
  // Save profile
  static async saveProfile(profile: UserProfile, userId: string): Promise<void> {
    const dbProfile = this.profileToDb(profile, userId);
    const { error } = await supabase.from('profiles').upsert(dbProfile);
    if (error) throw error;
  }
  
  // Save scan result (scores only, not photos)
  static async saveScanResult(session: ScanSession, userId: string): Promise<void> {
    const { scores, context } = session;

    // Preflight: make sure the profile row exists. If the user signed up
    // moments ago and the profile row hasn't propagated yet, or the row was
    // deleted, the FK insert below would fail silently. We surface the
    // problem instead of dropping the scan.
    //
    // Retry up to 3x with exponential backoff (300ms, 900ms, 2700ms) before
    // throwing — covers the common case of post-signup propagation lag during
    // trial-surge concurrency. After 3 attempts we still throw and the caller
    // (file 05 capture flow) queues the scan locally for retry on next foreground.
    const profile = await retryUntilExists(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, scoring_framework')
        .eq('id', userId)
        .maybeSingle();
      return data;
    }, { attempts: 3, baseDelayMs: 300 });

    if (!profile) {
      // Persist the scan locally as 'pending sync' (file 05 contract).
      throw new ProfileMissingError(userId, session.id);
    }

    const { error } = await supabase.from('scan_results').insert({
      id: session.id,
      user_id: userId,
      captured_at: session.capturedAt,
      week_number: session.weekNumber,
      is_baseline: session.isBaseline,
      score_overall: scores.overall,
      score_skin: scores.skin,
      score_symmetry: scores.symmetry,
      score_definition: scores.definition,
      score_vitality: scores.vitality,
      score_grooming: scores.grooming,
      perceived_age: scores.perceivedAge,
      explanation_skin: scores.skinExplanation,
      explanation_symmetry: scores.symmetryExplanation,
      explanation_definition: scores.definitionExplanation,
      explanation_vitality: scores.vitalityExplanation,
      explanation_grooming: scores.groomingExplanation,
      overall_summary: scores.overallSummary,
      alignment_quality: session.alignmentQuality,
      lighting_consistency: session.lightingConsistency,
      context_sleep_quality: context.sleepQuality,
      context_stress_level: context.stressLevel,
      context_notes: context.notes,
      context_new_products: context.newProductsStarted,
      context_new_treatments: context.newTreatmentsStarted,
    });
    
    if (error) throw error;
  }

  // Helper used by saveScanResult preflight. Exponential backoff: 300ms, 900ms, 2700ms.
  static async retryUntilExists<T>(
    fn: () => Promise<T | null>,
    { attempts, baseDelayMs }: { attempts: number; baseDelayMs: number },
  ): Promise<T | null> {
    for (let i = 0; i < attempts; i++) {
      const result = await fn();
      if (result) return result;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelayMs * Math.pow(3, i)));
      }
    }
    return null;
  }
}

// Surfaced to capture flow (file 05) so it can queue the scan locally for retry.
export class ProfileMissingError extends Error {
  constructor(public readonly userId: string, public readonly sessionId: string) {
    super(`Profile ${userId} not found after retry. Scan ${sessionId} queued locally.`);
    this.name = 'ProfileMissingError';
  }
  
  /**
   * Step 1 of GDPR / Apple-compliant account deletion.
   *
   * Triggers the `request-account-deletion` Edge Function which:
   *   1. Generates a single-use signed token (HMAC, 24 h expiry).
   *   2. Stores it in `pending_deletions(user_id, token_hash, expires_at)`.
   *   3. Sends an email containing `vela://delete-account/confirm?token=…`.
   *
   * No data is deleted yet. Confirmation happens via deep link → `confirmAccountDeletion`.
   */
  static async requestAccountDeletion(userId: string): Promise<void> {
    const { error } = await supabase.functions.invoke(
      'request-account-deletion',
      { body: { user_id: userId } },
    );
    if (error) throw error;
  }

  /**
   * Step 2: called by the deep link handler (file 30) when the user opens
   * the email link. The Edge Function:
   *   1. Validates the token (constant-time compare against stored hash).
   *   2. Writes a row to `deletion_audit_log` (immutable, retained 7 years).
   *   3. Calls Supabase admin API to delete auth user → cascades profiles,
   *      scan_results, subscriptions, daily_routines, user_products via FK.
   *   4. Calls RevenueCat REST API to delete the customer record.
   *   5. Deletes any local PostHog `$device_id` mappings server-side.
   */
  static async confirmAccountDeletion(token: string): Promise<void> {
    const { error } = await supabase.functions.invoke(
      'confirm-account-deletion',
      { body: { token } },
    );
    if (error) throw error;
  }
  
  // Map database row to TypeScript profile
  private static dbToProfile(row: any): UserProfile {
    return {
      firstName: row.first_name,
      gender: row.gender,
      age: row.age,
      location: row.country ? { country: row.country, city: row.city, timezone: row.timezone } : undefined,
      ethnicity: row.ethnicity || [],
      skinType: row.skin_type,
      skinConditions: row.skin_conditions || [],
      hairSituation: row.hair_situation,
      facialHair: row.facial_hair,
      faceShape: row.face_shape,
      skinConcernRegions: row.skin_concern_regions || [],
      primaryGoal: row.primary_goal,
      secondaryGoals: row.secondary_goals || [],
      idealOutcome: row.ideal_outcome,
      dailyTimeAvailable: row.daily_time_available,
      monthlyBudget: row.monthly_budget,
      currentRoutineIntensity: row.current_routine_intensity,
      spfHabit: row.spf_habit,
      currentProducts: [],
      exerciseFrequency: row.exercise_frequency,
      dietPattern: row.diet_pattern,
      waterIntake: row.water_intake,
      sleepHours: row.sleep_hours,
      stressLevel: row.stress_level,
      substanceHabits: row.substance_habits || [],
      hormonalFactors: row.hormonal_factors || [],
      procedures: row.procedures || [],
      selfPerceivedSkinClarity: row.self_perceived_skin_clarity || 3,
      selfPerceivedAge: row.self_perceived_age,
      additionalNotes: row.additional_notes,
      profileVersion: row.profile_version || '1.0',
      lastUpdated: row.updated_at,
    };
  }
  
  // Map TypeScript profile to database row
  private static profileToDb(profile: UserProfile, userId: string): any {
    return {
      id: userId,
      first_name: profile.firstName,
      gender: profile.gender,
      age: profile.age,
      country: profile.location?.country,
      city: profile.location?.city,
      timezone: profile.location?.timezone,
      ethnicity: profile.ethnicity,
      skin_type: profile.skinType,
      skin_conditions: profile.skinConditions,
      hair_situation: profile.hairSituation,
      facial_hair: profile.facialHair,
      face_shape: profile.faceShape,
      skin_concern_regions: profile.skinConcernRegions,
      primary_goal: profile.primaryGoal,
      secondary_goals: profile.secondaryGoals,
      ideal_outcome: profile.idealOutcome,
      daily_time_available: profile.dailyTimeAvailable,
      monthly_budget: profile.monthlyBudget,
      current_routine_intensity: profile.currentRoutineIntensity,
      spf_habit: profile.spfHabit,
      exercise_frequency: profile.exerciseFrequency,
      diet_pattern: profile.dietPattern,
      water_intake: profile.waterIntake,
      sleep_hours: profile.sleepHours,
      stress_level: profile.stressLevel,
      substance_habits: profile.substanceHabits,
      hormonal_factors: profile.hormonalFactors,
      procedures: profile.procedures,
      self_perceived_skin_clarity: profile.selfPerceivedSkinClarity,
      self_perceived_age: profile.selfPerceivedAge,
      additional_notes: profile.additionalNotes,
      profile_version: profile.profileVersion,
      updated_at: new Date().toISOString(),
    };
  }
}
```

---

## AI Proxy Edge Function

**Production (current):** OpenAI Chat Completions via `supabase/functions/_shared/openai.ts`, secret `OPENAI_API_KEY`, optional `MODEL_FAST` / `MODEL_QUALITY`. Vision assessments require `payload.imageBase64` (JPEG) from the client.

The block below is **illustrative pseudo-code** from an earlier draft; keep the real implementation aligned with the repo.

```typescript
// supabase/functions/ai-proxy/index.ts (pseudo-code — see repo)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface AIRequest {
  type: 'score_explanation' | 'routine_generation' | 'grooming_assessment' | 'personalized_copy';
  payload: any;
}

// CORS allowlist. Native iOS/Android clients DO NOT send an Origin header,
// so they bypass CORS — that's fine. The only legitimate browser caller is
// our admin tooling. Wildcards expose the function to any malicious site
// whose users have a valid Supabase JWT (from any project): they could
// burn AI tokens against our budget.
const ALLOWED_ORIGINS = new Set<string>([
  // 'https://admin.getvela.app', // future internal tools
]);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  // No Origin header → native client → don't set allow-origin (not needed).
  return headers;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeadersFor(origin);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    // Reject browser preflights from non-allowlisted origins.
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response('Origin not allowed', { status: 403 });
    }
    return new Response('ok', { headers: cors });
  }

  try {
    // Verify user is authenticated AND belongs to THIS Supabase project
    // (not just any Supabase JWT — the client is created with our project's
    // anon key + the user's JWT, which getUser() validates against our project).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response('Unauthorized', { status: 401, headers: cors });
    }

    // Per-user rate limit (stub — implement with Redis / Supabase KV).
    // Keeps a runaway client from spending the AI budget.
    if (await isRateLimited(user.id)) {
      return new Response('Rate limited', { status: 429, headers: cors });
    }

    // Parse request
    const body: AIRequest = await req.json();
    
    // Route to appropriate handler
    let response;
    switch (body.type) {
      case 'score_explanation':
        response = await handleScoreExplanation(body.payload);
        break;
      case 'routine_generation':
        response = await handleRoutineGeneration(body.payload);
        break;
      case 'grooming_assessment':
        response = await handleGroomingAssessment(body.payload);
        break;
      case 'personalized_copy':
        response = await handlePersonalizedCopy(body.payload);
        break;
      default:
        return new Response('Invalid request type', { status: 400 });
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    // Don't leak stack traces to the client.
    console.error('[ai-proxy] error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Stub rate limiter. Replace with a Redis / Supabase-KV-backed implementation
 * before launch. Suggested defaults: 30 AI calls / user / hour, 200 / day.
 */
async function isRateLimited(userId: string): Promise<boolean> {
  return false;
}

async function callOpenAI(model: string, system: string, messages: any[]) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return response.json();
}

async function handleScoreExplanation(payload: any) {
  const { current, previous, rawMetrics } = payload;
  
  const system = `You are Vela's facial analysis engine. Explain what changed in a user's face metrics between two weekly scans. Be specific about observable changes. Keep explanations to 1-2 sentences. Never mention numerical scores. Frame all changes neutrally or positively. Return valid JSON only.`;
  
  const userMessage = `Current scores: Skin ${current.skin}, Symmetry ${current.symmetry}, Definition ${current.definition}, Vitality ${current.vitality}, Grooming ${current.grooming}.
Previous scores: Skin ${previous.skin}, Symmetry ${previous.symmetry}, Definition ${previous.definition}, Vitality ${previous.vitality}, Grooming ${previous.grooming}.
Raw metrics: ${JSON.stringify(rawMetrics)}.

Return JSON: { "skin": "...", "symmetry": "...", "definition": "...", "vitality": "...", "grooming": "...", "overall": "1-2 sentence summary" }`;
  
  const result = await callOpenAI('gpt-4o-mini', system, [
    { role: 'user', content: userMessage },
  ]);

  const text = result.choices[0].message.content;
  return JSON.parse(text);
}

async function handleRoutineGeneration(payload: any) {
  const { profile, scores, availableTaskIds } = payload;
  
  const system = `You are Vela's routine personalization engine. Select the most appropriate routine tasks for this user based on their profile, current scores, and weakest areas. Maximum 8 tasks. Return JSON only.`;
  
  const userMessage = `User profile: ${JSON.stringify(profile)}.
Current scores: ${JSON.stringify(scores)}.
Available task IDs: ${availableTaskIds.join(', ')}.

Select 4-8 tasks that target the weakest sub-scores while respecting time and budget constraints.

Return JSON: { "task_ids": ["id1", "id2", ...], "personalization_note": "Brief explanation of why this routine fits this user" }`;
  
  const result = await callOpenAI('gpt-4o', system, [
    { role: 'user', content: userMessage },
  ]);

  return JSON.parse(result.choices[0].message.content);
}

async function handleGroomingAssessment(payload: any) {
  const { imageBase64, framework } = payload;
  
  const system = `You assess grooming in face photos. Focus on hairstyling, eyebrows, facial hair (if present), and presentation. Don't comment on attractiveness or features beyond grooming. Return JSON only.`;
  
  const result = await callOpenAI('gpt-4o', system, [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
        {
          type: 'text',
          text: `Assess grooming for ${framework} framework. Return JSON: { "score": 0-100, "explanation": "brief observation" }`,
        },
      ],
    },
  ]);

  return JSON.parse(result.choices[0].message.content);
}

async function handlePersonalizedCopy(payload: any) {
  const { context, profile } = payload;
  
  const system = `You write personalized, warm, intelligent copy for Vela. Match the user's profile and context. Never use looksmaxxing language. Sound like a serious wellness app, not a beauty app. Return JSON only.`;
  
  const result = await callOpenAI('gpt-4o-mini', system, [
    { role: 'user', content: JSON.stringify({ context, profile }) },
  ]);

  return JSON.parse(result.choices[0].message.content);
}
```

Deploy with:
```bash
supabase functions deploy ai-proxy
supabase secrets set OPENAI_API_KEY=your_key_here
```

---

## AI Client (React Native)

```typescript
// src/services/ai.ts
import { supabase } from './supabase';
import type { ScanScores, RawMetrics } from '@/types/scan';
import type { UserProfile } from '@/types/profile';

export class AIService {
  static async explainScoreChanges(
    current: ScanScores,
    previous: ScanScores,
    rawMetrics: RawMetrics
  ) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        type: 'score_explanation',
        payload: { current, previous, rawMetrics },
      },
    });
    
    if (error) throw error;
    return data;
  }
  
  static async generateRoutine(profile: UserProfile, scores: ScanScores, availableTaskIds: string[]) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        type: 'routine_generation',
        payload: { profile, scores, availableTaskIds },
      },
    });
    
    if (error) throw error;
    return data as { task_ids: string[]; personalization_note: string };
  }
  
  static async assessGrooming(imageBase64: string, framework: string) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        type: 'grooming_assessment',
        payload: { imageBase64, framework },
      },
    });
    
    if (error) throw error;
    return data as { score: number; explanation: string };
  }
  
  static async generatePersonalizedCopy(context: any, profile: UserProfile) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        type: 'personalized_copy',
        payload: { context, profile },
      },
    });
    
    if (error) throw error;
    return data;
  }
}
```
