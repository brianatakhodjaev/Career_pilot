"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import type { UnitState } from "@/lib/lesson-status";

// ---------- types ----------

export interface DashboardUnit {
  id: string;
  unitNumber: number;
  title: string;
  skill: string;
  tier: string;
  timeRangeMin: number;
  timeRangeMax: number;
  exerciseFormat: string;
}

export interface DashboardPlateItem {
  id: string;
  tag: string;
  rationale: string;
  orderIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  // Amendment 6 §15.5: four-state rollup computed server-side.
  unitState: UnitState;
  unit: DashboardUnit;
}

export interface DashboardPlan {
  id: string;
  durationWeeks: number;
  hoursPerWeek: number;
  startedAt: string | null;
  plateItems: DashboardPlateItem[];
}

export interface DashboardData {
  plan: DashboardPlan;
  progress: {
    currentStreak: number;
    longestStreak: number;
    totalMinutes: number;
  };
  hasAssessment: boolean;
  backgroundHref: string;
  userName: string | null;
}

// ---------- component ----------

export function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { plan, progress, hasAssessment, backgroundHref, userName } = data;

  // Core items only — later / skip stay off the dashboard.
  const coreItems = useMemo(
    () =>
      plan.plateItems
        .filter((i) => i.tag === "core")
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [plan.plateItems],
  );

  const completedCount = coreItems.filter((i) => i.completedAt != null).length;
  const totalCount = coreItems.length;
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const started = Boolean(plan.startedAt);
  const currentWeek = useMemo(
    () => (plan.startedAt ? computeCurrentWeek(plan.startedAt) : null),
    [plan.startedAt],
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleBegin() {
    const res = await fetch("/api/plan/start", { method: "POST" });
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your plan</h1>
          <p className="mt-2 text-sm text-gray-600">
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
            {!started && (
              <>
                {" · "}
                <span className="font-medium text-gray-900">Not started yet</span>
              </>
            )}
          </p>
        </header>

        {/* Stats — §13 principle 1: progress leads */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Plan progress"
            value={`${percentComplete}%`}
            sub={`${completedCount} of ${totalCount} unit${totalCount === 1 ? "" : "s"}`}
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

        {/* Task area: Begin CTA if not started, otherwise core units as
            clickable lesson links with three-state status badges. */}
        <section aria-labelledby="tasks-heading">
          {!started ? (
            <BeginBlock onBegin={handleBegin} isPending={isPending} />
          ) : (
            <CoreUnitsBlock items={coreItems} />
          )}
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
            <Link
              href="/settings/ai"
              className="underline underline-offset-2 hover:no-underline"
            >
              AI settings
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ---------- subcomponents ----------

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

function CoreUnitsBlock({ items }: { items: DashboardPlateItem[] }) {
  if (items.length === 0) {
    return (
      <div>
        <h2 id="tasks-heading" className="text-xl font-semibold">
          What you&apos;re working on
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          No core units in your plate yet. Update your plan options to add some.
        </p>
      </div>
    );
  }

  // Uncompleted first (sorted by orderIndex), completed below.
  const uncompleted = items.filter((i) => !i.completedAt);
  const completed = items.filter((i) => i.completedAt);

  return (
    <div>
      <h2 id="tasks-heading" className="text-xl font-semibold">
        What you&apos;re working on
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Your core units, in order. Open one to start the lesson.
      </p>

      <ul className="mt-6 space-y-3">
        {uncompleted.map((item) => (
          <UnitLinkRow key={item.id} item={item} />
        ))}
        {completed.length > 0 &&
          completed.map((item) => (
            <UnitLinkRow key={item.id} item={item} />
          ))}
      </ul>

      {uncompleted.length === 0 && (
        <p className="mt-6 text-sm text-gray-600">
          You&apos;ve cleared every core unit. Nice work — that&apos;s the plate
          done.
        </p>
      )}
    </div>
  );
}

function UnitLinkRow({ item }: { item: DashboardPlateItem }) {
  const state = item.unitState;
  const isComplete = state === "complete";

  return (
    <li>
      <Link
        href={`/learn/${item.unit.unitNumber}`}
        className={`block rounded-md border p-4 transition focus:outline-none focus:ring-2 focus:ring-black ${
          isComplete
            ? "border-gray-200 bg-gray-50"
            : "border-gray-200 bg-white hover:border-black"
        }`}
        aria-label={`Open lesson TOC: ${item.unit.title}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium ${
                isComplete ? "text-gray-500 line-through" : "text-gray-900"
              }`}
            >
              {item.unit.title}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {item.unit.tier}
              {" · "}
              {item.unit.timeRangeMin}–{item.unit.timeRangeMax} min
              {" · "}
              {item.unit.exerciseFormat}
            </p>
            {!isComplete && (
              <p className="mt-2 text-sm text-gray-700">{item.unit.skill}</p>
            )}
          </div>
          <StateBadge state={state} />
        </div>
      </Link>
    </li>
  );
}

function StateBadge({ state }: { state: UnitState }) {
  if (state === "complete") {
    return (
      <div
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-black text-white"
        aria-label="Complete"
      >
        <Check className="h-3 w-3" aria-hidden="true" />
      </div>
    );
  }
  if (state === "ready_to_complete") {
    return (
      <span className="flex-shrink-0 rounded-full border border-black bg-white px-2 py-0.5 text-xs font-medium text-black">
        Ready to complete
      </span>
    );
  }
  if (state === "in_progress") {
    return (
      <span className="flex-shrink-0 rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
        In progress
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      Not started
    </span>
  );
}

// ---------- helpers ----------

function computeCurrentWeek(startedAtIso: string): number {
  const start = Date.parse(startedAtIso);
  const days = Math.floor((Date.now() - start) / 86_400_000);
  return Math.max(1, Math.floor(days / 7) + 1);
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
