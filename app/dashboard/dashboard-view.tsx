"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  Pause,
  Play,
} from "lucide-react";

export interface DashboardTask {
  id: string;
  title: string;
  type: string;
  estimatedMinutes: number;
  resourceUrl: string | null;
  completedAt: string | null;
}

export interface DashboardPhase {
  id: string;
  weekNumber: number;
  title: string;
  objectives: string[];
  tasks: DashboardTask[];
}

export interface DashboardPlan {
  id: string;
  title: string;
  trackType: string;
  durationWeeks: number;
  hoursPerWeek: number;
  startedAt: string | null;
  phases: DashboardPhase[];
}

export interface DashboardData {
  plan: DashboardPlan;
  progress: {
    currentStreak: number;
    longestStreak: number;
    totalMinutes: number;
  };
  activeSession: { id: string; startedAt: string } | null;
  hasAssessment: boolean;
  backgroundHref: string;
  userName: string | null;
}

export function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { plan, progress, activeSession, hasAssessment, backgroundHref, userName } =
    data;

  const started = Boolean(plan.startedAt);
  const currentWeek = useMemo(
    () => (plan.startedAt ? computeCurrentWeek(plan.startedAt) : null),
    [plan.startedAt],
  );
  const currentPhase = useMemo(
    () => (currentWeek != null ? findCurrentPhase(plan.phases, currentWeek) : null),
    [plan.phases, currentWeek],
  );

  const allTasks = useMemo(
    () => plan.phases.flatMap((p) => p.tasks),
    [plan.phases],
  );
  const completedCount = allTasks.filter((t) => t.completedAt != null).length;
  const totalCount = allTasks.length;
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleBegin() {
    const res = await fetch("/api/plan/start", { method: "POST" });
    if (res.ok) refresh();
  }

  async function handleTaskToggle(taskId: string) {
    const res = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    if (res.ok) refresh();
  }

  async function handleSessionStart() {
    const res = await fetch("/api/sessions/start", { method: "POST" });
    if (res.ok) refresh();
  }

  async function handleSessionEnd() {
    if (!activeSession) return;
    const res = await fetch("/api/sessions/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSession.id }),
    });
    if (res.ok) refresh();
  }

  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-10">
        {/* Header */}
        <header>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            {userName ? `Hi ${userName.split(" ")[0]}.` : "Welcome back."}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{plan.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            <span className="capitalize">{plan.trackType}</span>
            {" · "}
            {plan.durationWeeks} weeks
            {" · "}
            {plan.hoursPerWeek}h/week
            {started && currentWeek != null && (
              <>
                {" · "}
                <span className="font-medium text-gray-900">
                  Week {Math.min(currentWeek, plan.durationWeeks)} of{" "}
                  {plan.durationWeeks}
                </span>
              </>
            )}
          </p>
        </header>

        {/* Stats row — progress first per §13 principle 1 */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Plan progress"
            value={`${percentComplete}%`}
            sub={`${completedCount} of ${totalCount} tasks`}
          />
          <StatCard
            label="Day streak"
            value={`${progress.currentStreak}`}
            sub={
              progress.currentStreak === 1
                ? "day"
                : progress.currentStreak === 0
                  ? "start one today"
                  : "days"
            }
          />
          <StatCard
            label="Minutes logged"
            value={formatMinutesPrimary(progress.totalMinutes)}
            sub={formatMinutesSub(progress.totalMinutes)}
          />
        </section>

        {/* Task area — Begin CTA if not started, else current-phase tasks */}
        <section aria-labelledby="tasks-heading">
          {!started ? (
            <BeginBlock onBegin={handleBegin} isPending={isPending} />
          ) : currentPhase ? (
            <PhaseTaskBlock
              phase={currentPhase}
              onToggle={handleTaskToggle}
              isPending={isPending}
            />
          ) : (
            <p className="text-sm text-gray-600">
              No current phase — your plan may have wrapped up. Nice work.
            </p>
          )}
        </section>

        {/* Session timer */}
        <section aria-labelledby="session-heading">
          <SessionTimer
            activeSession={activeSession}
            onStart={handleSessionStart}
            onEnd={handleSessionEnd}
            isPending={isPending}
          />
        </section>

        {/* Footer — §13 principle 3: assessment reachable, not foregrounded */}
        <footer className="border-t border-gray-200 pt-6 text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {hasAssessment && (
              <Link
                href="/assessment"
                className="underline underline-offset-2 hover:no-underline"
              >
                View your assessment
              </Link>
            )}
            <Link
              href={backgroundHref}
              className="underline underline-offset-2 hover:no-underline"
            >
              Update your background
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function BeginBlock({
  onBegin,
  isPending,
}: {
  onBegin: () => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border-2 border-gray-300 bg-white p-6">
      <h2 className="text-lg font-semibold">Ready when you are</h2>
      <p className="mt-2 text-sm text-gray-600">
        Your plan starts whenever you decide. We&apos;ll track week 1 from the
        moment you begin — not from when the plan was created.
      </p>
      <button
        type="button"
        onClick={onBegin}
        disabled={isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <>
            Begin week 1
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
}

function PhaseTaskBlock({
  phase,
  onToggle,
  isPending,
}: {
  phase: DashboardPhase;
  onToggle: (taskId: string) => void;
  isPending: boolean;
}) {
  // Uncompleted first, completed (struck-through) below.
  const uncompleted = phase.tasks.filter((t) => !t.completedAt);
  const completed = phase.tasks.filter((t) => t.completedAt);

  return (
    <div>
      <h2 id="tasks-heading" className="text-xl font-semibold">
        Today&apos;s tasks
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Phase {phase.weekNumber === 1 ? 1 : "(starts week " + phase.weekNumber + ")"}{" "}
        — {phase.title}
      </p>

      <ul className="mt-6 space-y-2">
        {uncompleted.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={onToggle} isPending={isPending} />
        ))}
        {completed.length > 0 &&
          completed.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} isPending={isPending} />
          ))}
      </ul>

      {uncompleted.length === 0 && (
        <p className="mt-6 text-sm text-gray-600">
          You&apos;ve cleared this phase. Nice. Next phase opens when its week
          arrives.
        </p>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  isPending,
}: {
  task: DashboardTask;
  onToggle: (taskId: string) => void;
  isPending: boolean;
}) {
  const isDone = Boolean(task.completedAt);
  return (
    <li
      className={`flex items-start gap-3 rounded-md border p-3 transition ${
        isDone ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => !isDone && onToggle(task.id)}
        disabled={isDone || isPending}
        aria-label={isDone ? "Completed" : `Mark complete: ${task.title}`}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition ${
          isDone
            ? "border-black bg-black text-white"
            : "border-gray-300 hover:border-black"
        } ${isDone ? "" : "cursor-pointer"} disabled:cursor-default`}
      >
        {isDone && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isDone ? "text-gray-500 line-through" : "text-gray-900"}`}>
          {task.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          <span className="capitalize">{task.type}</span> · {task.estimatedMinutes} min
          {task.resourceUrl && (
            <>
              {" "}·{" "}
              <a
                href={task.resourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-0.5 text-black underline underline-offset-2 hover:no-underline"
              >
                view
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

function SessionTimer({
  activeSession,
  onStart,
  onEnd,
  isPending,
}: {
  activeSession: { id: string; startedAt: string } | null;
  onStart: () => void;
  onEnd: () => void;
  isPending: boolean;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const elapsedMs = activeSession ? now - Date.parse(activeSession.startedAt) : 0;
  const elapsedLabel = activeSession ? formatStopwatch(elapsedMs) : null;

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="session-heading" className="text-sm font-semibold">
            Focused session
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {activeSession
              ? "Sessions count toward your streak after 10 minutes."
              : "Time-boxed work. Counts toward your streak after 10 min."}
          </p>
        </div>
        {activeSession ? (
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums">{elapsedLabel}</span>
            <button
              type="button"
              onClick={onEnd}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Pause className="h-4 w-4" aria-hidden="true" />
              End session
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-black px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Start session
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function computeCurrentWeek(startedAtIso: string): number {
  const start = Date.parse(startedAtIso);
  const days = Math.floor((Date.now() - start) / 86_400_000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

function findCurrentPhase(
  phases: DashboardPhase[],
  currentWeek: number,
): DashboardPhase | null {
  if (phases.length === 0) return null;
  const eligible = phases.filter((p) => p.weekNumber <= currentWeek);
  if (eligible.length === 0) {
    // Plan's first phase starts later — show it as "upcoming."
    return phases[0];
  }
  return eligible.reduce((latest, p) =>
    p.weekNumber > latest.weekNumber ? p : latest,
  );
}

function formatMinutesPrimary(n: number): string {
  if (n < 60) return `${n}`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMinutesSub(n: number): string {
  if (n < 60) return n === 1 ? "minute" : "minutes";
  return "total";
}

function formatStopwatch(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
