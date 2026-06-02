"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileId } from "@/lib/profiles";

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

// Verbatim from spec §5. Question ids and option values are stable; option
// `label` strings are what we send to the Claude API so the LLM sees the
// user's actual choice text, not an opaque code.
const questions: Question[] = [
  {
    id: "ai_experience",
    prompt: "How would you describe your hands-on experience with AI tools today?",
    options: [
      { value: "daily", label: "I use them daily and want to go deeper" },
      { value: "experimented", label: "I've experimented but don't feel fluent" },
      { value: "barely", label: "I've barely touched them" },
      { value: "no_start", label: "I'm not sure where to start" },
    ],
  },
  {
    id: "motivation",
    prompt: "What's pushing you to make a move now?",
    options: [
      { value: "automation", label: "My current work is being automated or devalued" },
      { value: "opportunity", label: "I see opportunity and want to get ahead of it" },
      { value: "bored", label: "I'm bored and want more meaningful work" },
      { value: "independence", label: "I want independence from traditional employment" },
    ],
  },
  {
    id: "one_year",
    prompt: "A year from now, what does success look like?",
    options: [
      { value: "new_role", label: "A new role at a company — higher up or a new function" },
      { value: "consulting", label: "Running my own consulting or freelance practice" },
      { value: "startup", label: "Building products or a startup of my own" },
      { value: "ai_expert", label: "Same role, but now the AI-fluent expert others rely on" },
    ],
  },
  {
    id: "weekly_hours",
    prompt: "Realistically, how much time can you commit each week?",
    options: [
      { value: "2_3", label: "2–3 hours — slow and steady" },
      { value: "4_6", label: "4–6 hours — serious but balanced" },
      { value: "7_10", label: "7–10 hours — this is a priority" },
      { value: "10_plus", label: "10+ hours — I'm going all in" },
    ],
  },
  {
    id: "strongest_asset",
    prompt: "What's your strongest professional asset?",
    options: [
      { value: "domain", label: "Deep domain or industry expertise" },
      { value: "network", label: "A broad network and strong relationships" },
      { value: "leadership", label: "Leadership and team experience" },
      { value: "creativity", label: "Creativity and communication" },
      { value: "analytical", label: "Analytical and problem-solving skills" },
    ],
  },
];

const STORAGE_KEY = "careerpilot:onboarding";

interface QuestionnaireProps {
  profile: ProfileId;
}

export function Questionnaire({ profile }: QuestionnaireProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const hasAnswer = Boolean(answers[currentQuestion.id]);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  function handleSelect(label: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: label }));
  }

  function handleBack() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleNext() {
    if (!hasAnswer) return;
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handleSubmit() {
    // Preserve background, proudPoint, reviewSummary, and reviewCorrection
    // captured earlier in the intake. Drop any cached assessment/selector
    // output because the answers may have changed.
    let background: string | undefined;
    let proudPoint: string | undefined;
    let reviewSummary: string | undefined;
    let reviewCorrection: string | undefined;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const existing = JSON.parse(raw) as {
          background?: unknown;
          proudPoint?: unknown;
          reviewSummary?: unknown;
          reviewCorrection?: unknown;
        };
        if (typeof existing.background === "string" && existing.background.trim()) {
          background = existing.background;
        }
        if (typeof existing.proudPoint === "string" && existing.proudPoint.trim()) {
          proudPoint = existing.proudPoint;
        }
        if (typeof existing.reviewSummary === "string" && existing.reviewSummary.trim()) {
          reviewSummary = existing.reviewSummary;
        }
        if (typeof existing.reviewCorrection === "string" && existing.reviewCorrection.trim()) {
          reviewCorrection = existing.reviewCorrection;
        }
      }
    } catch {
      // ignore — treat as no prior intake state
    }

    const payload = {
      profile,
      background,
      proudPoint,
      reviewSummary,
      reviewCorrection,
      answers,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage can throw in private modes — navigate anyway; the
      // assessment page will surface a useful error if the payload is missing.
    }
    router.push("/onboard/assessment");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-black transition-all"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <h1 className="mt-10 text-2xl font-semibold tracking-tight">
          {currentQuestion.prompt}
        </h1>

        <fieldset className="mt-6 space-y-2">
          <legend className="sr-only">{currentQuestion.prompt}</legend>
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.label;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center rounded-md border p-4 text-sm transition focus-within:ring-2 focus-within:ring-black ${
                  isSelected
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option.label}
                  checked={isSelected}
                  onChange={() => handleSelect(option.label)}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAnswer}
            className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white transition disabled:opacity-40"
          >
            {isLast ? "Continue" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}
