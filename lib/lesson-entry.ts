// Server-side helper: idempotently sets PlateItem.startedAt to "now"
// when the user first opens any /learn/<unit>/* route. Called from both
// the TOC page and the item-view page so a user who deep-links straight
// to an item still gets startedAt populated — otherwise the dashboard
// rollup stays stuck on "not_started" no matter how many items they
// complete (real bug surfaced in the Stage 1 walk).
//
// Idempotent: only writes when startedAt is currently null.

import { prisma } from "@/lib/prisma";

export async function ensurePlateItemStarted(
  plateItemId: string,
  startedAt: Date | null,
): Promise<Date> {
  if (startedAt) return startedAt;
  const now = new Date();
  await prisma.plateItem.update({
    where: { id: plateItemId },
    data: { startedAt: now },
  });
  return now;
}
