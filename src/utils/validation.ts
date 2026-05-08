/**
 * Zod schemas for runtime validation.
 *
 * Used by services that hydrate from Supabase / WatermelonDB to guarantee
 * structural integrity at boundaries. Static types live in src/types.
 */
import { z } from 'zod';

export const genderSchema = z.enum(['man', 'woman', 'non_binary', 'prefer_not_to_say']);

export const scoringFrameworkSchema = z.enum(['masculine', 'feminine', 'neutral']);

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  profileVersion: z.number().int().nonnegative(),
  gender: genderSchema,
  scoringFramework: scoringFrameworkSchema,
  age: z.number().int().min(13).max(120).optional(),
  notificationsEnabled: z.boolean().optional(),
  checkinDay: z.number().int().min(0).max(6).optional(),
  checkinHour: z.number().int().min(0).max(23).optional(),
});

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>;

export const scanScoresSchema = z.object({
  overall: z.number().min(0).max(100),
  skin: z.number().min(0).max(100),
  symmetry: z.number().min(0).max(100),
  grooming: z.number().min(0).max(100),
  lighting: z.number().min(0).max(100),
  contour: z.number().min(0).max(100),
  perceivedAge: z.number().optional(),
});
