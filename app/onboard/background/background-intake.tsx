"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import type { ProfileId } from "@/lib/profiles";

const STORAGE_KEY = "careerpilot:onboarding";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT_ATTR = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const ALLOWED_EXT_RE = /\.(pdf|docx|txt)$/i;

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

type UploadState =
  | { kind: "idle" }
  | { kind: "reading"; filename: string }
  | { kind: "error"; message: string }
  | { kind: "note"; message: string };

// Amendment 5 §5a.1: Skip is no longer offered here — the skip framing
// moved to /onboard/proud. Background is the foundational context for
// every later step (review summary, assessment, selector).
//
// Resume upload (post-Amendment 6): an additive control above the
// textarea. The parser produces plain text that lands in the existing
// `background` state; everything downstream is untouched.
export function BackgroundIntake({ profile }: BackgroundIntakeProps) {
  const router = useRouter();
  const [background, setBackground] = useState("");
  const [upload, setUpload] = useState<UploadState>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input value so picking the same file twice re-triggers.
    event.target.value = "";
    if (!file) return;

    // Client-side validations — instant feedback before the network round-trip.
    if (!ALLOWED_EXT_RE.test(file.name)) {
      setUpload({
        kind: "error",
        message:
          "We can read PDF, Word, or text files. Paste your text below instead.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setUpload({
        kind: "error",
        message: "That file's over 4 MB. Try a smaller file, or paste your text below.",
      });
      return;
    }

    // Replace-if-empty: don't overwrite the user's existing pasted text.
    if (background.trim().length > 0) {
      setUpload({
        kind: "note",
        message:
          "You already have text below — clear it first if you want to use this file.",
      });
      return;
    }

    setUpload({ kind: "reading", filename: file.name });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/onboard/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as
        | {
            success: boolean;
            data?: { text: string };
            error?: string;
            code?: string;
          }
        | null;
      if (!res.ok || !data?.success || !data.data?.text) {
        setUpload({
          kind: "error",
          message:
            data?.error ?? "We couldn't read that file. Paste your text below instead.",
        });
        return;
      }
      // Decision: only set the textarea when it's currently empty.
      // We re-check here because the user could have typed while we
      // were reading the file.
      setBackground((prev) => (prev.trim().length === 0 ? data.data!.text : prev));
      setUpload({ kind: "idle" });
    } catch {
      setUpload({
        kind: "error",
        message:
          "Network issue while reading your file. Paste your text below instead.",
      });
    }
  }

  function handlePickFile() {
    setUpload({ kind: "idle" });
    fileInputRef.current?.click();
  }

  const canContinue = background.trim().length > 0;
  const isReading = upload.kind === "reading";

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
          {/* Upload control — sits above the textarea so file users
              don't scroll past the paste affordance. */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload a resume file"
            />
            <button
              type="button"
              onClick={handlePickFile}
              disabled={isReading}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Reading your file…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload a file (PDF, Word, or text)
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Max 4 MB. We extract the text and put it below — you can
              edit before continuing.
            </p>
            {upload.kind === "error" && (
              <p
                className="mt-2 text-xs text-red-600"
                role="alert"
                aria-live="polite"
              >
                {upload.message}
              </p>
            )}
            {upload.kind === "note" && (
              <p
                className="mt-2 text-xs text-gray-600"
                role="status"
                aria-live="polite"
              >
                {upload.message}
              </p>
            )}
          </div>

          <div className="mt-6">
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
              Pasted or uploaded text — not a URL or a link.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-end">
            <button
              type="submit"
              disabled={!canContinue || isReading}
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
