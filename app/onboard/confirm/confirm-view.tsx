"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import type { Phase, Plan } from "@/lib/plans";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  plans?: Plan[];
  selectedPlanIndex?: number;
}

type ErrorKind = null | "missing" | "api" | "network";

export function ConfirmView() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<ErrorKind>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHydrated(true);

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setError("missing");
      return;
    }

    let payload: StoredPayload;
    try {
      payload = JSON.parse(raw) as StoredPayload;
    } catch {
      setError("missing");
      return;
    }

    if (
      !payload.plans ||
      typeof payload.selectedPlanIndex !== "number" ||
      payload.selectedPlanIndex < 0 ||
      payload.selectedPlanIndex >= payload.plans.length
    ) {
      setError("missing");
      return;
    }

    setPlan(payload.plans[payload.selectedPlanIndex]);
  }, []);

  async function handleConfirm() {
    if (!plan) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/plans/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as {
        success: boolean;
        data?: { planId: string };
        error?: string;
      };
      if (!data.success) {
        setError("api");
        setSubmitting(false);
        return;
      }
      // Leave sessionStorage in place — the back-button to /onboard/plans
      // should still work briefly if the user wants to switch.
      router.push("/dashboard");
    } catch {
      setError("network");
      setSubmitting(false);
    }
  }

  if (error === "missing") {
    return (
      <CenteredMessage
        heading="No plan selected"
        body="Pick a plan from the options screen and we'll bring you back here to confirm."
        cta={
          <Link
            href="/onboard/plans"
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Choose a plan
          </Link>
        }
      />
    );
  }

  if (error === "api" || error === "network") {
    return (
      <CenteredMessage
        heading="We couldn't save your plan"
        body={
          error === "network"
            ? "Connection issue. Check your network and try again."
            : "Something went wrong on our end. Try again in a moment."
        }
        cta={
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (!hydrated || !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-black" aria-hidden="true" />
      </main>
    );
  }

  return (
    <PlanDetail plan={plan} onConfirm={handleConfirm} submitting={submitting} />
  );
}

function PlanDetail({
  plan,
  onConfirm,
  submitting,
}: {
  plan: Plan;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Ready to start?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Here&apos;s your plan in full. You can change your mind later — pick
            this one to begin tracking it on your dashboard.
          </p>
        </header>

        {/* Plan summary */}
        <section className="mt-10 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{plan.title}</h2>
              <p className="mt-1 text-xs text-gray-500">
                <span className="capitalize">{plan.trackType}</span>
                {" · "}
                {plan.durationWeeks} weeks
                {" · "}
                {plan.hoursPerWeek}h/week
              </p>
            </div>
            <div className="flex-shrink-0 rounded-md bg-black px-2 py-1 text-xs font-medium text-white tabular-nums">
              {plan.matchScore}% match
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            {plan.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {plan.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Phase breakdown */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">The plan</h2>
          <p className="mt-2 text-sm text-gray-600">
            {plan.phases.length} phase{plan.phases.length === 1 ? "" : "s"} over{" "}
            {plan.durationWeeks} weeks.
          </p>
          <div className="mt-6 space-y-4">
            {plan.phases.map((phase, idx) => (
              <PhaseBlock key={`${phase.weekNumber}-${idx}`} phase={phase} index={idx} />
            ))}
          </div>
        </section>

        {/* Actions */}
        <section className="mt-12 flex items-center justify-between gap-4">
          <Link
            href="/onboard/plans"
            className="inline-flex items-center gap-1 text-sm text-gray-600 underline underline-offset-4 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to plans
          </Link>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                Start this plan
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </section>
      </div>
    </main>
  );
}

function PhaseBlock({ phase, index }: { phase: Phase; index: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold">
          Phase {index + 1}: {phase.title}
        </h3>
        <p className="flex-shrink-0 text-xs text-gray-500">
          Starts week {phase.weekNumber}
        </p>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Goals
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {phase.objectives.map((obj) => (
            <li key={obj}>· {obj}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Tasks
        </h4>
        <ul className="mt-2 space-y-2 text-sm text-gray-700">
          {phase.tasks.map((task, i) => (
            <li key={`${task.title}-${i}`}>
              <span>{task.title}</span>
              <span className="ml-2 text-xs text-gray-500">
                · <span className="capitalize">{task.type}</span> ·{" "}
                {task.estimatedMinutes} min
              </span>
              {task.resourceUrl && (
                <>
                  {" "}
                  <a
                    href={task.resourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-0.5 text-xs text-black underline underline-offset-2 hover:no-underline"
                  >
                    view
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CenteredMessage({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <div className="mt-6">{cta}</div>
      </div>
    </main>
  );
}
