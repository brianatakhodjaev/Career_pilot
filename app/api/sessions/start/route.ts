import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Creates a LearningSession with startedAt = now.
//
// Per Amendment 4 (decision 3): if the user has any stale active session
// (endedAt null — typically from a tab close mid-lesson), we auto-end it
// here before creating the new one. The stale row is closed for hygiene
// (endedAt set, durationMin=0) but recordSessionEnd is intentionally NOT
// called — abandoned time does not credit toward streak or minutes.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  const plan = await prisma.careerPlan.findFirst({
    where: { userId, isActive: true },
  });
  if (!plan) {
    return NextResponse.json(
      { success: false, error: "No active plan" },
      { status: 404 },
    );
  }

  // Auto-end any stale active session. updateMany is a no-op when zero.
  await prisma.learningSession.updateMany({
    where: { userId, endedAt: null },
    data: { endedAt: new Date(), durationMin: 0 },
  });

  const created = await prisma.learningSession.create({
    data: {
      userId,
      planId: plan.id,
      startedAt: new Date(),
      toolsUsed: [],
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: { sessionId: created.id, startedAt: created.startedAt },
    },
    { status: 201 },
  );
}
