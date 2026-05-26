"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Pause,
  Play,
} from "lucide-react";

// ---------- types ----------

interface UnitContent {
  whyThisMatters: string;
  teaching: Array<{ id: string; title: string; body: string }>;
  exercise: {
    format: string;
    intro: string;
    privacyNote: string;
    scaffoldTasks: Array<{ audience: string; task: string }>;
    rounds: Array<{ label: string; instructions: string }>;
    outro: string;
  };
  reflection: string[];
  successCheck: string;
  tools: Array<{ name: string; vendor: string }>;
  toolsNote: string;
  goingDeeper: string;
}

export interface LessonUnit {
  unitNumber: number;
  title: string;
  skill: string;
  tier: string;
  timeRangeMin: number;
  timeRangeMax: number;
  exerciseFormat: string;
  content: UnitContent;
}

export interface LessonProps {
  plateItemId: string;
  startedAt: string | null;
  completedAt: string | null;
  unit: LessonUnit;
}

const STEPS = ["why", "teaching", "exercise", "reflection", "wrapup"] as const;
type Step = (typeof STEPS)[number];

type TimerState = "idle" | "running" | "paused";

function reflectionStorageKey(plateItemId: string): string {
  return `careerpilot:lesson:${plateItemId}:reflection`;
}

// ---------- component ----------

