"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Assessment } from "@/lib/assessment";
import type {
  BuffetMetadata,
  SelectorItem,
  SelectorOutput,
  SelectorTag,
} from "@/lib/selector";
import { SELECTOR_TAGS } from "@/lib/selector";

const STORAGE_KEY = "careerpilot:onboarding";

interface StoredPayload {
  profile?: string;
  background?: string;
  answers?: Record<string, string>;
  assessment?: Assessment;
  selector?: SelectorOutput;
  buffet?: BuffetMetadata[];
}

type ErrorKind = null | "missing" | "api" | "network";

// Selector call is ~6-15s — much faster than the legacy invention prompt
// (50s for 3 plans). Two cycling messages is enough.
const LOADING_MESSAGES = [
  "Matching units to your assessment…",
  "Marking up your plan options…",
];

const TAG_LABEL: Record<SelectorTag, string> = {
  core: "Core",
  later: "Later",
  skip: "Skip",
};

const TAG_DESCRIPTION: Record<SelectorTag, string> = {
  core: "Units in your plan — you commit to doing these.",
  later: "Useful but not essential right now. You can add these after completing core.",
  skip: "Not relevant to your situation. Hidden from your dashboard.",
};

export function PlansView() {
  const router = useRouter();
  const [buffet, setBuffet] = useState<BuffetMetadata[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [unitsPerWeek, setUnitsPerWeek] = useState<number>(1);
  // Local mutable copy of selector items so the user can adjust tags.
  const [items, setItems] = useState<SelectorItem[]>([]);
  const [error, setError] = useState<ErrorKind>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 5000);
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

    if (!payload.profile || !payload.answers || !payload.assessment) {
      setError("missing");
      return;
    }

    // Reuse cached selector on back-button revisits (don't re-charge).
    if (payload.selector && payload.buffet && retryNonce === 0) {
      setSummary(payload.selector.summary);
      setUnitsPerWeek(payload.selector.pacing.unitsPerWeek);
      setItems(payload.selector.items);
      setBuffet(payload.buffet);
      setReady(true);
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
      .then(
        (data: {
          success: boolean;
          data?: { selector: SelectorOutput; buffet: BuffetMetadata[] };
          error?: string;
        }) => {
          if (cancelled) return;
          if (!data.success || !data.data) {
            setError("api");
            return;
          }
          const { selector, buffet: serverBuffet } = data.data;
          setSummary(selector.summary);
          setUnitsPerWeek(selector.pacing.unitsPerWeek);
          setItems(selector.items);
          setBuffet(serverBuffet);
          setReady(true);
          try {
            sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                ...payload,
                selector,
                buffet: serverBuffet,
              }),
            );
          } catch {
            // private mode storage write failure — in-memory state is fine
          }
        },
      )
      .catch(() => {
        if (cancelled) return;
        setError("network");
      });

    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  function handleTagChange(unitNumber: number, newTag: SelectorTag) {
    setItems((prev) =>
      prev.map((it) =>
        it.unitNumber === unitNumber ? { ...it, tag: newTag } : it,
      ),
    );
  }

  function handleContinue() {
    // Persist adjusted selector items + buffet for /onboard/confirm.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as StoredPayload) : {};
      const updatedSelector: SelectorOutput = {
        summary,
        pacing: { unitsPerWeek },
        items,
      };
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...existing,
          selector: updatedSelector,
          buffet,
        }),
      );
    } catch {
      // best-effort
    }
    router.push("/onboard/confirm");
  }

  if (error === "missing") {
    return (
      <CenteredMessage
        heading="We need a bit more from you"
        body="We couldn't find your assessment. Start the onboarding again and we'll bring you back here."
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
        heading="We couldn't generate your menu"
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
          <p className="mt-2 text-xs text-gray-400">
            This usually takes about 10 seconds.
          </p>
        </div>
      </main>
    );
  }

  return (
    <MenuDisplay
      summary={summary}
      unitsPerWeek={unitsPerWeek}
      items={items}
      buffet={buffet}
      onTagChange={handleTagChange}
      onContinue={handleContinue}
    />
  );
}

