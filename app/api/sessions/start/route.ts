import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Creates a LearningSession with startedAt = now. Refuses if the user has
// an active (un-ended) session — only one running at a time.
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

  const existing = await prisma.learningSession.findFirst({
    where: { userId, endedAt: null },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "Session already in progress",
        data: { sessionId: existing.id, startedAt: existing.startedAt },
      },
      { status: 409 },
    );
  }

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
