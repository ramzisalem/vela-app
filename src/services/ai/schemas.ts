import { z } from 'zod';

export const scoreExplanationSchema = z.object({
  summary: z.string(),
  subScores: z.record(z.string()),
});

export const routineGenerationSchema = z.object({
  taskIds: z.array(z.string()),
  note: z.string(),
});

const qualityFlag = z.enum(['good', 'caveat', 'rejected']);

export const groomingAssessmentSchema = z.object({
  score: z.number(),
  qualityFlag,
  notes: z.string(),
});

export const skinAssessmentSchema = z.object({
  score: z.number(),
  qualityFlag,
  clarity: z.number(),
  redness: z.number(),
  notes: z.string(),
});

export const textBlobSchema = z.object({ text: z.string() });

export const weeklyRevealSchema = z.object({
  headline: z.string(),
  body: z.string(),
});

export const forecastCopySchema = z.object({
  headerLine: z.string(),
  patternHypothesis: z.string(),
  footerActionLine: z.string(),
});

export const yoyInsightSchema = z.object({
  insight: z.string(),
  shouldShow: z.boolean(),
});

export const experimentVerdictCopySchema = z.object({ copy: z.string() });

export const diaryWeeklySummarySchema = z.object({ oneLine: z.string() });

export const healthInsightSchema = z.object({
  phrasing: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});
