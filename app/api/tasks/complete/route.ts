import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordTaskCompletion } from "@/lib/streak";

const RequestSchema = z.object({
  taskId: z.string().min(1),
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

  // Verify the task belongs to the authenticated user via the
  // task -> phase -> plan -> userId chain.
  const task = await prisma.learningTask.findFirst({
    where: { id: parsed.data.taskId },
    include: { phase: { include: { plan: true } } },
  });
  if (!task || task.phase.plan.userId !== userId) {
    return NextResponse.json(
      { success: false, error: "Task not found" },
      { status: 404 },
    );
  }
  if (task.completedAt) {
    return NextResponse.json(
      { success: false, error: "Task already completed" },
      { status: 409 },
    );
  }

  await prisma.learningTask.update({
    where: { id: task.id },
    data: { completedAt: new Date() },
  });

  // §13 principle 8: a completed task is by definition activity for the
  // day. Streak increments idempotently per UTC day.
  await recordTaskCompletion(userId, task.estimatedMinutes);

  return NextResponse.json(
    { success: true, data: { taskId: task.id } },
    { status: 200 },
  );
}
