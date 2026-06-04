// Amendment 6 Stage 2 — reflection answer read helper.
// ReflectionAnswer is append-log per Decision H (one row per save, no
// upsert) so future re-takes preserve the longitudinal record. To
// render the form on revisit, we read the latest row per (plateItemId,
// prompt) ordered by createdAt desc.
//
// One Prisma query, deduped in code by prompt text.

import { prisma } from "@/lib/prisma";

export interface LatestReflection {
  prompt: string;
  answer: string;
  updatedAt: Date;
}

export async function readLatestReflectionsByPrompt(
  plateItemId: string,
): Promise<Map<string, LatestReflection>> {
  const rows = await prisma.reflectionAnswer.findMany({
    where: { plateItemId },
    orderBy: { createdAt: "desc" },
    select: { prompt: true, answer: true, updatedAt: true },
  });
  const latest = new Map<string, LatestReflection>();
  for (const row of rows) {
    if (!latest.has(row.prompt)) {
      latest.set(row.prompt, row);
    }
  }
  return latest;
}
