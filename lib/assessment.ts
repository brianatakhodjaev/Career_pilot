// Shared schema + types for the assessment payload. Imported by:
// - app/api/assess-exposure/route.ts (validates Claude's response)
// - app/onboard/assessment/assessment-view.tsx (typed render)
// Keeping this as the single source of truth so the API response shape
// and the UI's expected shape can't drift.

import { z } from "zod";

export const FIVE_FACTOR_LABELS = [
  "Routine and repeatable tasks",
  "Content and analysis generation",
  "Judgment in ambiguous situations",
  "Relationship and trust dependence",
  "Physical and on-site work",
] as const;

export const FactorSchema = z.object({
  label: z.enum(FIVE_FACTOR_LABELS),
  score: z.number().int().min(0).max(10),
  note: z.string().min(1),
});

export const AssessmentSchema = z.object({
  occupationLabel: z.string().min(1),
  scoreToday: z.number().int().min(0).max(10),
  scoreProjected: z.number().int().min(0).max(10),
  scoreWithPlan: z.number().int().min(0).max(10),
  factors: z.array(FactorSchema).length(5),
  exposedTasks: z.array(z.string().min(1)).min(3).max(4),
  defensibleTasks: z.array(z.string().min(1)).min(3).max(4),
  reasoning: z.string().min(1),
});

export type Factor = z.infer<typeof FactorSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
