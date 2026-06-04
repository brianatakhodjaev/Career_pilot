import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Amendment 6 §15.5 — single endpoint for item-level status writes.
// Upserts LessonItemProgress for a (plateItemId, itemId) pair.
//
// Status transitions:
//   in_progress  — set when the user enters an item view for the first time
//   complete     — set when the user finishes an item (e.g., self-test "I've checked")
//   got_it       — user-asserted completion without doing the full exercise (re-entry path, §15.8)
//
// Idempotent on "in_progress" → does not overwrite a more advanced status.
// "complete" / "got_it" overwrite freely (a user can move between them).

const STATUSES = ["in_progress", "complete", "got_it"] as const;

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  itemId: z.string().min(1),
  status: z.enum(STATUSES),
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
  const { plateItemId, itemId, status } = parsed.data;

  // Verify the plate item belongs to the calling user.
  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  const existing = await prisma.lessonItemProgress.findUnique({
    where: { plateItemId_itemId: { plateItemId, itemId } },
  });

  // "in_progress" does not regress an already-complete or got_it item.
  if (existing && status === "in_progress" && existing.status !== "in_progress") {
    return NextResponse.json(
      { success: true, data: { status: existing.status, idempotent: true } },
      { status: 200 },
    );
  }

  const completedAt =
    status === "complete" || status === "got_it" ? new Date() : null;

  const row = await prisma.lessonItemProgress.upsert({
    where: { plateItemId_itemId: { plateItemId, itemId } },
    create: {
      plateItemId,
      itemId,
      status,
      completedAt,
    },
    update: {
      status,
      completedAt,
    },
  });

  return NextResponse.json(
    { success: true, data: { status: row.status } },
    { status: 200 },
  );
}
