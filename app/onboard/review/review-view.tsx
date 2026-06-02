"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ProfileId } from "@/lib/profiles";
import { isProfileId } from "@/lib/profiles";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  background?: string;
  proudPoint?: string;
  reviewSummary?: string;
  reviewCorrection?: string;
  answers?: Record<string, string>;
}

type ErrorKind = null | "missing" | "api" | "network";

const LOADING_MESSAGES = [
  "Reading what you shared…",
  "Putting it in plain language…",
];

interface ReviewViewProps {
  profile: ProfileId;
}

export function ReviewView({ profile }: ReviewViewProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<string>("");
  const [correction, setCorrection] = useState<string>("");
  const [error, setError] = useState<ErrorKind>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 3500);
    return () => clearInterval(id);
  }, [ready]);

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

    if (!payload.profile || !isProfileId(payload.profile)) {
      setError("missing");
      return;
    }

    // Restore correction text on back-button revisits.
    if (typeof payload.reviewCorrection === "string") {
      setCorrection(payload.reviewCorrection);
    }

    // Reuse cached summary on back-button revisits — don't re-charge.
    if (payload.reviewSummary && retryNonce === 0) {
      setSummary(payload.reviewSummary);
      setReady(true);
      return;
    }

    fetch("/api/review-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileType: payload.profile,
        background: payload.background?.trim() || undefined,
        proudPoint: payload.proudPoint?.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((data: { success: boolean; data?: { summary: string }; error?: string }) => {
        if (cancelled) return;
        if (!data.success || !data.data) {
          setError("api");
          return;
        }
        setSummary(data.data.summary);
        setReady(true);
        try {
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...payload, reviewSummary: data.data.summary }),
          );
        } catch {
          // private mode write failure — in-memory copy is fine
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

  function handleContinue() {
    const trimmed = correction.trim();
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as StoredPayload) : {};
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...existing,
          profile,
          reviewSummary: summary,
          reviewCorrection: trimmed || undefined,
        }),
      );
    } catch {
      // best-effort
    }
    router.push(`/onboard/questions?profile=${profile}`);
  }

  if (error === "missing") {
    return (
      <CenteredMessage
        heading="We need a bit more from you"
        body="Your background wasn't found. Start the onboarding again and we'll bring you back here."
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
        heading="We couldn't generate your summary"
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

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-black" aria-hidden="true" />
          <p className="mt-6 text-sm text-gray-700" aria-live="polite">
            {LOADING_MESSAGES[msgIndex]}
          </p>
          <p className="mt-2 text-xs text-gray-400">A few seconds.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Here&apos;s what we understood
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Read this carefully. If anything is off — even small things —
            correct it below before we produce your assessment.
          </p>
        </header>

        <section
          aria-labelledby="summary-heading"
          className="mt-8 rounded-md border-l-2 border-black bg-gray-50 px-5 py-4 text-sm leading-relaxed text-gray-800"
        >
          <h2 id="summary-heading" className="sr-only">
            Summary
          </h2>
          {summary.split(/\n\n+/).map((para, i) => (
            <p key={i} className={i === 0 ? "" : "mt-3"}>
              {para}
            </p>
          ))}
        </section>

        <section className="mt-10">
          <label
            htmlFor="correction"
            className="block text-sm font-medium text-gray-900"
          >
            Anything to correct or add?
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Optional. If everything looks right, leave this blank.
          </p>
          <textarea
            id="correction"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            rows={6}
            placeholder="e.g. I haven't managed people for two years — I moved to an IC role."
            className="mt-3 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </section>

        <div className="mt-10 flex items-center justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Looks right — produce my assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
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
