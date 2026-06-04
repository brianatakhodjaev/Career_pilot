import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordPlateItemCompletion } from "@/lib/streak";
import { parseLessonContent } from "@/lib/lesson-content";
import { canMarkUnitComplete, type ItemProgressRow } from "@/lib/lesson-status";

// Post-Amendment-3 replacement for the deleted /api/tasks/complete. Marks
// a PlateItem complete and triggers the streak / minutes accounting via
// lib/streak.ts. The minutes contribution is the midpoint of the unit's
// timeRange (units don't have a single exact estimate).
//
// Amendment 6 Stage 2 hardening (Decision J): refuse to mark complete
// unless every required item in the unit's content has a
// LessonItemProgress row with status complete or got_it. Belt to the
// TOC's client-side gate's suspenders — prevents the legacy "complete
// + 0/5 items done" divergence from recurring via direct API calls.

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request payload" },
      { status: 400 },
    );
  }

  const item = await prisma.plateItem.findFirst({
    where: { id: parsed.data.plateItemId, userId },
    include: {
      unit: true,
      itemProgress: { select: { itemId: true, status: true } },
    },
  });
  if (!item) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }
  if (item.completedAt) {
    return NextResponse.json(
      { success: false, error: "Already completed" },
      { status: 409 },
    );
  }

  // Server-side guard: refuse if not all required items are complete
  // or got_it. The TOC gates this client-side; this is the second line.
  const content = parseLessonContent(item.unit.content);
  if (content) {
    const itemProgress: ItemProgressRow[] = item.itemProgress
      .filter(
        (r): r is { itemId: string; status: ItemProgressRow["status"] } =>
          r.status === "in_progress" ||
          r.status === "complete" ||
          r.status === "got_it",
      )
      .map((r) => ({ itemId: r.itemId, status: r.status }));
    if (!canMarkUnitComplete(content, itemProgress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Not all required items are done yet.",
        },
        { status: 409 },
      );
    }
  }

  await prisma.plateItem.update({
    where: { id: item.id },
    data: { completedAt: new Date() },
  });

  const midpoint = Math.round(
    (item.unit.timeRangeMin + item.unit.timeRangeMax) / 2,
  );
  await recordPlateItemCompletion(userId, midpoint);

  return NextResponse.json(
    { success: true, data: { plateItemId: item.id } },
    { status: 200 },
  );
}
