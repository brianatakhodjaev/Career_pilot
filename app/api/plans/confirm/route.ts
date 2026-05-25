import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlanSchema } from "@/lib/plans";

// Pure DB write — no Claude call. 30s ceiling is generous for the nested
// create (CareerPlan + N PlanPhases + M LearningTasks each, wrapped in a
// $transaction with a deactivate of any prior active plan).
export const maxDuration = 30;

const RequestSchema = z.object({
  plan: PlanSchema,
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

  const { plan } = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Deactivate any prior active plan. There should be at most one;
      // updateMany is a no-op when there are zero.
      await tx.careerPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return await tx.careerPlan.create({
        data: {
          userId,
          title: plan.title,
          trackType: plan.trackType,
          matchScore: plan.matchScore,
          isActive: true,
          durationWeeks: plan.durationWeeks,
          hoursPerWeek: plan.hoursPerWeek,
          description: plan.description,
          planData: plan as unknown as Prisma.InputJsonValue,
          phases: {
            create: plan.phases.map((phase) => ({
              weekNumber: phase.weekNumber,
              title: phase.title,
              objectives: phase.objectives,
              tasks: {
                create: phase.tasks.map((task) => ({
                  title: task.title,
                  type: task.type,
                  estimatedMinutes: task.estimatedMinutes,
                  resourceUrl: task.resourceUrl,
                })),
              },
            })),
          },
        },
      });
    });

    return NextResponse.json(
      { success: true, data: { planId: created.id } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[plans/confirm] DB write failed", err);
    return NextResponse.json(
      { success: false, error: "Could not save your plan." },
      { status: 502 },
    );
  }
}
