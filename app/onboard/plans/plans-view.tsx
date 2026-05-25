"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Assessment } from "@/lib/assessment";
import type { Plan } from "@/lib/plans";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  background?: string;
  answers?: Record<string, string>;
  assessment?: Assessment;
  plans?: Plan[];
  selectedPlanIndex?: number;
}

type ErrorKind = null | "missing" | "api" | "network";

// Plan generation is ~50s on Sonnet 4.6 — bigger output than the assessment,
// so we cycle through a few status lines that telegraph what the system is
// actually doing rather than spinning a generic loader.
const LOADING_MESSAGES = [
  "Mapping career paths from your assessment…",
  "Sequencing each plan into weekly phases…",
  "Pacing tasks to your weekly capacity…",
  "Finalising plan options…",
];

export function PlansView() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState<ErrorKind>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  // Cycle the loading message every ~10s while waiting.
  useEffect(() => {
    if (plans) return;
    const id = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 10000);
    return () => clearInterval(id);
  }, [plans]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setMsgIndex(0);

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

    if (!payload.profile || !payload.answers || !payload.assessment) {
      setError("missing");
      return;
    }

    // Reuse previously-generated plans so back-button revisits don't
    // re-charge the Claude bill. retryNonce > 0 forces a re-fetch.
    if (payload.plans && payload.plans.length === 3 && retryNonce === 0) {
      setPlans(payload.plans);
      return;
    }

    fetch("/api/generate-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileType: payload.profile,
        answers: payload.answers,
        assessment: payload.assessment,
        background: payload.background?.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data: { success: boolean; data?: { plans: Plan[] }; error?: string }) => {
        if (cancelled) return;
        if (!data.success || !data.data?.plans) {
          setError("api");
          return;
        }
        setPlans(data.data.plans);
        try {
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...payload, plans: data.data.plans }),
          );
        } catch {
          // Storage write can fail in private modes — in-memory copy is
          // enough for the current navigation.
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("network");
      });

    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  function handleSelect(index: number) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as StoredPayload) : {};
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...existing, selectedPlanIndex: index }),
      );
    } catch {
      // ignore — /onboard/confirm reads sessionStorage and will surface
      // a useful error if the selection didn't persist
    }
    router.push(`/onboard/confirm?plan=${index}`);
  }

  if (error === "missing") {
    return (
      <CenteredMessage
        heading="We need a bit more from you"
        body="We couldn't find your assessment. Start the onboarding again and we'll generate your plan options."
        cta={
          <Link
            href="/onboard/profile"
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Restart
          </Link>
        }
      />
    );
  }

  if (error === "api" || error === "network") {
    return (
      <CenteredMessage
        heading="We couldn't generate plans"
        body={
          error === "network"
            ? "Connection issue. Check your network and try again."
            : "Something went wrong on our end. Try again in a moment."
        }
        cta={
          <button
            type="button"
            onClick={() => setRetryNonce((n) => n + 1)}
            className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (!plans) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-black" aria-hidden="true" />
          <p className="mt-6 text-sm text-gray-700" aria-live="polite">
            {LOADING_MESSAGES[msgIndex]}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            This usually takes about 50 seconds.
          </p>
        </div>
      </main>
    );
  }

  // Show best match first. Tie-break by Claude's natural ordering (stable
  // sort).
  const ordered = plans
    .map((plan, index) => ({ plan, index }))
    .sort((a, b) => b.plan.matchScore - a.plan.matchScore);

  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Three paths forward
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Each plan moves you toward a different AI-fluent position. Pick the
            one that fits where you want to be — you can change your mind later.
          </p>
        </header>

        <div className="mt-10 space-y-4">
          {ordered.map(({ plan, index }) => (
            <PlanCard
              key={`${plan.title}-${index}`}
              plan={plan}
              onSelect={() => handleSelect(index)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group block w-full rounded-lg border border-gray-200 bg-white p-6 text-left transition hover:border-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
      aria-label={`Select ${plan.title}`}
    >
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

      <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-black">
        Select this plan
        <ArrowRight
          className="h-4 w-4 transition group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </button>
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
