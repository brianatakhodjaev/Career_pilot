"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProfileId } from "@/lib/profiles";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  background?: string;
  proudPoint?: string;
  reviewSummary?: string;
  reviewCorrection?: string;
  answers?: Record<string, string>;
}

interface BackgroundIntakeProps {
  profile: ProfileId;
}

// Amendment 5 §5a.1: Skip is no longer offered here — the skip framing
// moved to /onboard/proud. Background is the foundational context for
// every later step (review summary, assessment, selector), so the user
// is asked to share something. If they truly have nothing to paste they
// can still write a sentence or two.
export function BackgroundIntake({ profile }: BackgroundIntakeProps) {
  const router = useRouter();
  const [background, setBackground] = useState("");

  // If the user returns to this screen after providing background earlier
  // (e.g. via the assessment screen's "Update your background" link),
  // restore what they wrote so they aren't forced to retype it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const existing = JSON.parse(raw) as StoredPayload;
      if (typeof existing.background === "string") {
        setBackground(existing.background);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = background.trim();
    if (!trimmed) return;

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
      background: trimmed,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore — downstream screens will re-write
    }
    router.push(`/onboard/proud?profile=${profile}`);
  }

  const canContinue = background.trim().length > 0;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tell us about your work
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Paste your LinkedIn About section, your resume, or just describe
          your current role and a project you&apos;re proud of. The more you
          share, the sharper your assessment.
        </p>

        <p className="mt-4 text-xs text-gray-500">
          We use this only to generate your assessment.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:no-underline"
          >
            How we handle your data
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="mt-6" noValidate>
          <label htmlFor="background" className="sr-only">
            Your background
          </label>
          <textarea
            id="background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={14}
            placeholder="Paste your text here."
            className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            aria-describedby="background-hint"
          />
          <p id="background-hint" className="mt-2 text-xs text-gray-500">
            Pasted text only — not a URL or a link.
          </p>

          <div className="mt-8 flex items-center justify-end">
            <button
              type="submit"
              disabled={!canContinue}
              className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
