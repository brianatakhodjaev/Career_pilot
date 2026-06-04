// Amendment 6 Stage 2 — WorkspaceState.promptHistory shape + bounds.
// Each entry records one /api/workspace/run call's prompt + response.
// History is capped at 20 entries per Decision G — older entries drop
// silently on append. The cap happens server-side in the run route
// before the WorkspaceState upsert.
//
// For Compare-format exercises, each entry carries a `roundId` so the
// UI can group entries into rounds. Non-round exercises leave roundId
// null.

import { z } from "zod";

export const WORKSPACE_HISTORY_CAP = 20;

export const HistoryEntrySchema = z.object({
  prompt: z.string().min(1),
  response: z.string(), // may be empty if the model returned nothing
  runAt: z.string().min(1), // ISO timestamp
  roundId: z.string().nullable().default(null),
});

export const HistorySchema = z.array(HistoryEntrySchema);

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type WorkspaceHistory = z.infer<typeof HistorySchema>;

// Parse a possibly-malformed history blob from the DB. Returns an
// empty array on parse failure rather than throwing — the workspace
// can always recover by overwriting with the next save.
export function parseHistory(raw: unknown): WorkspaceHistory {
  const result = HistorySchema.safeParse(raw);
  return result.success ? result.data : [];
}

// Append a new entry, trimming the head if we'd exceed the cap.
export function appendToHistory(
  existing: WorkspaceHistory,
  entry: HistoryEntry,
): WorkspaceHistory {
  const next = [...existing, entry];
  if (next.length <= WORKSPACE_HISTORY_CAP) return next;
  return next.slice(next.length - WORKSPACE_HISTORY_CAP);
}
