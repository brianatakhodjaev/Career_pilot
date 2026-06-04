import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLessonContent } from "@/lib/lesson-content";
import { unitState, type ItemProgressRow, type UnitState } from "@/lib/lesson-status";
import { DashboardView, type DashboardData } from "./dashboard-view";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [plan, progress, latestAssessment, userProfile] = await Promise.all([
    prisma.careerPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        plateItems: {
          include: {
            unit: true,
            itemProgress: { select: { itemId: true, status: true } },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    }),
    prisma.userProgress.findUnique({ where: { userId } }),
    prisma.riskAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  if (!plan) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold">Welcome to CareerPilot</h1>
          <p className="mt-2 text-sm text-gray-600">
            Let&apos;s get you set up. Complete the onboarding and your plate
            will show up here.
          </p>
          <Link
            href="/onboard/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Start onboarding
          </Link>
        </div>
      </main>
    );
  }

  // Compute the four-state rollup server-side using lib/lesson-status so
  // the dashboard client stays lean. Content failing to parse falls back
  // to a startedAt/completedAt-only computation that ignores per-item
  // progress (degraded gracefully — won't surface "ready to complete").
  const data: DashboardData = {
    plan: {
      id: plan.id,
      durationWeeks: plan.durationWeeks,
      hoursPerWeek: plan.hoursPerWeek,
      startedAt: plan.startedAt?.toISOString() ?? null,
      plateItems: plan.plateItems.map((p) => {
        const content = parseLessonContent(p.unit.content);
        const itemProgress: ItemProgressRow[] = p.itemProgress
          .filter(
            (r): r is { itemId: string; status: ItemProgressRow["status"] } =>
              r.status === "in_progress" ||
              r.status === "complete" ||
              r.status === "got_it",
          )
          .map((r) => ({ itemId: r.itemId, status: r.status }));

        let state: UnitState;
        if (p.completedAt) {
          state = "complete";
        } else if (!p.startedAt) {
          state = "not_started";
        } else if (content) {
          state = unitState(
            { startedAt: p.startedAt, completedAt: p.completedAt },
            content,
            itemProgress,
          );
        } else {
          state = "in_progress";
        }

        return {
          id: p.id,
          tag: p.tag,
          rationale: p.rationale,
          orderIndex: p.orderIndex,
          startedAt: p.startedAt?.toISOString() ?? null,
          completedAt: p.completedAt?.toISOString() ?? null,
          unitState: state,
          unit: {
            id: p.unit.id,
            unitNumber: p.unit.unitNumber,
            title: p.unit.title,
            skill: p.unit.skill,
            tier: p.unit.tier,
            timeRangeMin: p.unit.timeRangeMin,
            timeRangeMax: p.unit.timeRangeMax,
            exerciseFormat: p.unit.exerciseFormat,
          },
        };
      }),
    },
    progress: {
      currentStreak: progress?.currentStreak ?? 0,
      longestStreak: progress?.longestStreak ?? 0,
      totalMinutes: progress?.totalMinutes ?? 0,
    },
    hasAssessment: Boolean(latestAssessment),
    backgroundHref: userProfile?.profileType
      ? `/onboard/background?profile=${userProfile.profileType}`
      : "/onboard/background",
    userName: session.user.name ?? null,
  };

  return <DashboardView data={data} />;
}
