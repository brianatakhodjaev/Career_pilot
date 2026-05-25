import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssessmentDisplay } from "@/app/_components/assessment-display";
import type { Assessment } from "@/lib/assessment";

// DB-backed ongoing view of the user's latest assessment. /onboard/assessment
// is sessionStorage-backed (single onboarding session). This route reads the
// most recent RiskAssessment row so the user can return to it days later via
// the dashboard footer link.

export default async function AssessmentPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [latest, userProfile] = await Promise.all([
    prisma.riskAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);

  if (!latest) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold">No assessment yet</h1>
          <p className="mt-2 text-sm text-gray-600">
            Run the onboarding to generate your first assessment.
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

  const assessment: Assessment = {
    occupationLabel: latest.occupationLabel,
    scoreToday: latest.scoreToday,
    scoreProjected: latest.scoreProjected,
    scoreWithPlan: latest.scoreWithPlan,
    factors: latest.factors as Assessment["factors"],
    exposedTasks: latest.exposedTasks,
    defensibleTasks: latest.defensibleTasks,
    reasoning: latest.reasoning,
  };

  const backgroundHref = userProfile?.profileType
    ? `/onboard/background?profile=${userProfile.profileType}`
    : "/onboard/background";

  return (
    <AssessmentDisplay
      assessment={assessment}
      refinementSlot={
        <p className="mt-6 text-xs text-gray-500">
          Want this read to sharpen?{" "}
          <Link
            href={backgroundHref}
            className="underline underline-offset-2 hover:no-underline"
          >
            Update your background
          </Link>
          .
        </p>
      }
      bottomCta={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-600 underline underline-offset-4 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to dashboard
        </Link>
      }
    />
  );
}
