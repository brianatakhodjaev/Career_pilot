"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type {
  BuffetMetadata,
  SelectorItem,
  SelectorOutput,
} from "@/lib/selector";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  background?: string;
  answers?: Record<string, string>;
  selector?: SelectorOutput;
  buffet?: BuffetMetadata[];
}

type ErrorKind = null | "missing" | "api" | "network";

// Map the questionnaire's weekly_hours label to a concrete number for
// the plate's hoursPerWeek field. Defaults to 4 if the label is missing
// or unrecognised.
function parseHoursPerWeek(label: string | undefined): number {
  if (!label) return 4;
  if (label.startsWith("2–3") || label.startsWith("2-3")) return 3;
  if (label.startsWith("4–6") || label.startsWith("4-6")) return 5;
  if (label.startsWith("7–10") || label.startsWith("7-10")) return 8;
  if (label.startsWith("10+")) return 12;
  return 4;
}

export function ConfirmView() {
  const router = useRouter();
  const [selector, setSelector] = useState<SelectorOutput | null>(null);
  const [buffet, setBuffet] = useState<BuffetMetadata[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(4);
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

    if (!payload.selector || !payload.buffet) {
      setError("missing");
      return;
    }

    setSelector(payload.selector);
    setBuffet(payload.buffet);
    setHoursPerWeek(parseHoursPerWeek(payload.answers?.weekly_hours));
  }, []);

  async function handleConfirm() {
    if (!selector) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/plates/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hoursPerWeek,
          pacing: selector.pacing,
          items: selector.items,
        }),
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
        body="Go back to your plan options and pick at least one core unit."
        cta={
          <Link
            href="/onboard/plans"
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            See your plan options
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

  if (!hydrated || !selector) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-black" aria-hidden="true" />
      </main>
    );
  }

  return (
    <PlateReview
      selector={selector}
      buffet={buffet}
      hoursPerWeek={hoursPerWeek}
      onConfirm={handleConfirm}
      submitting={submitting}
    />
  );
}

function PlateReview({
  selector,
  buffet,
  hoursPerWeek,
  onConfirm,
  submitting,
}: {
  selector: SelectorOutput;
  buffet: BuffetMetadata[];
  hoursPerWeek: number;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const buffetByNumber = useMemo(
    () => new Map(buffet.map((b) => [b.unitNumber, b])),
    [buffet],
  );

  const coreItems = selector.items
    .filter((i) => i.tag === "core")
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const laterCount = selector.items.filter((i) => i.tag === "later").length;
  const skipCount = selector.items.filter((i) => i.tag === "skip").length;

  const estimatedWeeks = Math.max(
    1,
    Math.ceil(coreItems.length / selector.pacing.unitsPerWeek),
  );

  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Ready to start?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Here&apos;s your plate in full. You can change your mind later.
          </p>
        </header>

        {/* Plate summary */}
        <section className="mt-10 rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm leading-relaxed text-gray-800">{selector.summary}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-gray-600 sm:grid-cols-3">
            <div>
              <p className="uppercase tracking-wider text-gray-500">Core units</p>
              <p className="mt-1 text-base font-semibold text-gray-900 tabular-nums">
                {coreItems.length}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-gray-500">Pacing</p>
              <p className="mt-1 text-base font-semibold text-gray-900 tabular-nums">
                {selector.pacing.unitsPerWeek}/week
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-gray-500">Estimated</p>
              <p className="mt-1 text-base font-semibold text-gray-900 tabular-nums">
                {estimatedWeeks} {estimatedWeeks === 1 ? "week" : "weeks"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            At your stated {hoursPerWeek} hours per week.{" "}
            {(laterCount > 0 || skipCount > 0) && (
              <>
                You also marked {laterCount} for later and {skipCount} to skip;
                those stay out of your dashboard for now.
              </>
            )}
          </p>
        </section>

        {/* Core units in order */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your core units</h2>
          <p className="mt-2 text-sm text-gray-600">
            In order. {coreItems.length === 1 ? "Just one to start." : "You'll work through them at your pace."}
          </p>
          <div className="mt-6 space-y-4">
            {coreItems.map((item, index) => {
              const unit = buffetByNumber.get(item.unitNumber);
              if (!unit) return null;
              return (
                <CoreUnitCard
                  key={item.unitNumber}
                  index={index}
                  item={item}
                  unit={unit}
                />
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <section className="mt-12 flex items-center justify-between gap-4">
          <Link
            href="/onboard/plans"
            className="inline-flex items-center gap-1 text-sm text-gray-600 underline underline-offset-4 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to plan options
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

function CoreUnitCard({
  index,
  item,
  unit,
}: {
  index: number;
  item: SelectorItem;
  unit: BuffetMetadata;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold">
          {index + 1}. {unit.title}
        </h3>
        <p className="flex-shrink-0 text-xs text-gray-500">
          Unit {unit.unitNumber}
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {unit.tier}
        {" · "}
        {unit.timeRangeMin}–{unit.timeRangeMax} min
        {" · "}
        {unit.exerciseFormat}
      </p>
      <p className="mt-3 text-sm text-gray-700">{unit.skill}</p>
      <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm italic text-gray-700">
        {item.rationale}
      </p>
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
