import { Check } from "lucide-react";
import type {
  Assessment,
  ExposedWorkItem,
  Factor,
  InputDepth,
} from "@/lib/assessment";

// Pure render — no hooks, no client-only APIs. Both /onboard/assessment
// (client, sessionStorage-backed) and /assessment (server, DB-backed) use
// this. Parents pass their own refinement-path UI and bottom CTA via slots.
//
// Amendment 5: renders the expanded assessment shape — inputDepth callout
// (prominent for "thin", subtle otherwise), exposedWork cards with
// representative tools and a branch suggestion per item, and the renamed
// defensibleWork list. Ordering still per §13: defensible first, then
// factors + exposed work, then scores, then constructive path.

interface AssessmentDisplayProps {
  assessment: Assessment;
  refinementSlot: React.ReactNode;
  bottomCta: React.ReactNode;
}

export function AssessmentDisplay({
  assessment,
  refinementSlot,
  bottomCta,
}: AssessmentDisplayProps) {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-16">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your initial assessment
          </h1>
          <p className="mt-2 text-sm text-gray-600">{assessment.occupationLabel}</p>
          <p className="mt-4 text-sm italic text-gray-600">
            This is a first read based on what you&apos;ve shared so far. It
            sharpens as you add detail and as you make progress.
          </p>

          {/* §13 principle 10: surface inputDepth, don't hide it. Prominent
              callout when input is thin; subtle line otherwise. */}
          <InputDepthCallout
            depth={assessment.inputDepth}
            note={assessment.inputDepthNote}
          />
        </header>

        {/* 1. Defensible — "Still yours" (§13 principle 2: leads) */}
        <section aria-labelledby="defensible-heading">
          <h2 id="defensible-heading" className="text-xl font-semibold">
            What&apos;s still yours
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The parts of your role that don&apos;t go away.
          </p>
          <ul className="mt-6 space-y-3">
            {assessment.defensibleWork.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-4"
              >
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-black" aria-hidden="true" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 2. Factor breakdown (§13 principle 6) + exposed-work cards */}
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

          <div className="mt-10">
            <h3 className="text-base font-semibold">
              The work most exposed — and where to branch
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              For each exposed area: the tools that already do it, and an
              adjacent area less exposed where your judgment still leads.
            </p>
            <div className="mt-5 space-y-3">
              {assessment.exposedWork.map((item, i) => (
                <ExposedWorkCard key={i} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* 3. Three scores (§13 principle 3 — never shown alone) */}
        <section aria-labelledby="scores-heading">
          <h2 id="scores-heading" className="text-xl font-semibold">
            Your numbers
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Where you stand today, where you&apos;re headed, and where the plan
            takes you.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <ScoreTile label="Today" value={assessment.scoreToday} />
            <ScoreTile label="2028, no action" value={assessment.scoreProjected} />
            <ScoreTile
              label="2028, with your plan"
              value={assessment.scoreWithPlan}
              emphasized
            />
          </div>
        </section>

        {/* 4. Constructive — reasoning + reframe + refinement slot + CTA */}
        <section aria-labelledby="meaning-heading">
          <h2 id="meaning-heading" className="text-xl font-semibold">
            What this means
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800">
            {assessment.reasoning.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="mt-8 rounded-md border-l-2 border-black bg-gray-50 px-4 py-3 text-sm">
            <strong className="font-medium">
              Exposure is a starting line, not a verdict.
            </strong>{" "}
            What you do next is what changes the number.
          </div>

          {refinementSlot}

          <div className="mt-10">{bottomCta}</div>
        </section>
      </div>
    </main>
  );
}

function InputDepthCallout({
  depth,
  note,
}: {
  depth: InputDepth;
  note: string;
}) {
  if (depth === "thin") {
    return (
      <div
        role="note"
        className="mt-6 rounded-md border-2 border-black bg-white px-4 py-3 text-sm text-gray-800"
      >
        <strong className="font-medium">A first read with limited context.</strong>{" "}
        {note}
      </div>
    );
  }
  if (depth === "moderate") {
    return (
      <p className="mt-4 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Calibration:</span> {note}
      </p>
    );
  }
  return <p className="mt-4 text-xs text-gray-500">{note}</p>;
}

function ExposedWorkCard({ item }: { item: ExposedWorkItem }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{item.work}</p>
      <p className="mt-3 text-xs text-gray-600">
        <span className="font-medium text-gray-800">Tools that automate or enhance this:</span>{" "}
        tools like {formatTools(item.tools)}.
      </p>
      <p className="mt-2 text-xs text-gray-600">
        <span className="font-medium text-gray-800">Less exposed adjacent work:</span>{" "}
        {item.branchTo}
      </p>
    </div>
  );
}

function formatTools(tools: string[]): string {
  if (tools.length === 0) return "(none)";
  if (tools.length === 1) return tools[0];
  if (tools.length === 2) return `${tools[0]} or ${tools[1]}`;
  return `${tools.slice(0, -1).join(", ")}, or ${tools[tools.length - 1]}`;
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
