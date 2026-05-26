import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LessonView, type LessonUnit } from "./lesson-view";

interface PageProps {
  params: Promise<{ unitNumber: string }>;
}

export default async function LearnPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const { unitNumber: raw } = await params;
  const unitNumber = Number.parseInt(raw, 10);
  if (!Number.isInteger(unitNumber) || unitNumber <= 0) {
    notFound();
  }

  const plan = await prisma.careerPlan.findFirst({
    where: { userId, isActive: true },
  });
  if (!plan) {
    redirect("/onboard/profile");
  }

  // Lesson is only reachable if the unit is on the user's active plate
  // (any tag — the dashboard only links core, but direct URL nav to a
  // later/skip unit on the user's plate is allowed).
  const plateItem = await prisma.plateItem.findFirst({
    where: {
      planId: plan.id,
      unit: { unitNumber },
    },
    include: { unit: true },
  });
  if (!plateItem) {
    notFound();
  }

  // Json column → typed shape. Content was validated at seed time
  // (scripts/seed-buffet.ts); cast through unknown is safe in this
  // direction (Prisma's JsonValue is broader than UnitContent).
  const content = plateItem.unit.content as unknown as LessonUnit["content"];

  return (
    <LessonView
      plateItemId={plateItem.id}
      startedAt={plateItem.startedAt?.toISOString() ?? null}
      completedAt={plateItem.completedAt?.toISOString() ?? null}
      unit={{
        unitNumber: plateItem.unit.unitNumber,
        title: plateItem.unit.title,
        skill: plateItem.unit.skill,
        tier: plateItem.unit.tier,
        timeRangeMin: plateItem.unit.timeRangeMin,
        timeRangeMax: plateItem.unit.timeRangeMax,
        exerciseFormat: plateItem.unit.exerciseFormat,
        content,
      }}
    />
  );
}
