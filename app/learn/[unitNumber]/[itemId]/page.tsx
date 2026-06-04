import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLessonContent } from "@/lib/lesson-content";
import { ensurePlateItemStarted } from "@/lib/lesson-entry";
import type { ItemState } from "@/lib/lesson-status";
import { ItemView } from "./item-view";

interface PageProps {
  params: Promise<{ unitNumber: string; itemId: string }>;
}

export default async function LearnItemPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const { unitNumber: raw, itemId } = await params;
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
    include: { unit: true },
  });
  if (!plateItem) {
    notFound();
  }

  const content = parseLessonContent(plateItem.unit.content);
  if (!content) {
    throw new Error(
      `BuffetUnit ${unitNumber} content does not conform to the §15.10 lesson-content schema`,
    );
  }

  const item = content.items.find((i) => i.id === itemId);
  if (!item) {
    notFound();
  }

  // §15.5 / Gap E: idempotent startedAt set on first lesson entry.
  // Mirrors the TOC page so deep-links into items still trigger it.
  if (!plateItem.completedAt) {
    await ensurePlateItemStarted(plateItem.id, plateItem.startedAt);
  }

  const existingProgress = await prisma.lessonItemProgress.findUnique({
    where: { plateItemId_itemId: { plateItemId: plateItem.id, itemId } },
    select: { status: true },
  });
  // status is `String` in the schema; narrow to ItemState defensively.
  // Anything unexpected falls back to "not_started" so the UI still renders.
  const rawStatus = existingProgress?.status ?? null;
  const currentState: ItemState =
    rawStatus === "in_progress" ||
    rawStatus === "complete" ||
    rawStatus === "got_it"
      ? rawStatus
      : "not_started";

  return (
    <ItemView
      plateItemId={plateItem.id}
      unitNumber={unitNumber}
      unitTitle={plateItem.unit.title}
      item={item}
      tools={content.tools}
      goingDeeper={content.goingDeeper}
      reflectionPrompts={content.reflectionPrompts}
      initialState={currentState}
    />
  );
}
