import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Amendment 6 §15.8 — Repeat the exercise (and the Stage 3 polish
// "Back to scaffolded tasks" escape hatch).
//
// Full wipe of WorkspaceState for (plateItemId, itemId): clears
// selectedTaskId, currentPrompt, promptHistory, AND customTask. The
// pre-polish version used `customTask: undefined` which in Prisma
// means "don't touch this field" — so a customTask from Deepen
// survived a Repeat. Now uses Prisma.DbNull to actually clear it.
//
// resetProgress (default: true) controls whether to also reset the
// matching LessonItemProgress to "in_progress":
//   - Repeat from the TOC sets resetProgress=true (the default) per
//     Decision G — the user has actively chosen to redo it.
//   - "Back to scaffolded tasks" from inside the workspace sets
//     resetProgress=false — the user is just escaping a Deepen
//     variation, not asking to redo the exercise.
//
// PlateItem.completedAt is NOT touched per §15.8 — re-entry is
// practice, not re-grading. The dashboard rollup stays "Complete."

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  itemId: z.string().min(1),
  resetProgress: z.boolean().optional().default(true),
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
  const { plateItemId, itemId, resetProgress } = parsed.data;

  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  const workspaceWipe = prisma.workspaceState.upsert({
    where: { plateItemId_itemId: { plateItemId, itemId } },
    create: {
      plateItemId,
      itemId,
      selectedTaskId: null,
      currentPrompt: null,
      promptHistory: [],
      customTask: Prisma.DbNull,
    },
    update: {
      selectedTaskId: null,
      currentPrompt: null,
      promptHistory: [],
      customTask: Prisma.DbNull,
    },
  });

  if (resetProgress) {
    await prisma.$transaction([
      workspaceWipe,
      prisma.lessonItemProgress.upsert({
        where: { plateItemId_itemId: { plateItemId, itemId } },
        create: { plateItemId, itemId, status: "in_progress" },
        update: { status: "in_progress", completedAt: null },
      }),
    ]);
  } else {
    await workspaceWipe;
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
