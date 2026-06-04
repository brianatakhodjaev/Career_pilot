"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Send, History as HistoryIcon, Sparkles } from "lucide-react";
import type { Exercise, ScaffoldedTask, ScaffoldedRound } from "@/lib/lesson-content";
import type { HistoryEntry } from "@/lib/workspace-history";
import { MarkdownView } from "@/lib/markdown";

// Amendment 6 §15.4 — the in-app workspace.
//
// Per Decision I (right column wrap-only), the exercise item's middle
// region spans the normal middle + right grid columns and the
// workspace renders task picker → active-round panel → output →
// history → self-test all inline. The §15.3 "output in right region"
// wording becomes "output inline below the prompt" — same effect,
// simpler layout, and matches the wrap-only resources decision.
//
// Per Decision F, Compare-format exercises advance round-by-round:
// pick task → Round 1 prompt → Run → output → Continue → Round 2
// prompt → Run → output → exercise-tail self-test (rendered by
// item-view below).

interface WorkspaceProps {
  plateItemId: string;
  itemId: string;
  exercise: Exercise;
  initialSelectedTaskId: string | null;
  initialCurrentPrompt: string;
  initialHistory: HistoryEntry[];
  // Amendment 6 Stage 3 — when set, the workspace renders this single
  // AI-generated task instead of the scaffolded ones. Comes from
  // /api/workspace/deepen.
  customTask: { audience: string; task: string } | null;
  // Item-view passes a hook for "this exercise has produced at least
  // its first run on its last round" — used to decide when the
  // exercise-tail self-test should render in the parent.
  onProgress?: (state: ExerciseProgressState) => void;
}

export interface ExerciseProgressState {
  hasRunAnyRound: boolean;
  hasRunAllRounds: boolean;
}

// State autosave debounce for non-run state (selectedTaskId,
// currentPrompt). 500ms matches the reflection form (Decision G).
const STATE_AUTOSAVE_MS = 500;

