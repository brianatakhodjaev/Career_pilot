import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Marks PlateItem.startedAt when the lesson screen is first opened (per
// Amendment 4 §15.3). With completedAt, gives the three-state status:
// not started / in progress / complete.
//
// Idempotent: the lesson screen fires this on every mount, but only the
// first call sets state. Already-started or already-completed items are
// silently left alone.

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
  });
  if (!item) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  if (!item.startedAt) {
    await prisma.plateItem.update({
      where: { id: item.id },
      data: { startedAt: new Date() },
    });
  }

  return NextResponse.json(
    { success: true, data: { plateItemId: item.id } },
    { status: 200 },
  );
}
