import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Sets CareerPlan.startedAt for the user's active plan. Explicit start —
// /dashboard's "Begin week 1" CTA POSTs here. See §13 principle 8 and the
// §11 dashboard task: the plan never auto-starts.
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
  if (plan.startedAt) {
    return NextResponse.json(
      { success: false, error: "Plan already started" },
      { status: 409 },
    );
  }

  const updated = await prisma.careerPlan.update({
    where: { id: plan.id },
    data: { startedAt: new Date() },
  });

  return NextResponse.json(
    { success: true, data: { startedAt: updated.startedAt } },
    { status: 200 },
  );
}