export function Workspace({
  plateItemId,
  itemId,
  exercise,
  initialSelectedTaskId,
  initialCurrentPrompt,
  initialHistory,
  customTask,
  onProgress,
}: WorkspaceProps) {
  const isDeepenMode = customTask !== null;
  // In Deepen mode the task is fixed (the AI-generated one); we still
  // hold a selectedTaskId locally for the autosave hook, but ignore it
  // for rendering.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    isDeepenMode ? "deepen" : initialSelectedTaskId,
  );
  const [currentPrompt, setCurrentPrompt] = useState<string>(initialCurrentPrompt);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);

  // Round model: Compare exercises have scaffoldedRounds; non-Compare
  // have empty rounds and we treat the whole exercise as one round.
  const rounds = exercise.scaffoldedRounds;
  const hasRounds = rounds.length > 0;

  // Which round is "active" right now?
  // - If history has any entry with roundId == last round's id → active = last round
  // - Else if history has an entry with the first round's id AND user has clicked
  //   "Continue to Round N+1" → active = next round
  // - Else → active = round 0
  // We track "userAdvancedToRoundIndex" in component state since it's a
  // UI-only flag (no server persistence needed).
  const [userAdvancedToRoundIndex, setUserAdvancedToRoundIndex] = useState<number>(
    () => {
      if (!hasRounds) return 0;
      // On mount, derive from history: highest roundId seen.
      const seenIndices = history
        .map((h) => rounds.findIndex((r) => r.id === h.roundId))
        .filter((i) => i >= 0);
      return seenIndices.length === 0 ? 0 : Math.max(...seenIndices);
    },
  );

  const activeRound: ScaffoldedRound | null = hasRounds
    ? rounds[userAdvancedToRoundIndex] ?? rounds[0]
    : null;
  const activeRoundId = activeRound?.id ?? null;

  const historyForActiveRound = useMemo(
    () => history.filter((h) => (hasRounds ? h.roundId === activeRoundId : true)),
    [history, hasRounds, activeRoundId],
  );

  const canAdvanceToNextRound =
    hasRounds &&
    userAdvancedToRoundIndex < rounds.length - 1 &&
    history.some((h) => h.roundId === activeRoundId);

  const hasRunAnyRound = history.length > 0;
  const hasRunAllRounds = hasRounds
    ? rounds.every((r) => history.some((h) => h.roundId === r.id))
    : history.length > 0;

  // Surface progress upward so the item-view can decide when the
  // exercise-tail self-test should appear.
  useEffect(() => {
    onProgress?.({ hasRunAnyRound, hasRunAllRounds });
  }, [hasRunAnyRound, hasRunAllRounds, onProgress]);

  // Autosave non-run state (selectedTaskId, currentPrompt) to
  // /api/workspace/state with debounce. Skip the first render so we
  // don't immediately re-save what we just loaded.
  const isFirstStateRender = useRef(true);
  useEffect(() => {
    if (isFirstStateRender.current) {
      isFirstStateRender.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void fetch("/api/workspace/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateItemId,
          itemId,
          selectedTaskId,
          currentPrompt,
        }),
      }).catch(() => {
        // Autosave failure is silent — next save retries.
      });
    }, STATE_AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [plateItemId, itemId, selectedTaskId, currentPrompt]);

  async function handleRun() {
    if (isStreaming) return;
    if (!currentPrompt.trim()) return;
    if (hasRounds && !selectedTaskId) return;

    setIsStreaming(true);
    setStreamingText("");
    setStreamError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch("/api/workspace/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateItemId,
          itemId,
          prompt: currentPrompt,
          scaffoldedTaskId: selectedTaskId,
          roundId: activeRoundId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
        setStreamError(errBody.error ?? `HTTP ${res.status}`);
        setIsStreaming(false);
        return;
      }
      if (!res.body) {
        setStreamError("Empty response body");
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setStreamingText(acc);
      }

      const completedAt = new Date().toISOString();
      setHistory((prev) => [
        ...prev,
        {
          prompt: currentPrompt,
          response: acc,
          runAt: completedAt,
          roundId: activeRoundId,
        },
      ]);
      // Stage 3 Bug 2 fix: preserve the prompt after Run. The server
      // also no longer clears currentPrompt on history append, so the
      // user can edit and re-run without retyping.
      setStreamingText("");
      setIsStreaming(false);
    } catch (err) {
      console.error("[workspace] run failed", err);
      setStreamError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Run took too long. Try a shorter prompt or try again."
          : "Something went wrong. Try again.",
      );
      setIsStreaming(false);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function handleAdvanceRound() {
    if (!canAdvanceToNextRound) return;
    setUserAdvancedToRoundIndex((i) => Math.min(i + 1, rounds.length - 1));
    setCurrentPrompt("");
  }

  return (
    <div className="space-y-6">
      {isDeepenMode && customTask ? (
        <DeepenTaskCard
          customTask={customTask}
          plateItemId={plateItemId}
          itemId={itemId}
          disabled={isStreaming}
        />
      ) : (
        <TaskPicker
          tasks={exercise.scaffoldedTasks}
          selectedTaskId={selectedTaskId}
          onSelect={setSelectedTaskId}
          disabled={isStreaming}
        />
      )}

      {selectedTaskId && (
        <>
          {hasRounds && activeRound && (
            <RoundHeader
              round={activeRound}
              roundIndex={userAdvancedToRoundIndex}
              totalRounds={rounds.length}
              roundNoun={exercise.roundNoun}
            />
          )}

          {hasRounds && userAdvancedToRoundIndex > 0 && (
            <PriorRoundsSummary
              rounds={rounds.slice(0, userAdvancedToRoundIndex)}
              history={history}
              roundNounPlural={exercise.roundNounPlural}
              roundNoun={exercise.roundNoun}
            />
          )}

          <PromptArea
            value={currentPrompt}
            onChange={setCurrentPrompt}
            onRun={handleRun}
            isStreaming={isStreaming}
            disabled={hasRounds && !selectedTaskId}
          />

          {streamError && (
            <p className="text-xs text-red-600" role="alert">
              {streamError}
            </p>
          )}

          <OutputArea
            isStreaming={isStreaming}
            streamingText={streamingText}
            historyForActiveRound={historyForActiveRound}
            roundNoun={exercise.roundNoun}
          />

          {canAdvanceToNextRound && (
            // Stage 3 Bug 3 fix: full-width on mobile, larger
            // vertical padding, top margin, and a subtitle line so the
            // button reads as a deliberate next step instead of a
            // quiet control. Hit-target ~doubles vs Stage 2.
            //
            // Unit 02 walk fix: noun is now data-driven via
            // exercise.roundNoun. The "better-briefed" framing was
            // Compare-specific and is dropped — the generic
            // "{noun} N done. Continue to {noun} N+1 when ready."
            // works across formats.
            <div className="mt-4 rounded-md border border-gray-300 bg-white p-4">
              <p className="text-sm text-gray-700">
                {exercise.roundNoun} {userAdvancedToRoundIndex + 1} done.
                Continue to {exercise.roundNoun} {userAdvancedToRoundIndex + 2}{" "}
                when ready.
              </p>
              <button
                type="button"
                onClick={handleAdvanceRound}
                disabled={isStreaming}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-gray-50 disabled:opacity-40 sm:w-auto sm:min-w-48"
              >
                Continue to {exercise.roundNoun} {userAdvancedToRoundIndex + 2}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DeepenTaskCard({
  customTask,
  plateItemId,
  itemId,
  disabled,
}: {
  customTask: { audience: string; task: string };
  plateItemId: string;
  itemId: string;
  disabled: boolean;
}) {
  const [resetting, setResetting] = useState(false);

  async function backToScaffolded() {
    setResetting(true);
    try {
      // Polish fix (Stage 3 walk): full wipe of WorkspaceState
      // (selectedTaskId, currentPrompt, promptHistory, customTask) but
      // resetProgress=false so the user's LessonItemProgress on this
      // exercise item is left alone — they're escaping the variation,
      // not asking to redo the exercise.
      await fetch("/api/workspace/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateItemId, itemId, resetProgress: false }),
      });
      window.location.reload();
    } catch {
      setResetting(false);
    }
  }

  return (
    <div>
      <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Fresh variation
      </h3>
      <div className="mt-2 rounded-md border border-black bg-gray-50 p-4">
        <p className="text-xs font-medium text-gray-500">
          {customTask.audience}
        </p>
        {/* Polish fix (Stage 3 walk): render through MarkdownView so
            generated tasks containing **bold**, lists, etc. format
            properly. Without this, "**Round 1 (3-4 minutes):**" shows
            as raw asterisks. */}
        <div className="mt-1">
          <MarkdownView text={customTask.task} formatted={true} />
        </div>
      </div>
      <button
        type="button"
        onClick={backToScaffolded}
        disabled={disabled || resetting}
        className="mt-2 text-xs text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline disabled:opacity-50"
      >
        {resetting ? "Resetting…" : "Back to scaffolded tasks"}
      </button>
    </div>
  );
}

function TaskPicker({
  tasks,
  selectedTaskId,
  onSelect,
  disabled,
}: {
  tasks: ScaffoldedTask[];
  selectedTaskId: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Pick a task
      </h3>
      <div className="mt-2 grid grid-cols-1 gap-2">
        {tasks.map((t) => {
          const isSelected = t.id === selectedTaskId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`rounded-md border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 ${
                isSelected
                  ? "border-black bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <p className="text-xs font-medium text-gray-500">{t.audience}</p>
              <p className="mt-1 text-sm text-gray-800">{t.task}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoundHeader({
  round,
  roundIndex,
  totalRounds,
  roundNoun,
}: {
  round: ScaffoldedRound;
  roundIndex: number;
  totalRounds: number;
  roundNoun: string;
}) {
  return (
    <div className="rounded-md border-l-2 border-black bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-gray-500">
        {roundNoun} {roundIndex + 1} of {totalRounds}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{round.label}</p>
      <p className="mt-1 text-sm text-gray-700">{round.instructions}</p>
    </div>
  );
}

function PriorRoundsSummary({
  rounds,
  history,
  roundNoun,
  roundNounPlural,
}: {
  rounds: ScaffoldedRound[];
  history: HistoryEntry[];
  roundNoun: string;
  roundNounPlural: string;
}) {
  return (
    <details className="rounded-md border border-gray-200 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
        Earlier {roundNounPlural.toLowerCase()} ({rounds.length})
      </summary>
      <div className="space-y-4 px-3 py-3">
        {rounds.map((r) => {
          const lastEntry = [...history]
            .reverse()
            .find((h) => h.roundId === r.id);
          return (
            <div key={r.id}>
              <p className="text-xs font-semibold text-gray-800">{r.label}</p>
              {lastEntry ? (
                <>
                  <p className="mt-1 text-xs text-gray-500">Your prompt:</p>
                  <p className="mt-0.5 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-800">
                    {lastEntry.prompt}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">Output:</p>
                  <div className="mt-0.5 rounded bg-gray-50 p-2">
                    <MarkdownView text={lastEntry.response} formatted={true} />
                  </div>
                </>
              ) : (
                <p className="mt-1 text-xs italic text-gray-400">
                  No runs recorded for this {roundNoun.toLowerCase()}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function PromptArea({
  value,
  onChange,
  onRun,
  isStreaming,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  isStreaming: boolean;
  disabled: boolean;
}) {
  return (
    <div>
      <label
        htmlFor="workspace-prompt"
        className="block text-xs font-semibold uppercase tracking-wider text-gray-500"
      >
        Your prompt
      </label>
      <textarea
        id="workspace-prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        disabled={isStreaming || disabled}
        placeholder="Write your prompt to the AI assistant here."
        className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-50"
      />
      <div className="mt-3">
        <button
          type="button"
          onClick={onRun}
          disabled={isStreaming || disabled || value.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {isStreaming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Running…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function OutputArea({
  isStreaming,
  streamingText,
  historyForActiveRound,
  roundNoun,
}: {
  isStreaming: boolean;
  streamingText: string;
  historyForActiveRound: HistoryEntry[];
  roundNoun: string;
}) {
  const latest = historyForActiveRound[historyForActiveRound.length - 1];
  const earlier = historyForActiveRound.slice(0, -1);

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <Send className="h-3 w-3" aria-hidden="true" />
        Output
      </div>

      {isStreaming && (
        // Stage 3 Bug 1: while streaming, render plain whitespace-
        // preserving text (incremental markdown parse on partial text
        // jitters with half-closed bold and dangling list markers).
        // The MarkdownView in formatted=false mode handles that.
        <div className="mt-2 rounded-md border border-gray-200 bg-white p-3">
          {streamingText ? (
            <MarkdownView text={streamingText} formatted={false} />
          ) : (
            <p className="text-sm italic text-gray-400">Generating…</p>
          )}
          <span
            className="ml-1 inline-block h-3 w-2 animate-pulse bg-gray-700 align-middle"
            aria-hidden="true"
          />
        </div>
      )}

      {!isStreaming && latest && (
        <div className="mt-2 rounded-md border border-gray-200 bg-white p-4">
          <MarkdownView text={latest.response} formatted={true} />
        </div>
      )}

      {!isStreaming && !latest && (
        <p className="mt-2 text-sm italic text-gray-400">
          Run your prompt to see the output here.
        </p>
      )}

      {earlier.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900">
            <HistoryIcon className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {earlier.length} earlier run{earlier.length === 1 ? "" : "s"} in this {roundNoun.toLowerCase()}
          </summary>
          <div className="mt-2 space-y-3">
            {earlier
              .slice()
              .reverse()
              .map((h, i) => (
                <div
                  key={`${h.runAt}-${i}`}
                  className="rounded border border-gray-200 bg-gray-50 p-2"
                >
                  <p className="text-xs font-medium text-gray-500">Prompt</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-gray-800">
                    {h.prompt}
                  </p>
                  <p className="mt-2 text-xs font-medium text-gray-500">Output</p>
                  <div className="mt-0.5">
                    <MarkdownView text={h.response} formatted={true} />
                  </div>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
