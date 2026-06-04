"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import type { LessonItem, Tool } from "@/lib/lesson-content";
import type { ItemState } from "@/lib/lesson-status";
import type { HistoryEntry } from "@/lib/workspace-history";
import { LessonTimerControl } from "../lesson-timer-provider";
import { Workspace, type ExerciseProgressState } from "./workspace";
import { ReflectionForm } from "./reflection-form";

interface ItemViewProps {
  plateItemId: string;
  unitNumber: number;
  unitTitle: string;
  item: LessonItem;
  tools: Tool[];
  goingDeeper: string;
  reflectionPrompts: string[];
  initialState: ItemState;
  workspaceInitial: {
    selectedTaskId: string | null;
    currentPrompt: string;
    history: HistoryEntry[];
  };
  reflectionInitial: Record<string, string>;
}

// Amendment 6 Stage 2 — item view with the live workspace, reflection
// persistence, exercise-tail self-test, and the four polish items:
//
// Polish 1: completion buttons standardized into the middle column
//   under the self-test on every kind.
// Polish 2: Reading markdown supports **bold** (was missing — privacy
//   note showed literal asterisks on the exercise item in Stage 1).
// Polish 3: resources column (Tools + Going Deeper) renders only on
//   kind="wrap" (Decision I).

export function ItemView({
  plateItemId,
  unitNumber,
  unitTitle,
  item,
  tools,
  goingDeeper,
  reflectionPrompts,
  initialState,
  workspaceInitial,
  reflectionInitial,
}: ItemViewProps) {
  const router = useRouter();
  const [state, setState] = useState<ItemState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise items only reveal the exercise-tail self-test + completion
  // buttons once the workspace has produced at least one run on each
  // round (or any run if the exercise has no rounds).
  const [exerciseProgress, setExerciseProgress] =
    useState<ExerciseProgressState>(() => ({
      hasRunAnyRound: workspaceInitial.history.length > 0,
      hasRunAllRounds: deriveHasRunAllRounds(item, workspaceInitial.history),
    }));
  const handleExerciseProgress = useCallback(
    (next: ExerciseProgressState) => setExerciseProgress(next),
    [],
  );

  // First-entry mark in_progress.
  if (state === "not_started") {
    // Set immediately on render — server-side ensurePlateItemStarted
    // covers PlateItem.startedAt; this covers per-item in_progress.
    void markStatus("in_progress", { silent: true });
    setState("in_progress");
  }

  async function markStatus(
    next: "in_progress" | "complete" | "got_it",
    opts?: { silent?: boolean },
  ) {
    if (!opts?.silent) {
      setSubmitting(true);
      setError(null);
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch("/api/lesson-items/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateItemId, itemId: item.id, status: next }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!data.success) {
        if (!opts?.silent) {
          setError(data.error ?? "Could not save progress.");
          setSubmitting(false);
        }
        return false;
      }
      setState(next);
      return true;
    } catch {
      if (!opts?.silent) {
        setError("Network issue. Try again.");
        setSubmitting(false);
      }
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function handleMarkDone() {
    const ok = await markStatus("complete");
    if (ok) router.push(`/learn/${unitNumber}`);
  }

  async function handleGotIt() {
    const ok = await markStatus("got_it");
    if (ok) router.push(`/learn/${unitNumber}`);
  }

  // Layout: wrap items get the 3-column grid (instruction / middle /
  // resources); other kinds use a 2-column grid (instruction / wider
  // middle). Resources are wrap-only per Decision I.
  const isWrap = item.kind === "wrap";

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <nav
              className="flex min-w-0 items-center gap-2 text-xs text-gray-500"
              aria-label="Breadcrumb"
            >
              <Link
                href={`/learn/${unitNumber}`}
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-gray-900 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to TOC
              </Link>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                <span className="text-gray-700">{unitTitle}</span>
                <span className="mx-1.5 text-gray-300">›</span>
                <span className="text-gray-900">{item.title}</span>
              </span>
            </nav>
            <LessonTimerControl />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div
          className={
            isWrap
              ? "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,18rem)]"
              : "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
          }
        >
          <section aria-labelledby="instruction-heading">
            <h2 id="instruction-heading" className="sr-only">
              Reading
            </h2>
            <div className="prose prose-sm prose-gray max-w-none">
              <Reading markdown={item.reading} />
            </div>
          </section>

          <section aria-labelledby="middle-heading" className="min-w-0">
            <h2
              id="middle-heading"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              {middleColumnHeading(item)}
            </h2>
            <div className="mt-3 space-y-6">
              {item.kind === "exercise" && (
                <Workspace
                  plateItemId={plateItemId}
                  itemId={item.id}
                  exercise={item.exercise!}
                  initialSelectedTaskId={workspaceInitial.selectedTaskId}
                  initialCurrentPrompt={workspaceInitial.currentPrompt}
                  initialHistory={workspaceInitial.history}
                  onProgress={handleExerciseProgress}
                />
              )}

              {item.id === "reflect" && (
                <ReflectionForm
                  plateItemId={plateItemId}
                  prompts={reflectionPrompts}
                  initialAnswers={reflectionInitial}
                />
              )}

              {/* Self-test renders below the substantive work for all
                  kinds. For exercises it's gated on hasRunAllRounds. */}
              {shouldShowSelfTest(item, exerciseProgress) && (
                <SelfTestBlock selfTest={item.selfTest} />
              )}

              {/* Completion buttons standardized in the middle column
                  for all kinds (Polish 1). Gated on the same
                  exercise-progress check as the self-test. */}
              {shouldShowCompletionButtons(item, exerciseProgress) && (
                <CompletionButtons
                  state={state}
                  submitting={submitting}
                  error={error}
                  onMarkDone={handleMarkDone}
                  onGotIt={handleGotIt}
                />
              )}
            </div>
          </section>

          {isWrap && (
            <aside aria-labelledby="aside-heading" className="min-w-0">
              <h2 id="aside-heading" className="sr-only">
                Resources
              </h2>
              <div className="space-y-6">
                {tools.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Tools
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-gray-700">
                      {tools.map((t) => (
                        <li key={t.name}>
                          <span className="font-medium">{t.name}</span>
                          <span className="text-gray-500"> · {t.vendor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {goingDeeper && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Going deeper
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-700">
                      {goingDeeper}
                    </p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}

function middleColumnHeading(item: LessonItem): string {
  if (item.kind === "exercise") return "Workspace";
  if (item.id === "reflect") return "Your reflection";
  return "What to do";
}

function shouldShowSelfTest(
  item: LessonItem,
  progress: ExerciseProgressState,
): boolean {
  if (item.selfTest.length === 0) return false;
  if (item.kind === "exercise") return progress.hasRunAllRounds;
  return true;
}

function shouldShowCompletionButtons(
  item: LessonItem,
  progress: ExerciseProgressState,
): boolean {
  if (item.kind === "exercise") return progress.hasRunAllRounds;
  return true;
}

function deriveHasRunAllRounds(
  item: LessonItem,
  history: HistoryEntry[],
): boolean {
  if (item.kind !== "exercise" || !item.exercise) return false;
  const rounds = item.exercise.scaffoldedRounds;
  if (rounds.length === 0) return history.length > 0;
  return rounds.every((r) => history.some((h) => h.roundId === r.id));
}

function SelfTestBlock({ selfTest }: { selfTest: string[] }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">
        You&apos;re ready when you can answer:
      </p>
      <ul className="mt-3 space-y-2">
        {selfTest.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span
              className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-gray-400"
              aria-hidden="true"
            />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompletionButtons({
  state,
  submitting,
  error,
  onMarkDone,
  onGotIt,
}: {
  state: ItemState;
  submitting: boolean;
  error: string | null;
  onMarkDone: () => void;
  onGotIt: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onMarkDone}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          <>I&apos;ve checked</>
        )}
      </button>
      <button
        type="button"
        onClick={onGotIt}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 disabled:opacity-40"
      >
        I got it (skip)
      </button>
      {(state === "complete" || state === "got_it") && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Marked {state === "got_it" ? "'got it'" : "complete"}
        </span>
      )}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Minimal markdown render. Supports level-2 headings (## ...),
// paragraphs separated by blank lines, and inline **bold** (Polish 2 —
// the exercise item's "**Privacy note.**" was rendering literal
// asterisks in Stage 1).
function Reading({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h3 key={i} className="mt-6 text-base font-semibold text-gray-900">
              {renderInline(block.slice(3).trim())}
            </h3>
          );
        }
        return (
          <p key={i} className="mt-4 text-sm leading-relaxed text-gray-800">
            {renderInline(block)}
          </p>
        );
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** runs; even indices are plain text, odd indices
  // are bold contents. Keeps the regex tiny and predictable.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-gray-900">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
