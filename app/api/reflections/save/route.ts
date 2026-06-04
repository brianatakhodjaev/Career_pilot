import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Amendment 6 §15.7 — reflection answer persistence.
// Append-log per Decision H: insert a new row on each save. The UI
// reads "latest per prompt" via lib/reflection.ts so re-takes preserve
// the full longitudinal record.
//
// Called with debounced (500ms) autosave from the reflection form.

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  prompt: z.string().min(1).max(2000),
  answer: z.string().max(20000),
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
  const { plateItemId, prompt, answer } = parsed.data;

  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  const row = await prisma.reflectionAnswer.create({
    data: { plateItemId, prompt, answer },
    select: { id: true, updatedAt: true },
  });

  return NextResponse.json(
    { success: true, data: { id: row.id, updatedAt: row.updatedAt } },
    { status: 200 },
  );
}
