/**
 * AIService (file 06). All OpenAI calls go through the ai-proxy Edge Function.
 *
 * Resilience pattern: 3 retries at 2s / 6s / 18s. Each method has a
 * deterministic fallback (file 06 §"Fallbacks") so the UX never blocks.
 */
import type { z } from 'zod';
import { supabase } from '@/services/supabase';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import {
  diaryWeeklySummarySchema,
  experimentVerdictCopySchema,
  forecastCopySchema,
  groomingAssessmentSchema,
  healthInsightSchema,
  routineGenerationSchema,
  scoreExplanationSchema,
  skinAssessmentSchema,
  textBlobSchema,
  weeklyRevealSchema,
  yoyInsightSchema,
} from '@/services/ai/schemas';

const PROXY_URL =
  process.env.EXPO_PUBLIC_AI_PROXY_URL ?? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

const RETRY_DELAYS_MS = [2000, 6000, 18000];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface ProxyResponse<T> {
  ok: boolean;
  result?: T;
  error?: string;
  modelUsed?: string;
}

async function call<T>(type: string, payload: Record<string, unknown>, schema: z.ZodType<T>): Promise<T | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  // Only pass life-stage modes the user has opted in to share with AI.
  const lifeStageContext = useLifeStageStore
    .getState()
    .activeModes.filter((m) => m.aiOptIn)
    .map((m) => m.id);

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, payload, lifeStageContext }),
      });
      if (res.ok) {
        const json = (await res.json()) as ProxyResponse<unknown>;
        if (json.ok && json.result !== undefined) {
          const parsed = schema.safeParse(json.result);
          if (parsed.success) return parsed.data;
        }
      }
      if (res.status === 429) return null; // rate limited — abort, don't retry
    } catch {
      // network — retry
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[attempt] ?? 2000;
      await sleep(delay);
    }
  }
  return null;
}

export interface ScoreExplanation {
  summary: string;
  subScores: Record<string, string>;
}

export interface RoutineGeneration {
  taskIds: string[];
  note: string;
}

export interface SkinAssessment {
  score: number;
  qualityFlag: 'good' | 'caveat' | 'rejected';
  clarity: number;
  redness: number;
  notes: string;
}

export interface GroomingAssessment {
  score: number;
  qualityFlag: 'good' | 'caveat' | 'rejected';
  notes: string;
}

export const AIService = {
  async explainScoreChanges(payload: Record<string, unknown>) {
    return (await call('score_explanation', payload, scoreExplanationSchema)) ?? null;
  },
  async generateRoutine(payload: Record<string, unknown>) {
    return (await call('routine_generation', payload, routineGenerationSchema)) ?? null;
  },
  async assessGrooming(payload: Record<string, unknown>) {
    return (await call('grooming_assessment', payload, groomingAssessmentSchema)) ?? null;
  },
  async assessSkin(payload: Record<string, unknown>) {
    return (await call('skin_assessment', payload, skinAssessmentSchema)) ?? null;
  },
  async generatePersonalizedCopy(payload: Record<string, unknown>) {
    return (await call('personalized_copy', payload, textBlobSchema)) ?? null;
  },
  async generateMicroPayoff(payload: Record<string, unknown>) {
    return (await call('micro_payoff', payload, textBlobSchema)) ?? null;
  },
  async generateWeeklyReveal(payload: Record<string, unknown>) {
    return (await call('weekly_reveal', payload, weeklyRevealSchema)) ?? null;
  },
  async generateForecastCopy(payload: Record<string, unknown>) {
    return (await call('forecast_copy', payload, forecastCopySchema)) ?? null;
  },
  async generateAgingContextGuide(payload: Record<string, unknown>) {
    return (await call('aging_context_guide', payload, textBlobSchema)) ?? null;
  },
  async generateYoyInsight(payload: Record<string, unknown>) {
    return (await call('yoy_insight', payload, yoyInsightSchema)) ?? null;
  },
  async generateExperimentVerdictCopy(payload: Record<string, unknown>) {
    return (await call('experiment_verdict_copy', payload, experimentVerdictCopySchema)) ?? null;
  },
  async generateDiaryWeeklySummary(payload: Record<string, unknown>) {
    return (await call('diary_weekly_summary', payload, diaryWeeklySummarySchema)) ?? null;
  },
  async generateHealthInsight(payload: Record<string, unknown>) {
    return (await call('health_insight', payload, healthInsightSchema)) ?? null;
  },
};
