"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Assessment } from "@/lib/assessment";
import { isProfileId, type ProfileId } from "@/lib/profiles";
import { AssessmentDisplay } from "@/app/_components/assessment-display";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  background?: string;
  proudPoint?: string;
  reviewSummary?: string;
  reviewCorrection?: string;
  answers?: Record<string, string>;
  assessment?: Assessment;
}

type ErrorKind = null | "missing" | "api" | "network";

const LOADING_MESSAGES = [
  "Reading your background…",
  "Mapping exposure at the task level…",
  "Identifying what stays human…",
  "Building your assessment…",
];

export function AssessmentView() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [profile, setProfile] = useState<ProfileId | null>(null);
  const [hasBackground, setHasBackground] = useState(false);
  const [error, setError] = useState<ErrorKind>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

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

    if (!payload.profile || !isProfileId(payload.profile) || !payload.answers) {
      setError("missing");
      return;
    }

    setProfile(payload.profile);
    const trimmedBg = payload.background?.trim();
    setHasBackground(Boolean(trimmedBg));

    if (payload.assessment && retryNonce === 0) {
      setAssessment(payload.assessment);
      return;
    }

    // Hard upper bound on the fetch so a wedged dev server, stale browser
    // chunk, or dropped socket can never trap the user on the spinner
    // forever. 60s matches the route's maxDuration; the network-error
    // branch surfaces a Try-again CTA if we hit it.
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    fetch("/api/assess-exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileType: payload.profile,
        answers: payload.answers,
        resumeText: trimmedBg || undefined,
        proudPoint: payload.proudPoint?.trim() || undefined,
        reviewSummary: payload.reviewSummary?.trim() || undefined,
        reviewCorrection: payload.reviewCorrection?.trim() || undefined,
      }),
      signal: controller.signal,
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
          // Storage write can fail in private modes; in-memory copy is fine.
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("network");
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
    // `assessment` deliberately not in deps — it's an OUTPUT of this effect,
    // not an input. Including it caused an infinite re-render loop:
    // setAssessment(JSON.parse(raw)) writes a new object reference on every
    // run, which retriggers the effect via the dep, which writes again, etc.
    // Only retryNonce should drive re-execution.
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

  const backgroundHref = profile
    ? `/onboard/background?profile=${profile}`
    : "/onboard/background";

  // §13 principle 7: the assessment shows how to sharpen itself. The
  // prominence of the refinement prompt scales with inputDepth — thin
  // input gets a strong invitation; rich input gets a light pointer.
  // Combined with hasBackground for backward compatibility with the
  // /assessment server view.
  const showThinPrompt = assessment.inputDepth === "thin" || !hasBackground;

  return (
    <AssessmentDisplay
      assessment={assessment}
      refinementSlot={
        showThinPrompt ? (
          <div className="mt-6 rounded-md border-2 border-gray-300 bg-white p-5">
            <h3 className="text-base font-semibold">Make this sharper</h3>
            <p className="mt-1 text-sm text-gray-600">
              This was a first read with the context you provided. Add a
              specific project, a deliverable you led, or more of your
              LinkedIn summary — and the assessment will ground itself in
              your real situation.
            </p>
            <Link
              href={backgroundHref}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-black underline underline-offset-4 hover:no-underline"
            >
              Add more background
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <p className="mt-6 text-xs text-gray-500">
            Want this read to sharpen further?{" "}
            <Link
              href={backgroundHref}
              className="underline underline-offset-2 hover:no-underline"
            >
              Update your background
            </Link>
            .
          </p>
        )
      }
      bottomCta={
        <Link
          href="/onboard/plans"
          className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          See your plan options
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    />
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
