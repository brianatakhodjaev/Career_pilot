import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLessonContent } from "@/lib/lesson-content";
import { ensurePlateItemStarted } from "@/lib/lesson-entry";
import type { ItemProgressRow } from "@/lib/lesson-status";
import { TocView } from "./toc-view";

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

  const plateItem = await prisma.plateItem.findFirst({
    where: {
      planId: plan.id,
      unit: { unitNumber },
    },
    include: {
      unit: true,
      itemProgress: {
        select: { itemId: true, status: true },
      },
    },
  });
  if (!plateItem) {
    notFound();
  }

  const content = parseLessonContent(plateItem.unit.content);
  if (!content) {
    // Content shape invalid — fail loudly rather than render a broken UI.
    throw new Error(
      `BuffetUnit ${unitNumber} content does not conform to the §15.10 lesson-content schema`,
    );
  }

  const itemProgress: ItemProgressRow[] = plateItem.itemProgress
    .filter(
      (r): r is { itemId: string; status: ItemProgressRow["status"] } =>
        r.status === "in_progress" || r.status === "complete" || r.status === "got_it",
    )
    .map((r) => ({ itemId: r.itemId, status: r.status }));

  // §15.5 / Gap E resolution: startedAt fires on first lesson entry,
  // server-side so deep-links to items still trigger it.
  const startedAt = plateItem.completedAt
    ? plateItem.startedAt
    : await ensurePlateItemStarted(plateItem.id, plateItem.startedAt);

  return (
    <TocView
      plateItemId={plateItem.id}
      startedAt={startedAt?.toISOString() ?? null}
      completedAt={plateItem.completedAt?.toISOString() ?? null}
      unit={{
        unitNumber: plateItem.unit.unitNumber,
        title: plateItem.unit.title,
        skill: plateItem.unit.skill,
        tier: plateItem.unit.tier,
        timeRangeMin: plateItem.unit.timeRangeMin,
        timeRangeMax: plateItem.unit.timeRangeMax,
        exerciseFormat: plateItem.unit.exerciseFormat,
      }}
      content={content}
      itemProgress={itemProgress}
    />
  );
}
