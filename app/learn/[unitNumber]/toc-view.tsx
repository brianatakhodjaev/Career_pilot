"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleDot, Circle, ArrowRight, Loader2 } from "lucide-react";
import type { LessonContent, LessonItem } from "@/lib/lesson-content";
import type { ItemProgressRow, ItemState } from "@/lib/lesson-status";
import {
  ITEM_STATE_LABEL,
  canMarkUnitComplete,
  itemCounts,
  itemState,
} from "@/lib/lesson-status";
import { LessonTimerControl, useLessonTimer } from "./lesson-timer-provider";

interface UnitHeader {
  unitNumber: number;
  title: string;
  skill: string;
  tier: string;
  timeRangeMin: number;
  timeRangeMax: number;
  exerciseFormat: string;
}

interface TocViewProps {
  plateItemId: string;
  startedAt: string | null;
  completedAt: string | null;
  unit: UnitHeader;
  content: LessonContent;
  itemProgress: ItemProgressRow[];
}

export function TocView({
  plateItemId,
  startedAt,
  completedAt,
  unit,
  content,
  itemProgress,
}: TocViewProps) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const { state: timerState, endIfActive } = useLessonTimer();

  // PlateItem.startedAt is now set server-side in page.tsx via
  // ensurePlateItemStarted (covers both TOC and direct item links).
  // No client-side fetch needed.

  const isAlreadyComplete = Boolean(completedAt);
  const { total, done } = itemCounts(content, itemProgress);
  const canComplete = canMarkUnitComplete(content, itemProgress);
  const progressByItem = new Map(itemProgress.map((r) => [r.itemId, r] as const));

  async function handleMarkUnitComplete() {
    if (isAlreadyComplete || !canComplete || completing) return;
    setCompleting(true);
    setCompleteError(null);

    // End any active timer first so the working minutes are credited
    // before /api/plate-items/complete fires the streak/minutes accounting.
    if (timerState !== "idle") {
      await endIfActive();
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch("/api/plate-items/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateItemId }),
        signal: controller.signal,
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) {
        setCompleteError(data.error ?? "Could not mark unit complete.");
        setCompleting(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setCompleteError("Network issue. Try again.");
      setCompleting(false);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Unit {unit.unitNumber} · {unit.tier}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                {unit.title}
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                {unit.timeRangeMin}–{unit.timeRangeMax} min · {unit.exerciseFormat}
              </p>
              <p className="mt-2 text-sm italic text-gray-700">{unit.skill}</p>
            </div>
            <LessonTimerControl />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-10">
        {isAlreadyComplete && (
          <div className="mb-8 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            You&apos;ve completed this unit. Re-entry paths (Review / Repeat /
            Deepen) ship in a later stage; for now you can walk any item
            again — your dashboard status stays as <strong>complete</strong>.
          </div>
        )}

        <section aria-labelledby="objectives-heading">
          <h2 id="objectives-heading" className="text-base font-semibold">
            What you&apos;ll be able to do
          </h2>
          <ul className="mt-3 space-y-2">
            {content.objectives.map((obj, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-800"
              >
                <Check
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-black"
                  aria-hidden="true"
                />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="items-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="items-heading" className="text-base font-semibold">
              In this unit
            </h2>
            <p className="text-xs text-gray-500" aria-live="polite">
              {done} of {total} required items done
            </p>
          </div>
          <ol className="mt-4 space-y-2">
            {content.items.map((item) => {
              const state = itemState(progressByItem.get(item.id));
              return (
                <ItemRow
                  key={item.id}
                  unitNumber={unit.unitNumber}
                  item={item}
                  state={state}
                />
              );
            })}
          </ol>
        </section>

        <section className="mt-12">
          {!isAlreadyComplete ? (
            <>
              <button
                type="button"
                onClick={handleMarkUnitComplete}
                disabled={!canComplete || completing}
                className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Marking complete…
                  </>
                ) : (
                  <>Mark unit complete</>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                {canComplete
                  ? "All required items are done — confirm to mark the unit complete."
                  : "Available once every required item is marked complete or " +
                    "'got it'."}
              </p>
              {completeError && (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  {completeError}
                </p>
              )}
            </>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-400"
            >
              Back to dashboard
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}

function ItemRow({
  unitNumber,
  item,
  state,
}: {
  unitNumber: number;
  item: LessonItem;
  state: ItemState;
}) {
  return (
    <li>
      <Link
        href={`/learn/${unitNumber}/${item.id}`}
        className="group flex items-start gap-3 rounded-md border border-gray-200 bg-white p-4 transition hover:border-gray-400"
      >
        <StateBadge state={state} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium text-gray-900">
              {item.title}
              {!item.required && (
                <span className="ml-2 text-xs font-normal italic text-gray-400">
                  optional
                </span>
              )}
            </h3>
            <p className="flex-shrink-0 text-xs text-gray-500">
              ~{item.estimatedMinutes} min
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {ITEM_STATE_LABEL[state]}
            {" · "}
            {kindLabel(item.kind)}
          </p>
        </div>
        <ArrowRight
          className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition group-hover:text-gray-600"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

function StateBadge({ state }: { state: ItemState }) {
  if (state === "complete" || state === "got_it") {
    return (
      <div
        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-black"
        aria-label={ITEM_STATE_LABEL[state]}
      >
        <Check className="h-3 w-3 text-white" aria-hidden="true" />
      </div>
    );
  }
  if (state === "in_progress") {
    return (
      <CircleDot
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-700"
        aria-label="In progress"
      />
    );
  }
  return (
    <Circle
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-300"
      aria-label="Not started"
    />
  );
}

function kindLabel(kind: string): string {
  if (kind === "read") return "Reading";
  if (kind === "exercise") return "Exercise";
  if (kind === "wrap") return "Wrap-up";
  return kind;
}
