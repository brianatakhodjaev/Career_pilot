import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordPlateItemCompletion } from "@/lib/streak";

// Post-Amendment-3 replacement for the deleted /api/tasks/complete. Marks
// a PlateItem complete and triggers the streak / minutes accounting via
// lib/streak.ts. The minutes contribution is the midpoint of the unit's
// timeRange (units don't have a single exact estimate).

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
    include: { unit: true },
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
