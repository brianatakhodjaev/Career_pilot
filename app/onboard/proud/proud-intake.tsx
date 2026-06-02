"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProfileId } from "@/lib/profiles";

const STORAGE_KEY = "careerpilot:onboarding";

// Amendment 5 Decision E: 600-char threshold marks "rich background"
// (roughly a real paragraph of pasted LinkedIn text or resume material).
// Below it, the pride-point screen is framed as the primary action;
// above it, the prompt acknowledges the user has already shared a lot
// and the Skip option becomes prominent.
const RICH_BACKGROUND_THRESHOLD = 600;

interface StoredPayload {
  profile?: string;
  background?: string;
  proudPoint?: string;
  reviewSummary?: string;
  reviewCorrection?: string;
  answers?: Record<string, string>;
}

interface ProudIntakeProps {
  profile: ProfileId;
}

export function ProudIntake({ profile }: ProudIntakeProps) {
  const router = useRouter();
  const [background, setBackground] = useState<string>("");
  const [proudPoint, setProudPoint] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const existing = JSON.parse(raw) as StoredPayload;
        if (typeof existing.background === "string") {
          setBackground(existing.background);
        }
        if (typeof existing.proudPoint === "string") {
          setProudPoint(existing.proudPoint);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const isRichBackground = useMemo(
    () => background.trim().length >= RICH_BACKGROUND_THRESHOLD,
    [background],
  );

  function persistAndAdvance(text: string) {
    const trimmed = text.trim();
    let existing: StoredPayload = {};
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) existing = JSON.parse(raw) as StoredPayload;
    } catch {
      // ignore
    }
    const payload: StoredPayload = {
      ...existing,
      profile,
      proudPoint: trimmed || undefined,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore — downstream will re-write
    }
    router.push(`/onboard/review?profile=${profile}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persistAndAdvance(proudPoint);
  }

  function handleSkip() {
    persistAndAdvance("");
  }

  if (!hydrated) {
    // First paint matches the thin-background framing so the layout
    // doesn't jitter before we read sessionStorage. The button only
    // appears after hydration anyway.
    return <main className="min-h-screen" aria-busy="true" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isRichBackground
            ? "You've already shared a lot about your work"
            : "One piece of work you're proud of"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isRichBackground
            ? "Anything specific to add? A project, an outcome, a moment you'd want the assessment to know about? Optional — skip if there's nothing more."
            : "Tell us about a piece of work in the last year you were genuinely proud of. The more concrete, the sharper your assessment."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6" noValidate>
          <label htmlFor="proudPoint" className="sr-only">
            A piece of work you&apos;re proud of
          </label>
          <textarea
            id="proudPoint"
            value={proudPoint}
            onChange={(e) => setProudPoint(e.target.value)}
            rows={10}
            placeholder={
              isRichBackground
                ? "Optional — leave blank to skip."
                : "Describe a specific project, deliverable, or moment."
            }
            className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />

          {isRichBackground ? (
            // Rich background: Skip is the prominent path, Continue is the
            // softer one if the user does add something.
            <div className="mt-8 flex items-center justify-between">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:border-gray-400"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Skip — produce my summary
              </button>
            </div>
          ) : (
            // Thin background: Continue (with text) is the primary action;
            // Skip is the quieter underline.
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-gray-600 underline underline-offset-4 transition hover:text-gray-900"
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Continue
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
