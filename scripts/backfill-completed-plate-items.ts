// One-shot backfill: for every PlateItem with completedAt set, ensure
// each required item in the unit has a LessonItemProgress row with
// status="got_it" (so the four-state dashboard rollup is consistent
// with the unit-level complete state).
//
// Triggered by the Stage-1 polish item: legacy users showed
// "Complete + 0/5 items done" because their PlateItem was marked
// complete before Amendment 6 introduced LessonItemProgress.
//
// Idempotent: skips items that already have a progress row.
//
// Run once: npx tsx scripts/backfill-completed-plate-items.ts

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseLessonContent } from "../lib/lesson-content";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  let plateItemsProcessed = 0;
  let rowsCreated = 0;

  try {
    const completedPlateItems = await prisma.plateItem.findMany({
      where: { completedAt: { not: null } },
      include: {
        unit: { select: { unitNumber: true, content: true } },
        itemProgress: { select: { itemId: true } },
      },
    });

    for (const pi of completedPlateItems) {
      const content = parseLessonContent(pi.unit.content);
      if (!content) {
        console.warn(
          `  ! plateItem ${pi.id} (unit ${pi.unit.unitNumber}) — content not parseable, skipping`,
        );
        continue;
      }
      const existing = new Set(pi.itemProgress.map((r) => r.itemId));
      const requiredItems = content.items.filter((i) => i.required);
      const missing = requiredItems.filter((i) => !existing.has(i.id));

      if (missing.length === 0) {
        plateItemsProcessed += 1;
        continue;
      }

      const completedAt = pi.completedAt ?? new Date();
      await prisma.lessonItemProgress.createMany({
        data: missing.map((i) => ({
          plateItemId: pi.id,
          itemId: i.id,
          status: "got_it",
          startedAt: completedAt,
          completedAt,
        })),
      });

      plateItemsProcessed += 1;
      rowsCreated += missing.length;
      console.log(
        `  ✓ plateItem ${pi.id} (unit ${pi.unit.unitNumber}) — backfilled ${missing.length} item(s) as got_it`,
      );
    }

    console.log(
      `\nDone. Processed ${plateItemsProcessed} completed PlateItem(s); created ${rowsCreated} LessonItemProgress row(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