export function LessonView({ plateItemId, startedAt, completedAt, unit }: LessonProps) {
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep: Step = STEPS[stepIndex];

  const [reflectionAnswers, setReflectionAnswers] = useState<string[]>(() =>
    unit.content.reflection.map(() => ""),
  );

  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [tickNow, setTickNow] = useState<number>(() => Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [completing, setCompleting] = useState(false);

  const isAlreadyComplete = Boolean(completedAt);

  // Mark started + rehydrate reflection answers from sessionStorage.
  // Runs once on mount.
  useEffect(() => {
    if (!completedAt && !startedAt) {
      void fetch("/api/plate-items/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateItemId }),
      });
    }
    try {
      const raw = sessionStorage.getItem(reflectionStorageKey(plateItemId));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.length === unit.content.reflection.length &&
          parsed.every((a) => typeof a === "string")
        ) {
          setReflectionAnswers(parsed as string[]);
        }
      }
    } catch {
      // ignore
    }
    // Intentional: only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer ticker — only runs while running.
  useEffect(() => {
    if (timerState !== "running") return;
    const id = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timerState]);

  const elapsedMs =
    timerState === "running" && startTs != null
      ? accumulatedMs + (tickNow - startTs)
      : accumulatedMs;

  async function handleTimerStart() {
    const res = await fetch("/api/sessions/start", { method: "POST" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      success: boolean;
      data?: { sessionId: string };
    };
    if (!data.success || !data.data) return;
    setSessionId(data.data.sessionId);
    setStartTs(Date.now());
    setTickNow(Date.now());
    setTimerState("running");
  }

  function handleTimerPause() {
    if (startTs == null) return;
    const slice = Date.now() - startTs;
    setAccumulatedMs((prev) => prev + slice);
    setStartTs(null);
    setTimerState("paused");
  }

  function handleTimerResume() {
    setStartTs(Date.now());
    setTickNow(Date.now());
    setTimerState("running");
  }

  function updateReflection(index: number, value: string) {
    setReflectionAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      try {
        sessionStorage.setItem(
          reflectionStorageKey(plateItemId),
          JSON.stringify(next),
        );
      } catch {
        // ignore — private mode, etc.
      }
      return next;
    });
  }

  async function handleComplete() {
    if (isAlreadyComplete) return;
    setCompleting(true);

    // If there's an active or paused session, end it with the working time.
    let finalMs = accumulatedMs;
    if (timerState === "running" && startTs != null) {
      finalMs += Date.now() - startTs;
    }
    if (sessionId) {
      const workingTimeMin = Math.max(0, Math.round(finalMs / 60_000));
      await fetch("/api/sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, workingTimeMin }),
      });
    }

    const res = await fetch("/api/plate-items/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plateItemId }),
    });
    if (!res.ok) {
      setCompleting(false);
      return;
    }

    // Reflection answers are sessionStorage-only by spec (§15.4 future-
    // enhancement note). Clear them so a re-open of this unit is fresh.
    try {
      sessionStorage.removeItem(reflectionStorageKey(plateItemId));
    } catch {
      // ignore
    }

    router.push("/dashboard");
  }

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <main className="min-h-screen pb-16">
      {/* Sticky header: unit meta + persistent timer + step indicator */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Unit {unit.unitNumber} · {unit.tier}
              </p>
              <h1 className="mt-1 text-base font-semibold">{unit.title}</h1>
              <p className="mt-1 text-xs text-gray-500">
                {unit.timeRangeMin}–{unit.timeRangeMax} min · {unit.exerciseFormat}
              </p>
              <p className="mt-1 text-xs italic text-gray-600">{unit.skill}</p>
            </div>
            <TimerPanel
              state={timerState}
              elapsedMs={elapsedMs}
              onStart={handleTimerStart}
              onPause={handleTimerPause}
              onResume={handleTimerResume}
            />
          </div>
          <StepIndicator current={stepIndex + 1} total={STEPS.length} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-8">
        {isAlreadyComplete && currentStep !== "wrapup" && (
          <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            You&apos;ve already completed this unit. Walking it again won&apos;t
            change your dashboard status.
          </div>
        )}

        {currentStep === "why" && <WhyStep content={unit.content.whyThisMatters} />}
        {currentStep === "teaching" && (
          <TeachingStep teaching={unit.content.teaching} />
        )}
        {currentStep === "exercise" && (
          <ExerciseStep exercise={unit.content.exercise} />
        )}
        {currentStep === "reflection" && (
          <ReflectionStep
            prompts={unit.content.reflection}
            answers={reflectionAnswers}
            onAnswerChange={updateReflection}
          />
        )}
        {currentStep === "wrapup" && (
          <WrapupStep
            successCheck={unit.content.successCheck}
            tools={unit.content.tools}
            toolsNote={unit.content.toolsNote}
            goingDeeper={unit.content.goingDeeper}
            isComplete={isAlreadyComplete}
            completing={completing}
            onComplete={handleComplete}
          />
        )}

        {/* Step navigation (Back / Continue). The wrap-up step uses
            "Mark this unit complete" instead of Continue — Back only. */}
        {currentStep !== "wrapup" ? (
          <div className="mt-12 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 text-sm text-gray-600 underline underline-offset-4 transition hover:text-gray-900 disabled:cursor-default disabled:text-gray-300 disabled:no-underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 text-sm text-gray-600 underline underline-offset-4 transition hover:text-gray-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- subcomponents ----------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition ${
              i < current ? "bg-black" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Step {current} of {total}
      </p>
    </div>
  );
}

function TimerPanel({
  state,
  elapsedMs,
  onStart,
  onPause,
  onResume,
}: {
  state: TimerState;
  elapsedMs: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <div className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-right">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">Session</p>
      {state === "idle" ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-black underline underline-offset-2 hover:no-underline"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Start
        </button>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">
            {formatStopwatch(elapsedMs)}
          </span>
          {state === "running" ? (
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause session timer"
              className="text-gray-700 transition hover:text-black"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onResume}
              aria-label="Resume session timer"
              className="text-gray-700 transition hover:text-black"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WhyStep({ content }: { content: string }) {
  return (
    <section aria-labelledby="why-heading">
      <h2 id="why-heading" className="text-2xl font-semibold tracking-tight">
        Why this matters
      </h2>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-800">
        {content.split(/\n\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}

function TeachingStep({
  teaching,
}: {
  teaching: Array<{ id: string; title: string; body: string }>;
}) {
  return (
    <section aria-labelledby="teaching-heading">
      <h2 id="teaching-heading" className="text-2xl font-semibold tracking-tight">
        The teaching
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {teaching.length} ideas. Read them through — you&apos;ll apply them in
        the exercise.
      </p>
      <ol className="mt-8 space-y-4">
        {teaching.map((point, i) => (
          <li
            key={point.id}
            className="rounded-md border border-gray-200 bg-white p-5"
          >
            <h3 className="text-base font-semibold">
              {i + 1}. {point.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              {point.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ExerciseStep({ exercise }: { exercise: UnitContent["exercise"] }) {
  return (
    <section aria-labelledby="exercise-heading">
      <h2 id="exercise-heading" className="text-2xl font-semibold tracking-tight">
        The exercise
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-gray-800">
        {exercise.intro}
      </p>

      <div className="mt-6 rounded-md border-l-2 border-black bg-gray-50 px-4 py-3 text-sm text-gray-800">
        <strong className="font-medium">Privacy note.</strong>{" "}
        {exercise.privacyNote}
      </div>

      <h3 className="mt-10 text-base font-semibold">Pick a task</h3>
      <p className="mt-1 text-sm text-gray-600">
        Choose whichever fits your work most closely.
      </p>
      <ul className="mt-4 space-y-3">
        {exercise.scaffoldTasks.map((task, i) => (
          <li
            key={i}
            className="rounded-md border border-gray-200 bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wider text-gray-500">
              {task.audience}
            </p>
            <p className="mt-1 text-sm text-gray-800">{task.task}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-10 text-base font-semibold">Run it two ways</h3>
      <ol className="mt-4 space-y-3">
        {exercise.rounds.map((round, i) => (
          <li
            key={i}
            className="rounded-md border border-gray-200 bg-white p-4"
          >
            <p className="text-sm font-semibold">{round.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              {round.instructions}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-sm leading-relaxed text-gray-800">
        {exercise.outro}
      </p>
    </section>
  );
}

function ReflectionStep({
  prompts,
  answers,
  onAnswerChange,
}: {
  prompts: string[];
  answers: string[];
  onAnswerChange: (index: number, value: string) => void;
}) {
  return (
    <section aria-labelledby="reflection-heading">
      <h2
        id="reflection-heading"
        className="text-2xl font-semibold tracking-tight"
      >
        Reflection
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        60 seconds before you close. These turn the exercise into a workplace
        habit.
      </p>
      <div className="mt-8 space-y-6">
        {prompts.map((prompt, i) => (
          <div key={i}>
            <label
              htmlFor={`reflection-${i}`}
              className="block text-sm font-medium text-gray-900"
            >
              {prompt}
            </label>
            <textarea
              id={`reflection-${i}`}
              value={answers[i] ?? ""}
              onChange={(e) => onAnswerChange(i, e.target.value)}
              rows={3}
              className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-gray-500">
        Your answers stay in this browser session only — they don&apos;t leave
        your device.
      </p>
    </section>
  );
}

function WrapupStep({
  successCheck,
  tools,
  toolsNote,
  goingDeeper,
  isComplete,
  completing,
  onComplete,
}: {
  successCheck: string;
  tools: Array<{ name: string; vendor: string }>;
  toolsNote: string;
  goingDeeper: string;
  isComplete: boolean;
  completing: boolean;
  onComplete: () => void;
}) {
  return (
    <section aria-labelledby="wrapup-heading">
      <h2 id="wrapup-heading" className="text-2xl font-semibold tracking-tight">
        How you&apos;ll know it worked
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-gray-800">{successCheck}</p>

      <h3 className="mt-10 text-base font-semibold">Tools for this unit</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {tools.map((tool) => (
          <li
            key={tool.name}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs"
          >
            <span className="font-medium">{tool.name}</span>
            <span className="text-gray-500"> · {tool.vendor}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-gray-700">{toolsNote}</p>

      <h3 className="mt-10 text-base font-semibold">Going deeper</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{goingDeeper}</p>

      <div className="mt-12 rounded-lg border-2 border-gray-300 bg-white p-6">
        <h3 className="text-lg font-semibold">
          {isComplete ? "Already complete" : "Mark this unit complete"}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {isComplete
            ? "You've already finished this unit. You can revisit it any time."
            : "You've done the work — lock it in on your plan."}
        </p>
        <button
          type="button"
          onClick={onComplete}
          disabled={completing || isComplete}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {completing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : isComplete ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Already done
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Mark this unit complete
            </>
          )}
        </button>
      </div>
    </section>
  );
}

// ---------- helpers ----------

function formatStopwatch(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
