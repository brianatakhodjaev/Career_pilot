"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

// Amendment 6 §15.7 — reflection answers persist to ReflectionAnswer.
// Decision G: debounced (500ms) autosave per textarea with a
// per-textarea ✓ / Saving indicator.
// Decision H: append-log on the server — every save inserts a new row,
// preserving the longitudinal record across re-takes.

interface ReflectionFormProps {
  plateItemId: string;
  prompts: string[];
  initialAnswers: Record<string, string>; // keyed by prompt text
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 500;

export function ReflectionForm({
  plateItemId,
  prompts,
  initialAnswers,
}: ReflectionFormProps) {
  return (
    <div className="space-y-5">
      {prompts.map((prompt, i) => (
        <ReflectionPromptInput
          key={`${prompt}-${i}`}
          plateItemId={plateItemId}
          prompt={prompt}
          initialAnswer={initialAnswers[prompt] ?? ""}
        />
      ))}
    </div>
  );
}

function ReflectionPromptInput({
  plateItemId,
  prompt,
  initialAnswer,
}: {
  plateItemId: string;
  prompt: string;
  initialAnswer: string;
}) {
  const [answer, setAnswer] = useState<string>(initialAnswer);
  const [status, setStatus] = useState<SaveStatus>(
    initialAnswer.length > 0 ? "saved" : "idle",
  );
  const lastSavedRef = useRef<string>(initialAnswer);

  useEffect(() => {
    // Skip if the value hasn't changed since the last save.
    if (answer === lastSavedRef.current) return;

    const handle = window.setTimeout(() => {
      void save(answer);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  async function save(value: string) {
    setStatus("saving");
    try {
      const res = await fetch("/api/reflections/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateItemId, prompt, answer: value }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      lastSavedRef.current = value;
      setStatus(value.length > 0 ? "saved" : "idle");
    } catch {
      setStatus("error");
    }
  }

  const inputId = `reflection-${promptSlug(prompt)}`;
  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-900"
      >
        {prompt}
      </label>
      <textarea
        id={inputId}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Your answer."
        className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      />
      <StatusLine status={status} />
    </div>
  );
}

function StatusLine({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <p
        className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500"
        aria-live="polite"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Saving…
      </p>
    );
  }
  if (status === "saved") {
    return (
      <p
        className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500"
        aria-live="polite"
      >
        <Check className="h-3 w-3" aria-hidden="true" />
        Saved
      </p>
    );
  }
  if (status === "error") {
    return (
      <p
        className="mt-1 text-xs text-red-600"
        role="alert"
      >
        Couldn&apos;t save — your network may be down.
      </p>
    );
  }
  return <p className="mt-1 text-xs text-transparent">·</p>;
}

function promptSlug(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
