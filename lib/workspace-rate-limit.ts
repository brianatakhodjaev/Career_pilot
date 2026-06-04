// Amendment 6 Stage 2 — per-user rate limits for /api/workspace/run.
// Decision C: 20 runs/hour, 100 runs/day per user. Backed by the
// append-only WorkspaceRunLog table (Decision D) which also serves as
// the cost-tracking audit trail.

import { prisma } from "@/lib/prisma";

export const RUNS_PER_HOUR = 20;
export const RUNS_PER_DAY = 100;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: "hour" | "day"; retryAfterSeconds: number };

export async function checkWorkspaceRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const hourAgo = new Date(now - HOUR_MS);
  const dayAgo = new Date(now - DAY_MS);

  const [hourCount, dayCount] = await Promise.all([
    prisma.workspaceRunLog.count({
      where: { userId, createdAt: { gte: hourAgo } },
    }),
    prisma.workspaceRunLog.count({
      where: { userId, createdAt: { gte: dayAgo } },
    }),
  ]);

  if (hourCount >= RUNS_PER_HOUR) {
    // Soft estimate — oldest entry in the window is when the limit clears.
    return { ok: false, reason: "hour", retryAfterSeconds: 60 * 60 };
  }
  if (dayCount >= RUNS_PER_DAY) {
    return { ok: false, reason: "day", retryAfterSeconds: 60 * 60 };
  }
  return { ok: true };
}

export async function logWorkspaceRun(
  userId: string,
  plateItemId: string,
  itemId: string,
): Promise<void> {
  await prisma.workspaceRunLog.create({
    data: { userId, plateItemId, itemId },
  });
}
