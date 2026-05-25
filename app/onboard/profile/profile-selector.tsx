"use client";

import { useRouter } from "next/navigation";
import { Compass, RefreshCw, Sparkles, type LucideIcon } from "lucide-react";
import type { ProfileId } from "@/lib/profiles";

interface Persona {
  id: ProfileId;
  title: string;
  description: string;
  Icon: LucideIcon;
}

// Display titles are deliberately softened from the spec's internal persona
// names (Veteran/Threatened/Starter). Per §13 design principles, labelling a
// user as "Threatened" on the first screen of the product is fear-forward;
// the internal id stays "threatened" so URL/DB/API are unchanged.
const personas: Persona[] = [
  {
    id: "veteran",
    title: "Veteran",
    description:
      "Decades of domain expertise. Redirecting toward consulting or an AI-fluent version of your work.",
    Icon: Compass,
  },
  {
    id: "threatened",
    title: "Pivoting",
    description:
      "Mid-career, with your role being reshaped by AI. Choosing a defensible, AI-fluent next move.",
    Icon: RefreshCw,
  },
  {
    id: "starter",
    title: "Starting out",
    description:
      "Entering a job market that AI has already changed. Picking a direction before you settle in.",
    Icon: Sparkles,
  },
];

export function ProfileSelector() {
  const router = useRouter();

  function handleSelect(id: ProfileId) {
    router.push(`/onboard/questions?profile=${id}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Which sounds most like you?
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          We&apos;ll tune the rest of the setup to where you are now. You can
          change this later.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {personas.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona.id)}
              className="group flex flex-col items-start rounded-lg border border-gray-200 bg-white p-6 text-left transition hover:border-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
              aria-label={`Select ${persona.title}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                <persona.Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{persona.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{persona.description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
