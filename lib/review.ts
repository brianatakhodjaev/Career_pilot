// Shared schema + types for the /onboard/review summary call (Amendment 5
// §5a.3). The review call is a short Haiku-powered summarisation of how the
// system has understood the user, before the assessment runs. The user
// confirms or corrects the summary; the correction text (if any) then flows
// into the assessment call as additional context.
//
// Imported by:
// - app/api/review-summary/route.ts (validates Claude's response)
// - app/onboard/review/review-view.tsx (typed render)

import { z } from "zod";

export const ReviewSummarySchema = z.object({
  summary: z.string().min(1),
});

export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;
