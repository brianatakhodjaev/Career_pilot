"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import type { Assessment, Factor } from "@/lib/assessment";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  answers?: Record<string, string>;
  assessment?: Assessment;
}

type ErrorKind = null | "missing" | "api" | "network";

// Loading messages cycle while we wait on Claude (~15s on 4-6). Each is set
// to feel like the system is actually doing the thing on the next line, not
// a generic progress spinner.
const LOADING_MESSAGES = [
  "Reading your background…",
  "Mapping exposure at the task level…",
  "Identifying what stays human…",
  "Building your assessment…",
];

export function AssessmentView() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<ErrorKind>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  // Cycle the loading message every ~3.5s while we're waiting on Claude.
  useEffect(() => {
    if (assessment) return;
    const id = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 3500);
    return () => clearInterval(id);
  }, [assessment]);

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

    if (!payload.profile || !payload.answers) {
      setError("missing");
      return;
    }

    // Reuse a previously-computed assessment so we don't re-charge the
    // Claude bill on every back-button visit. retryNonce > 0 forces a
    // re-fetch (e.g., after a transient error).
    if (payload.assessment && retryNonce === 0) {
      setAssessment(payload.assessment);
      return;
    }

    fetch("/api/assess-exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileType: payload.profile,
        answers: payload.answers,
      }),
    })
      .then((r) => r.json())
      .then((data: { success: boolean; data?: Assessment; error?: string }) => {
        if (cancelled) return;
        if (!data.success || !data.data) {
          setError("api");
          return;
        }
        setAssessment(data.data);
        try {
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...payload, assessment: data.data }),
          );
        } catch {
          // Storage write can fail in private modes — the in-memory copy
          // is enough for this session.
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

  if (error === "missing") {
    return (
      <CenteredMessage
        heading="We need a bit more from you"
        body="Your responses weren't found. Start the onboarding again and we'll get you your assessment."
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
        heading="We couldn't complete that"
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

  if (!assessment) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-black" aria-hidden="true" />
          <p className="mt-6 text-sm text-gray-700" aria-live="polite">
            {LOADING_MESSAGES[msgIndex]}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            This usually takes about 15 seconds.
          </p>
        </div>
      </main>
    );
  }

  return <AssessmentDisplay assessment={assessment} />;
}

// §13-ordered render: defensible → factor breakdown (with exposed tasks as a
// concrete sub-list) → three scores → constructive path with reframe + CTA.
function AssessmentDisplay({ assessment }: { assessment: Assessment }) {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-16">
        <header>
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Your assessment
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {assessment.occupationLabel}
          </h1>
        </header>

        {/* 1. Defensible — "Still yours" (leads per §13 principle 2) */}
        <section aria-labelledby="defensible-heading">
          <h2 id="defensible-heading" className="text-xl font-semibold">
            What&apos;s still yours
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The parts of your role that don&apos;t go away.
          </p>
          <ul className="mt-6 space-y-3">
            {assessment.defensibleTasks.map((task) => (
              <li
                key={task}
                className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-4"
              >
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-black" aria-hidden="true" />
                <span className="text-sm">{task}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 2. Factor breakdown (§13 principle 6 — shown, not hidden) */}
        <section aria-labelledby="factors-heading">
          <h2 id="factors-heading" className="text-xl font-semibold">
            Where the pressure is
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Five dimensions of your work, scored 0–10 for current AI exposure.
            High scores are focus areas. Low scores are your human advantage.
          </p>
          <div className="mt-6 space-y-3">
            {assessment.factors.map((factor) => (
              <FactorRow key={factor.label} factor={factor} />
            ))}
          </div>

          {/* Exposed tasks — concrete examples beneath the factor abstractions */}
          <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">Specific tasks most exposed</h3>
            <p className="mt-1 text-xs text-gray-600">
              The concrete work where AI is already capable.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
              {assessment.exposedTasks.map((task) => (
                <li key={task}>• {task}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. Three scores (§13 principle 3 — never shown alone; the
            with-plan tile is the lever, visually emphasised) */}
        <section aria-labelledby="scores-heading">
          <h2 id="scores-heading" className="text-xl font-semibold">
            Your numbers
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Where you stand today, where you&apos;re headed, and where the plan
            takes you.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            <ScoreTile label="Today" value={assessment.scoreToday} />
            <ScoreTile label="2028, no action" value={assessment.scoreProjected} />
            <ScoreTile
              label="2028, with your plan"
              value={assessment.scoreWithPlan}
              emphasized
            />
          </div>
        </section>

        {/* 4. Constructive path — reasoning, reframe, CTA */}
        <section aria-labelledby="meaning-heading">
          <h2 id="meaning-heading" className="text-xl font-semibold">
            What this means
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800">
            {assessment.reasoning
              .split(/\n\n+/)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>

          <div className="mt-8 rounded-md border-l-2 border-black bg-gray-50 px-4 py-3 text-sm">
            <strong className="font-medium">
              Exposure is a starting line, not a verdict.
            </strong>{" "}
            What you do next is what changes the number.
          </div>

          <Link
            href="/onboard/plans"
            className="mt-10 inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            See your plan options
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function FactorRow({ factor }: { factor: Factor }) {
  const pct = (factor.score / 10) * 100;
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold">{factor.label}</h3>
        <span className="text-base font-semibold tabular-nums">
          {factor.score}
          <span className="text-xs font-normal text-gray-400">/10</span>
        </span>
      </div>
      <div
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200"
        role="img"
        aria-label={`Exposure score: ${factor.score} of 10`}
      >
        <div className="h-full bg-black" style={{ width: `${pct}%` }} aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm text-gray-600">{factor.note}</p>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border p-4 text-center ${
        emphasized
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white text-black"
      }`}
    >
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div
        className={`mt-1 text-xs ${
          emphasized ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {label}
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
