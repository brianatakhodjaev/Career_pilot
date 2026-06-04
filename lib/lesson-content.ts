// Shared schema + types for the §15.10 BuffetUnit.content shape
// (Amendment 6). Single source of truth: BuffetUnit.content is Json in
// the DB, so anything reading it parses through these schemas to get
// typed access without trusting the column directly.
//
// Imported by:
// - app/learn/[unitNumber]/page.tsx and toc-view.tsx
// - app/learn/[unitNumber]/[itemId]/page.tsx and item-view.tsx
// - lib/lesson-status.ts (for the items.required field)
// - app/dashboard/dashboard-view.tsx (for the items count + required flag)

import { z } from "zod";

export const ITEM_KINDS = ["read", "exercise", "wrap"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ScaffoldedTaskSchema = z.object({
  id: z.string().min(1),
  audience: z.string().min(1),
  task: z.string().min(1),
});

export const ScaffoldedRoundSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  instructions: z.string().min(1),
});

export const ExerciseSchema = z.object({
  format: z.string().min(1),
  instructions: z.string().min(1),
  scaffoldedTasks: z.array(ScaffoldedTaskSchema).min(1),
  scaffoldedRounds: z.array(ScaffoldedRoundSchema).default([]),
  // The noun the workspace uses when referring to one of the
  // scaffoldedRounds in user-facing chrome ("Round 1 of 2",
  // "Continue to Round 2", "Earlier rounds (1)"). Compare-format
  // exercises use the default "Round"/"Rounds"; Build-format units
  // (Unit 02) override with "Pass"/"Passes". Explicit plural avoids
  // pluralization rules ("Pass" + "s" = "Passs" would be wrong).
  roundNoun: z.string().min(1).default("Round"),
  roundNounPlural: z.string().min(1).default("Rounds"),
});

export const LessonItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  estimatedMinutes: z.number().int().min(1),
  required: z.boolean(),
  kind: z.enum(ITEM_KINDS),
  reading: z.string().min(1),
  exercise: ExerciseSchema.nullable(),
  selfTest: z.array(z.string().min(1)).default([]),
  deeperPrompt: z.string().nullable(),
});

export const ToolSchema = z.object({
  name: z.string().min(1),
  vendor: z.string().min(1),
});

export const LessonContentSchema = z.object({
  objectives: z.array(z.string().min(1)).min(1),
  items: z.array(LessonItemSchema).min(1),
  reflectionPrompts: z.array(z.string().min(1)).default([]),
  tools: z.array(ToolSchema).default([]),
  goingDeeper: z.string().default(""),
});

export type ScaffoldedTask = z.infer<typeof ScaffoldedTaskSchema>;
export type ScaffoldedRound = z.infer<typeof ScaffoldedRoundSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type LessonItem = z.infer<typeof LessonItemSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type LessonContent = z.infer<typeof LessonContentSchema>;

// Convenience helper: parse a BuffetUnit.content Json column. Returns
// null if the column doesn't conform — callers decide how to fail
// (server pages typically render a "content invalid" error).
export function parseLessonContent(raw: unknown): LessonContent | null {
  const result = LessonContentSchema.safeParse(raw);
  return result.success ? result.data : null;
}
