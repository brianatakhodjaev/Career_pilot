import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Amendment 6 §15.8 — Repeat the exercise.
//
// Wipe WorkspaceState for the (plateItemId, itemId) pair: clear
// selectedTaskId, currentPrompt, customTask, and reset promptHistory
// to []. Also reset the matching LessonItemProgress to "in_progress"
// per Decision G (the user has actively chosen to redo it).
//
// PlateItem.completedAt is NOT touched per §15.8 — re-entry is
// practice, not re-grading. The dashboard rollup stays "Complete."

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  itemId: z.string().min(1),
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
  const { plateItemId, itemId } = parsed.data;

  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  await prisma.$transaction([
    prisma.workspaceState.upsert({
      where: { plateItemId_itemId: { plateItemId, itemId } },
      create: {
        plateItemId,
        itemId,
        selectedTaskId: null,
        currentPrompt: null,
        promptHistory: [],
        customTask: undefined,
      },
      update: {
        selectedTaskId: null,
        currentPrompt: null,
        promptHistory: [],
        customTask: undefined,
      },
    }),
    prisma.lessonItemProgress.upsert({
      where: { plateItemId_itemId: { plateItemId, itemId } },
      create: {
        plateItemId,
        itemId,
        status: "in_progress",
      },
      update: {
        status: "in_progress",
        completedAt: null,
      },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 200 });
}
