// Shared schema + types for the plan-generation payload. Imported by:
// - app/api/generate-plans/route.ts (validates Claude's response)
// - app/onboard/plans/* (typed render — to come in step 10)
// Single source of truth so the API contract and UI's expected shape stay
// in sync.

import { z } from "zod";

export const TRACK_TYPES = [
  "consultant",
  "builder",
  "strategist",
  "educator",
  "expert",
] as const;

export const TASK_TYPES = [
  "reading",
  "practice",
  "project",
  "experiment",
] as const;

export const TaskSchema = z.object({
  title: z.string().min(1),
  type: z.enum(TASK_TYPES),
  estimatedMinutes: z.number().int().min(5).max(600),
  resourceUrl: z.string().url().nullable(),
});

export const PhaseSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  title: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1).max(6),
  tasks: z.array(TaskSchema).min(1).max(4),
});

export const PlanSchema = z.object({
  title: z.string().min(1),
  trackType: z.enum(TRACK_TYPES),
  matchScore: z.number().int().min(0).max(100),
  durationWeeks: z.number().int().min(1).max(52),
  hoursPerWeek: z.number().int().min(1).max(40),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).min(2).max(6),
  phases: z.array(PhaseSchema).min(1).max(8),
});

export const PlansResponseSchema = z.object({
  plans: z.array(PlanSchema).length(3),
});

export type Task = z.infer<typeof TaskSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlansResponse = z.infer<typeof PlansResponseSchema>;
