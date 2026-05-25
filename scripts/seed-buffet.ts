// Buffet seeding script. Idempotent: upserts each unit by unitNumber.
// Run with: npx tsx scripts/seed-buffet.ts
//
// Source-of-truth content for each unit lives in docs/proposals/ until
// approved, then is mirrored here. When a proposal doc changes, update
// the corresponding entry below and re-run.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import type { Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

interface UnitSeed {
  unitNumber: number;
  title: string;
  skill: string;
  tier: "Foundation" | "Applied" | "Transformation";
  timeRangeMin: number;
  timeRangeMax: number;
  exerciseFormat: string;
  prerequisites: number[];
  isPublished: boolean;
  content: Record<string, unknown>;
}

// Mirrors docs/proposals/buffet-unit-01.md (v2 post cross-model critique).
const UNIT_01: UnitSeed = {
  unitNumber: 1,
  title: "Working with AI assistants well",
  skill:
    "Get genuinely useful output from an AI assistant by briefing it properly — and know when not to trust what it gives you back.",
  tier: "Foundation",
  timeRangeMin: 15,
  timeRangeMax: 30,
  exerciseFormat: "Compare",
  prerequisites: [],
  isPublished: true,
  content: {
    whyThisMatters:
      "Most professionals use an AI assistant like a search box: one quick, vague question, a mediocre answer, and a quiet conclusion that AI is overhyped. The people getting real value do something different — they brief the AI the way they would brief a capable new colleague. Same tool, completely different results.\n\nThe gap between those two is not intelligence, seniority, or technical skill. It is knowing how to ask. (And it is normal to start with vague prompts — search engines trained all of us to type three words and hit enter. This is a different interaction style, and it is learnable.) This is the most leveraged half-hour in the whole curriculum: every other AI skill depends on being able to communicate with the tool.",
    teaching: [
      {
        id: "context",
        title: "Context.",
        body: "The AI knows nothing about your situation, company, audience, or goal unless you tell it. State who the output is for, what you are trying to achieve, and any constraints that matter.",
      },
      {
        id: "good",
        title: 'Define "good."',
        body: '"Write a project update" could mean anything. "Write a 150-word update for my manager — factual tone, lead with status, then flag two risks" gives a target. Specify format, length, tone, and audience.',
      },
      {
        id: "example",
        title: "Show an example.",
        body: 'If you have a past document in the style you want, paste it and say "match this." AI is exceptional at matching a pattern — one good example often beats three paragraphs of instruction.',
      },
      {
        id: "iterate",
        title: "Iterate.",
        body: 'The first answer is a draft. The real value is in the next two turns: "shorter," "less formal," "you missed the budget point." Great results come from iterating, not from one perfect prompt.',
      },
      {
        id: "verify",
        title: "Verify — the brakes.",
        body: "AI output is persuasive, not automatically correct. It can state wrong facts and invented numbers with total confidence. Treat it as a fast draft partner, not a final authority — especially for facts, figures, legal or compliance points, and anything company-specific. Always check before you rely on it. (The full skill of verifying and bounding AI output is Unit 07 — this is the one sentence you need until then.)",
      },
    ],
    exercise: {
      format: "Compare",
      intro: "You will run one task two ways and feel the difference yourself.",
      privacyNote:
        "Do not paste confidential or proprietary information — client names, real financials, internal documents — into a public AI tool. To keep this safe, pick one of the three ready-made tasks below. (If you would rather use a real task of your own, that is fine — just strip out anything proprietary first.)",
      scaffoldTasks: [
        {
          audience: "Admin / operations",
          task: "Draft a clear out-of-office email policy for a 10-person team.",
        },
        {
          audience: "Management",
          task: "Write an outline for constructive performance feedback for a team member who is strong technically but misses deadlines.",
        },
        {
          audience: "Sales / client-facing",
          task: "Prepare a short briefing note for a first call with a prospective client in an industry you choose.",
        },
      ],
      rounds: [
        {
          label: "Round 1 — the quick way",
          instructions:
            "Open your AI assistant. Prompt it the way most people would — a short, vague request. Read the result. Keep it.",
        },
        {
          label: "Round 2 — brief it properly",
          instructions:
            "Start a fresh conversation. This time apply the teaching: give it a role, give it context, define what good looks like, and iterate at least twice on the draft.",
        },
      ],
      outro: "Put the two outputs side by side.",
    },
    reflection: [
      "What one detail improved the Round 2 output the most?",
      "What will you now always include when you ask an AI for something?",
      "Which task on your real plate this week could you run this way?",
    ],
    successCheck:
      "The Round 2 output is something you could use with light editing, while Round 1 would need a real rewrite — and you can name the specific things you added that made the difference. If you can name them, you can repeat them.",
    tools: [
      { name: "ChatGPT", vendor: "OpenAI" },
      { name: "Claude", vendor: "Anthropic" },
      { name: "Gemini", vendor: "Google" },
      { name: "Microsoft Copilot", vendor: "Microsoft" },
    ],
    toolsNote:
      "Works the same across all major AI assistants — use whichever you have. No paid plan needed for this exercise. The skill transfers across all of them.",
    goingDeeper:
      "The systematic version of briefing — repeatable structures, deliberate use of examples and step-by-step reasoning — is Unit 02, Structured prompting. The skill of checking and bounding AI output is Unit 07, Judgment and verification.",
  },
};

const units: UnitSeed[] = [UNIT_01];

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const unit of units) {
      const data = {
        ...unit,
        content: unit.content as Prisma.InputJsonValue,
      };
      await prisma.buffetUnit.upsert({
        where: { unitNumber: unit.unitNumber },
        create: data,
        update: data,
      });
      console.log(`✓ Seeded Unit ${unit.unitNumber}: ${unit.title}`);
    }
    const total = await prisma.buffetUnit.count();
    console.log(`\nBuffet now contains ${total} unit(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
