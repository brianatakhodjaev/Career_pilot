import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseLessonContent } from "@/lib/lesson-content";
import { ensurePlateItemStarted } from "@/lib/lesson-entry";
import type { ItemState } from "@/lib/lesson-status";
import { parseHistory } from "@/lib/workspace-history";
import { readLatestReflectionsByPrompt } from "@/lib/reflection";
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
  const rawStatus = existingProgress?.status ?? null;
  const currentState: ItemState =
    rawStatus === "in_progress" ||
    rawStatus === "complete" ||
    rawStatus === "got_it"
      ? rawStatus
      : "not_started";

  // Stage 2: load workspace + reflection state for hydration. Both
  // queries are cheap and only fire for the item kinds that need them,
  // but for code simplicity we always fetch and let the client component
  // ignore irrelevant fields.
  const workspaceState =
    item.kind === "exercise"
      ? await prisma.workspaceState.findUnique({
          where: { plateItemId_itemId: { plateItemId: plateItem.id, itemId } },
          select: {
            selectedTaskId: true,
            currentPrompt: true,
            promptHistory: true,
          },
        })
      : null;

  const reflectionAnswers =
    item.id === "reflect"
      ? await readLatestReflectionsByPrompt(plateItem.id)
      : new Map();

  const initialReflectionAnswers: Record<string, string> = {};
  for (const [prompt, row] of reflectionAnswers) {
    initialReflectionAnswers[prompt] = row.answer;
  }

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
      workspaceInitial={{
        selectedTaskId: workspaceState?.selectedTaskId ?? null,
        currentPrompt: workspaceState?.currentPrompt ?? "",
        history: parseHistory(workspaceState?.promptHistory ?? []),
      }}
      reflectionInitial={initialReflectionAnswers}
    />
  );
}
