"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import type { LessonItem, Tool } from "@/lib/lesson-content";
import type { ItemState } from "@/lib/lesson-status";
import {
  LessonTimerControl,
} from "../lesson-timer-provider";

interface ItemViewProps {
  plateItemId: string;
  unitNumber: number;
  unitTitle: string;
  item: LessonItem;
  tools: Tool[];
  goingDeeper: string;
  reflectionPrompts: string[];
  initialState: ItemState;
}

export function ItemView({
  plateItemId,
  unitNumber,
  unitTitle,
  item,
  tools,
  goingDeeper,
  reflectionPrompts,
  initialState,
}: ItemViewProps) {
  const router = useRouter();
  const [state, setState] = useState<ItemState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mark item in_progress on first entry. Idempotent on the server —
  // already-complete / already-got_it items aren't regressed.
  useEffect(() => {
    if (state === "not_started") {
      void updateStatus("in_progress", { silent: true });
      setState("in_progress");
    }
    // Intentional: fire once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(
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
        data?: { status: ItemState };
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
    const ok = await updateStatus("complete");
    if (ok) router.push(`/learn/${unitNumber}`);
  }

  async function handleGotIt() {
    const ok = await updateStatus("got_it");
    if (ok) router.push(`/learn/${unitNumber}`);
  }

  return (
    <main className="min-h-screen pb-16">
      {/* Persistent breadcrumb + timer */}
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,18rem)]">
          {/* LEFT — instruction / reading */}
          <section aria-labelledby="instruction-heading">
            <h2 id="instruction-heading" className="sr-only">
              Reading
            </h2>
            <div className="prose prose-sm prose-gray max-w-none">
              <Reading markdown={item.reading} />
            </div>
          </section>

          {/* MIDDLE — workspace (or static fallback for kind=exercise) */}
          <section aria-labelledby="workspace-heading" className="min-w-0">
            <h2
              id="workspace-heading"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              {item.kind === "exercise" ? "Workspace" : "What to do"}
            </h2>
            <div className="mt-3">
              {item.kind === "exercise" ? (
                <ExerciseFallback item={item} />
              ) : (
                <ReadOrWrapPanel
                  item={item}
                  reflectionPrompts={reflectionPrompts}
                  state={state}
                  submitting={submitting}
                  error={error}
                  onMarkDone={handleMarkDone}
                  onGotIt={handleGotIt}
                />
              )}
            </div>
          </section>

          {/* RIGHT — tools + going deeper (no AI output region in Stage 1) */}
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
        </div>

        {/* Item actions for exercise items live below the workspace fallback,
            since the fallback itself doesn't render mark-done buttons. */}
        {item.kind === "exercise" && (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleMarkDone}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {submitting && state !== "got_it" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>I&apos;ve done it</>
              )}
            </button>
            <button
              type="button"
              onClick={handleGotIt}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 disabled:opacity-40"
            >
              I got it (skip)
            </button>
            {state === "complete" || state === "got_it" ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Marked {state === "got_it" ? "'got it'" : "complete"}
              </span>
            ) : null}
            {error && (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ReadOrWrapPanel({
  item,
  reflectionPrompts,
  state,
  submitting,
  error,
  onMarkDone,
  onGotIt,
}: {
  item: LessonItem;
  reflectionPrompts: string[];
  state: ItemState;
  submitting: boolean;
  error: string | null;
  onMarkDone: () => void;
  onGotIt: () => void;
}) {
  const showReflectionPrompts = item.id === "reflect" && reflectionPrompts.length > 0;

  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-900">
        You&apos;re ready when you can answer:
      </p>
      {item.selfTest.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {item.selfTest.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span
                className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-gray-400"
                aria-hidden="true"
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-gray-500">
          No self-check on this item.
        </p>
      )}

      {showReflectionPrompts && (
        <>
          <hr className="my-5 border-gray-200" />
          <p className="text-sm font-medium text-gray-900">Reflection prompts</p>
          <ul className="mt-3 space-y-2">
            {reflectionPrompts.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span
                  className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-gray-400"
                  aria-hidden="true"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs italic text-gray-500">
            Answers persist in a future revision — for now, take them honestly
            to yourself.
          </p>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onMarkDone}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {submitting && state !== "got_it" ? (
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
    </div>
  );
}

function ExerciseFallback({ item }: { item: LessonItem }) {
  if (!item.exercise) {
    return (
      <p className="text-sm italic text-gray-500">
        Exercise content missing.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {/* Stage-1 callout: workspace coming in Stage 2. */}
      <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm font-medium text-yellow-900">
          Workspace coming next
        </p>
        <p className="mt-1 text-xs leading-relaxed text-yellow-900">
          For now, work this exercise in your AI assistant of choice
          (Claude, ChatGPT, Gemini, Copilot) using the scaffolded material
          below. The in-app workspace lands in the next build stage.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Instructions
        </h3>
        <p className="mt-2 text-sm text-gray-800">{item.exercise.instructions}</p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Pick a task
        </h3>
        <ul className="mt-2 space-y-2">
          {item.exercise.scaffoldedTasks.map((t) => (
            <li
              key={t.id}
              className="rounded-md border border-gray-200 bg-white p-3"
            >
              <p className="text-xs font-medium text-gray-500">{t.audience}</p>
              <p className="mt-1 text-sm text-gray-800">{t.task}</p>
            </li>
          ))}
        </ul>
      </div>

      {item.exercise.scaffoldedRounds.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Run it two ways
          </h3>
          <ol className="mt-2 space-y-2">
            {item.exercise.scaffoldedRounds.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <p className="text-sm font-medium text-gray-800">{r.label}</p>
                <p className="mt-1 text-sm text-gray-700">{r.instructions}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// Minimal markdown render — supports level-2 headings (## ...) and
// paragraphs separated by blank lines. The content shape only uses
// these two constructs in Stage 1; a real markdown renderer is
// overkill until later units need richer formatting.
function Reading({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h3 key={i} className="mt-6 text-base font-semibold text-gray-900">
              {block.slice(3).trim()}
            </h3>
          );
        }
        return (
          <p key={i} className="mt-4 text-sm leading-relaxed text-gray-800">
            {block}
          </p>
        );
      })}
    </>
  );
}