function MenuDisplay({
  summary,
  unitsPerWeek,
  items,
  buffet,
  onTagChange,
  onContinue,
}: {
  summary: string;
  unitsPerWeek: number;
  items: SelectorItem[];
  buffet: BuffetMetadata[];
  onTagChange: (unitNumber: number, newTag: SelectorTag) => void;
  onContinue: () => void;
}) {
  // Join items with buffet metadata for display.
  const enriched = useMemo(() => {
    const buffetByNumber = new Map(buffet.map((b) => [b.unitNumber, b]));
    return items
      .map((item) => {
        const unit = buffetByNumber.get(item.unitNumber);
        return unit ? { item, unit } : null;
      })
      .filter(Boolean) as Array<{ item: SelectorItem; unit: BuffetMetadata }>;
  }, [items, buffet]);

  const grouped: Record<SelectorTag, Array<{ item: SelectorItem; unit: BuffetMetadata }>> = {
    core: [],
    later: [],
    skip: [],
  };
  for (const entry of enriched) {
    grouped[entry.item.tag].push(entry);
  }
  // Sort by orderIndex within each group.
  for (const tag of SELECTOR_TAGS) {
    grouped[tag].sort((a, b) => a.item.orderIndex - b.item.orderIndex);
  }

  const coreCount = grouped.core.length;
  const canContinue = coreCount >= 1;

  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Your plan options</h1>
          <p className="mt-2 text-sm text-gray-600">
            Every unit in the library is marked up for you. Move units between
            <span className="font-medium"> core</span>,
            <span className="font-medium"> later</span>, and
            <span className="font-medium"> skip</span> if the markup doesn&apos;t
            fit your situation.
          </p>
        </header>

        <section className="mt-8 rounded-md border-l-2 border-black bg-gray-50 px-4 py-3 text-sm text-gray-800">
          <p className="leading-relaxed">{summary}</p>
          <p className="mt-3 text-xs text-gray-600">
            Pacing: <span className="font-medium">{unitsPerWeek}</span> unit{unitsPerWeek === 1 ? "" : "s"} per week.
          </p>
        </section>

        {SELECTOR_TAGS.map((tag) => (
          <TagGroup
            key={tag}
            tag={tag}
            entries={grouped[tag]}
            onTagChange={onTagChange}
          />
        ))}

        <div className="mt-12 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            {coreCount === 0
              ? "Tag at least one unit as core to continue."
              : `${coreCount} core unit${coreCount === 1 ? "" : "s"} selected.`}
          </p>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Review and confirm
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}

function TagGroup({
  tag,
  entries,
  onTagChange,
}: {
  tag: SelectorTag;
  entries: Array<{ item: SelectorItem; unit: BuffetMetadata }>;
  onTagChange: (unitNumber: number, newTag: SelectorTag) => void;
}) {
  return (
    <section className="mt-10" aria-labelledby={`group-${tag}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`group-${tag}`} className="text-lg font-semibold">
          {TAG_LABEL[tag]}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({entries.length})
          </span>
        </h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">{TAG_DESCRIPTION[tag]}</p>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No units in this group.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map(({ item, unit }) => (
            <UnitCard
              key={item.unitNumber}
              item={item}
              unit={unit}
              onTagChange={onTagChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function UnitCard({
  item,
  unit,
  onTagChange,
}: {
  item: SelectorItem;
  unit: BuffetMetadata;
  onTagChange: (unitNumber: number, newTag: SelectorTag) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            {unit.title}
            <span className="ml-2 text-xs font-normal text-gray-500">
              · Unit {unit.unitNumber}
            </span>
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {unit.tier}
            {" · "}
            {unit.timeRangeMin}–{unit.timeRangeMax} min
            {" · "}
            {unit.exerciseFormat}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700">{unit.skill}</p>

      <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm italic text-gray-700">
        {item.rationale}
      </p>

      <div className="mt-4">
        <TagPills
          value={item.tag}
          onChange={(t) => onTagChange(item.unitNumber, t)}
        />
      </div>
    </div>
  );
}

function TagPills({
  value,
  onChange,
}: {
  value: SelectorTag;
  onChange: (tag: SelectorTag) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5"
      role="radiogroup"
      aria-label="Tag for this unit"
    >
      {SELECTOR_TAGS.map((tag) => {
        const active = tag === value;
        return (
          <button
            key={tag}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(tag)}
            className={`rounded-sm px-3 py-1 text-xs font-medium transition ${
              active
                ? "bg-black text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {TAG_LABEL[tag]}
          </button>
        );
      })}
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
