// Shared schema + types for the curriculum SELECTOR (post-Amendment 3 §7).
// The selector takes a user's context + the buffet and returns a marked-up
// menu (tag + rationale per unit, plus pacing and a plate summary).
//
// Imported by:
// - app/api/generate-plans/route.ts (validates Claude's selector response)
// - the menu and confirm screens (built in checkpoint 2, typed render)

import { z } from "zod";

export const SELECTOR_TAGS = ["core", "later", "skip"] as const;
export type SelectorTag = (typeof SELECTOR_TAGS)[number];

export const SelectorItemSchema = z.object({
  unitNumber: z.number().int().positive(),
  tag: z.enum(SELECTOR_TAGS),
  // Amendment 5 Change 4.1: a short phrase naming the specific
  // assessment finding this unit addresses (an exposedWork.work entry,
  // a defensibleWork entry, or a brief skip reason). Rendered as its
  // own "Addresses:" line on the menu — see app/onboard/plans.
  addressesFinding: z.string().min(1),
  rationale: z.string().min(1),
  orderIndex: z.number().int().nonnegative(),
});

export const SelectorOutputSchema = z.object({
  summary: z.string().min(1),
  pacing: z.object({
    unitsPerWeek: z.number().int().min(1).max(10),
  }),
  items: z.array(SelectorItemSchema).min(1),
});

export type SelectorItem = z.infer<typeof SelectorItemSchema>;
export type SelectorOutput = z.infer<typeof SelectorOutputSchema>;

// The buffet snapshot passed TO the selector — just the metadata Claude
// needs to make sensible tagging decisions. The full unit content
// (whyThisMatters / teaching / exercise / etc.) stays out of the prompt to
// keep tokens down and keep the model focused on selection, not summary.
export interface BuffetMetadata {
  unitNumber: number;
  title: string;
  skill: string;
  tier: string;
  timeRangeMin: number;
  timeRangeMax: number;
  exerciseFormat: string;
  prerequisites: number[];
}
