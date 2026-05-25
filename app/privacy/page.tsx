import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — CareerPilot",
  description: "How CareerPilot handles your data.",
};

export default function PrivacyPage() {
  return (
    <main className="px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-4 text-sm text-gray-600">
          The full privacy policy will live here. This is a placeholder while
          we finalize the data-handling architecture.
        </p>

        <section className="mt-10 space-y-4 text-sm leading-relaxed text-gray-800">
          <h2 className="text-base font-semibold">What we collect today</h2>
          <p>
            What you type into onboarding — the persona you pick, the
            background you paste, your questionnaire answers, and the
            assessments and plans we generate from them. Account credentials
            for sign-in.
          </p>

          <h2 className="text-base font-semibold">What we use it for</h2>
          <p>
            Only to generate your assessment and plan, and to show them back
            to you across sessions. We do not sell this data, and we do not
            use it to train shared models.
          </p>

          <h2 className="text-base font-semibold">Where it lives</h2>
          <p>
            Account and onboarding data live in our database. The Claude API
            call to generate your assessment and plan passes your inputs to
            Anthropic per their{" "}
            <a
              href="https://www.anthropic.com/legal/commercial-terms"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:no-underline"
            >
              commercial terms
            </a>
            .
          </p>

          <h2 className="text-base font-semibold">Coming soon</h2>
          <p>
            Detailed retention policy, deletion / export controls, and a
            full data-handling architecture document. Until then, write to
            us with any specific questions about your data.
          </p>
        </section>

        <p className="mt-12 text-sm">
          <Link
            href="/onboard/background"
            className="underline underline-offset-4 hover:no-underline"
          >
            ← Back to your background
          </Link>
        </p>
      </div>
    </main>
  );
}
