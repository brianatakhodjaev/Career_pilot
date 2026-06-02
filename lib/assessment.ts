// Shared schema + types for the assessment payload. Imported by:
// - app/api/assess-exposure/route.ts (validates Claude's response)
// - app/onboard/assessment/assessment-view.tsx (typed render)
// - app/_components/assessment-display.tsx (typed render)
// - app/assessment/page.tsx (DB-backed long-term view)
// Single source of truth so the API response shape and the UI's expected
// shape can't drift.
//
// Amendment 5 expanded the shape: `inputDepth` + `inputDepthNote` make the
// assessment's calibration visible; `exposedWork[]` carries representative
// tools and adjacent branch suggestions per exposed item; `defensibleWork`
// renames the prior `defensibleTasks`.

import { z } from "zod";

export const FIVE_FACTOR_LABELS = [
  "Routine and repeatable tasks",
  "Content and analysis generation",
  "Judgment in ambiguous situations",
  "Relationship and trust dependence",
  "Physical and on-site work",
] as const;

export const INPUT_DEPTHS = ["thin", "moderate", "rich"] as const;
export type InputDepth = (typeof INPUT_DEPTHS)[number];

export const FactorSchema = z.object({
  label: z.enum(FIVE_FACTOR_LABELS),
  score: z.number().int().min(0).max(10),
  note: z.string().min(1),
});

export const ExposedWorkItemSchema = z.object({
  work: z.string().min(1),
  isSpecific: z.boolean(),
  tools: z.array(z.string().min(1)).min(1).max(3),
  branchTo: z.string().min(1),
});

export const AssessmentSchema = z.object({
  occupationLabel: z.string().min(1),
  inputDepth: z.enum(INPUT_DEPTHS),
  inputDepthNote: z.string().min(1),
  scoreToday: z.number().int().min(0).max(10),
  scoreProjected: z.number().int().min(0).max(10),
  scoreWithPlan: z.number().int().min(0).max(10),
  factors: z.array(FactorSchema).length(5),
  exposedWork: z.array(ExposedWorkItemSchema).min(3).max(4),
  defensibleWork: z.array(z.string().min(1)).min(3).max(4),
  reasoning: z.string().min(1),
});

export type Factor = z.infer<typeof FactorSchema>;
export type ExposedWorkItem = z.infer<typeof ExposedWorkItemSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
