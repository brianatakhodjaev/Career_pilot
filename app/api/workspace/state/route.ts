import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Amendment 6 §15.4 — non-run autosave for the workspace state.
// Persists selectedTaskId and/or currentPrompt as the user picks tasks
// and types in the prompt textarea. The /api/workspace/run route owns
// the promptHistory append separately.

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  itemId: z.string().min(1),
  selectedTaskId: z.string().min(1).nullable().optional(),
  currentPrompt: z.string().max(20000).optional(),
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
  const { plateItemId, itemId, selectedTaskId, currentPrompt } = parsed.data;

  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  // Only update fields the client actually sent — selectedTaskId can be
  // explicitly set to null to clear it.
  const updateData: {
    selectedTaskId?: string | null;
    currentPrompt?: string | null;
  } = {};
  if (selectedTaskId !== undefined) updateData.selectedTaskId = selectedTaskId;
  if (currentPrompt !== undefined) {
    updateData.currentPrompt = currentPrompt.length === 0 ? null : currentPrompt;
  }

  await prisma.workspaceState.upsert({
    where: { plateItemId_itemId: { plateItemId, itemId } },
    create: {
      plateItemId,
      itemId,
      selectedTaskId: selectedTaskId ?? null,
      currentPrompt:
        currentPrompt && currentPrompt.length > 0 ? currentPrompt : null,
      promptHistory: [],
    },
    update: updateData,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
