"use client";

import { useRouter } from "next/navigation";
import { Compass, RefreshCw, Sparkles, type LucideIcon } from "lucide-react";

type ProfileId = "veteran" | "threatened" | "starter";

interface Persona {
  id: ProfileId;
  title: string;
  description: string;
  Icon: LucideIcon;
}

const personas: Persona[] = [
  {
    id: "veteran",
    title: "Veteran",
    description:
      "Decades of domain expertise. You want to redirect toward consulting or an AI-fluent version of your work.",
    Icon: Compass,
  },
  {
    id: "threatened",
    title: "Threatened",
    description:
      "Your current role is being reshaped by AI. You want a defensive but ambitious pivot.",
    Icon: RefreshCw,
  },
  {
    id: "starter",
    title: "Starter",
    description:
      "Entering a job market that AI has already changed. You want direction.",
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
