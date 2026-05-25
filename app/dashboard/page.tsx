import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardView, type DashboardData } from "./dashboard-view";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [plan, progress, activeSession, latestAssessment, userProfile] =
    await Promise.all([
      prisma.careerPlan.findFirst({
        where: { userId, isActive: true },
        include: {
          phases: {
            include: {
              tasks: { orderBy: { id: "asc" } },
            },
            orderBy: { weekNumber: "asc" },
          },
        },
      }),
      prisma.userProgress.findUnique({ where: { userId } }),
      prisma.learningSession.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: "desc" },
      }),
      prisma.riskAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userProfile.findUnique({ where: { userId } }),
    ]);

  // No active plan = user hasn't completed onboarding. Send them back.
  if (!plan) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold">Welcome to CareerPilot</h1>
          <p className="mt-2 text-sm text-gray-600">
            Let&apos;s get you set up. Complete the onboarding and your plan
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

  // Serialize to plain JSON for the client component (Dates → ISO strings).
  const data: DashboardData = {
    plan: {
      id: plan.id,
      title: plan.title,
      trackType: plan.trackType,
      durationWeeks: plan.durationWeeks,
      hoursPerWeek: plan.hoursPerWeek,
      startedAt: plan.startedAt?.toISOString() ?? null,
      phases: plan.phases.map((p) => ({
        id: p.id,
        weekNumber: p.weekNumber,
        title: p.title,
        objectives: p.objectives,
        tasks: p.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          estimatedMinutes: t.estimatedMinutes,
          resourceUrl: t.resourceUrl,
          completedAt: t.completedAt?.toISOString() ?? null,
        })),
      })),
    },
    progress: {
      currentStreak: progress?.currentStreak ?? 0,
      longestStreak: progress?.longestStreak ?? 0,
      totalMinutes: progress?.totalMinutes ?? 0,
    },
    activeSession: activeSession
      ? {
          id: activeSession.id,
          startedAt: activeSession.startedAt.toISOString(),
        }
      : null,
    hasAssessment: Boolean(latestAssessment),
    backgroundHref: userProfile?.profileType
      ? `/onboard/background?profile=${userProfile.profileType}`
      : "/onboard/background",
    userName: session.user.name ?? null,
  };

  return <DashboardView data={data} />;
}
