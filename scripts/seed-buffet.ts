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
// Reshaped to the §15.10 TOC content shape for Amendment 6. The v2
// teaching content is preserved verbatim — only the grouping changes.
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
    objectives: [
      "Brief an AI assistant with role, context, a target for 'good', and an example.",
      "Iterate on a draft instead of accepting the first response.",
      "Recognise when an AI output needs verification before you rely on it.",
    ],
    items: [
      {
        id: "why",
        title: "Why this matters",
        estimatedMinutes: 2,
        required: true,
        kind: "read",
        reading:
          "Most professionals use an AI assistant like a search box: one quick, vague question, a mediocre answer, and a quiet conclusion that AI is overhyped. The people getting real value do something different — they brief the AI the way they would brief a capable new colleague. Same tool, completely different results.\n\nThe gap between those two is not intelligence, seniority, or technical skill. It is knowing how to ask. (And it is normal to start with vague prompts — search engines trained all of us to type three words and hit enter. This is a different interaction style, and it is learnable.) This is the most leveraged half-hour in the whole curriculum: every other AI skill depends on being able to communicate with the tool.",
        exercise: null,
        selfTest: [
          "Can you say in your own words why most people get mediocre AI output?",
        ],
        deeperPrompt: null,
      },
      {
        id: "teaching",
        title: "Brief AI like a colleague",
        estimatedMinutes: 6,
        required: true,
        kind: "read",
        reading:
          '## Context.\n\nThe AI knows nothing about your situation, company, audience, or goal unless you tell it. State who the output is for, what you are trying to achieve, and any constraints that matter.\n\n## Define "good."\n\n"Write a project update" could mean anything. "Write a 150-word update for my manager — factual tone, lead with status, then flag two risks" gives a target. Specify format, length, tone, and audience.\n\n## Show an example.\n\nIf you have a past document in the style you want, paste it and say "match this." AI is exceptional at matching a pattern — one good example often beats three paragraphs of instruction.\n\n## Iterate.\n\nThe first answer is a draft. The real value is in the next two turns: "shorter," "less formal," "you missed the budget point." Great results come from iterating, not from one perfect prompt.\n\n## Verify — the brakes.\n\nAI output is persuasive, not automatically correct. It can state wrong facts and invented numbers with total confidence. Treat it as a fast draft partner, not a final authority — especially for facts, figures, legal or compliance points, and anything company-specific. Always check before you rely on it. (The full skill of verifying and bounding AI output is Unit 07 — this is the one sentence you need until then.)',
        exercise: null,
        selfTest: [
          "Can you name the five things to include when briefing AI? (Context, define good, show an example, iterate, verify.)",
          "Can you spot the difference between a vague prompt and a properly briefed one?",
        ],
        deeperPrompt: null,
      },
      {
        id: "exercise",
        title: "Run it two ways",
        estimatedMinutes: 15,
        required: true,
        kind: "exercise",
        reading:
          "You will run one task two ways and feel the difference yourself.\n\n**Privacy note.** Do not paste confidential or proprietary information — client names, real financials, internal documents — into a public AI tool. To keep this safe, pick one of the three ready-made tasks below. If you would rather use a real task of your own, that is fine — just strip out anything proprietary first.",
        exercise: {
          format: "Compare",
          instructions:
            "Pick one of the scaffolded tasks. Run it as Round 1, then as Round 2. Put the two outputs side by side and feel the difference.",
          scaffoldedTasks: [
            {
              id: "ops",
              audience: "Admin / operations",
              task: "Draft a clear out-of-office email policy for a 10-person team.",
            },
            {
              id: "mgmt",
              audience: "Management",
              task: "Write an outline for constructive performance feedback for a team member who is strong technically but misses deadlines.",
            },
            {
              id: "sales",
              audience: "Sales / client-facing",
              task: "Prepare a short briefing note for a first call with a prospective client in an industry you choose.",
            },
          ],
          scaffoldedRounds: [
            {
              id: "round-1",
              label: "Round 1 — the quick way",
              instructions:
                "Open your AI assistant. Prompt it the way most people would — a short, vague request. Read the result. Keep it.",
            },
            {
              id: "round-2",
              label: "Round 2 — brief it properly",
              instructions:
                "Start a fresh conversation. This time apply the teaching: give it a role, give it context, define what good looks like, and iterate at least twice on the draft.",
            },
          ],
        },
        // Self-test rendering on exercise items is deferred to Stage 2
        // (workspace lands then). Content lives here now so Stage 2 can
        // surface it without a content re-edit.
        selfTest: [
          "Can you name three things you changed between Round 1 and Round 2?",
          'Can you state what "good" looked like for your chosen task?',
          "Could you re-run this task on a real piece of your work this week?",
        ],
        deeperPrompt:
          "Generate a fresh Compare-format task in a different audience from the one the user picked last time (audiences: admin/ops, management, sales/client-facing). Same Round-1-vs-Round-2 framing. Match the original task's scope: a single deliverable producible in 10–15 minutes, no specialized domain knowledge required.",
      },
      {
        id: "wrap",
        title: "What you learned",
        estimatedMinutes: 2,
        required: true,
        kind: "wrap",
        reading:
          "If you can name the specific things you added in Round 2 that made the difference, you can repeat them. That's the whole skill.\n\nThis works the same across every major AI assistant — use whichever you have. No paid plan is needed for this exercise.",
        exercise: null,
        selfTest: [
          "I can name the changes I made in Round 2 and I could re-run this on a real task this week.",
        ],
        deeperPrompt: null,
      },
      {
        id: "reflect",
        title: "Reflect (60 seconds)",
        estimatedMinutes: 1,
        required: true,
        kind: "wrap",
        reading:
          "Take 60 seconds with the prompts below. Your answers are saved automatically and surface in your longitudinal view so you can see how your thinking changes across units.",
        exercise: null,
        selfTest: ["I've reflected on the prompts above."],
        deeperPrompt: null,
      },
    ],
    reflectionPrompts: [
      "What one detail improved the Round 2 output the most?",
      "What will you now always include when you ask an AI for something?",
      "Which task on your real plate this week could you run this way?",
    ],
    tools: [
      { name: "ChatGPT", vendor: "OpenAI" },
      { name: "Claude", vendor: "Anthropic" },
      { name: "Gemini", vendor: "Google" },
      { name: "Microsoft Copilot", vendor: "Microsoft" },
    ],
    goingDeeper:
      "The systematic version of briefing — repeatable structures, deliberate use of examples and step-by-step reasoning — is Unit 02, Structured prompting. The skill of checking and bounding AI output is Unit 07, Judgment and verification.",
  },
};

// Mirrors docs/instructions/CareerPilot_Unit_02_seed.md.
const UNIT_02: UnitSeed = {
  unitNumber: 2,
  title: "Structured prompting",
  skill:
    "Build a prompt deliberately — in parts — so you can get a strong result on purpose instead of by luck, and know which part to add when the output is weak.",
  tier: "Foundation",
  timeRangeMin: 15,
  timeRangeMax: 30,
  exerciseFormat: "Build",
  prerequisites: [1],
  isPublished: true,
  content: {
    objectives: [
      "Name the parts of a structured prompt: role, context, task, constraints, and format.",
      "Build a prompt one layer at a time and see each layer change the output.",
      "Diagnose a weak AI response by spotting which part of the prompt was missing.",
    ],
    items: [
      {
        id: "why",
        title: "Why this matters",
        estimatedMinutes: 2,
        required: true,
        kind: "read",
        reading:
          "In Unit 01 you briefed the AI like a colleague and felt the difference a good brief makes. That was the instinct. This unit makes it repeatable.\n\nThe difference between a prompt that works and one that doesn't is rarely effort — it's structure. A strong prompt is built from a few specific parts, and once you can name them, you stop guessing. When an answer comes back weak, you won't rewrite the whole thing in frustration; you'll know exactly which part to add. That's the shift from hoping a prompt works to building one that does.",
        exercise: null,
        selfTest: [
          "Can you say why structure, not effort, is what separates a strong prompt from a weak one?",
        ],
        deeperPrompt: null,
      },
      {
        id: "teaching",
        title: "The parts of a prompt",
        estimatedMinutes: 6,
        required: true,
        kind: "read",
        reading:
          "A structured prompt has five parts. You won't always need all five, but knowing them means you can reach for the right one on purpose.\n\n## Role.\n\nTell the AI who it should be. \"You are a financial analyst\" or \"Act as a hiring manager\" sets a frame that shapes vocabulary, assumptions, and what it treats as important. One line, big effect.\n\n## Context.\n\nThe situation around the task: who the output is for, what's already happened, what you're trying to achieve. This is the part people skip most, and it's the part that does the most work.\n\n## Task.\n\nThe actual thing you want done — stated as a clear instruction, not a vague topic. \"Summarise\" is a topic. \"Summarise this in five bullet points a busy executive could read in 30 seconds\" is a task.\n\n## Constraints.\n\nThe boundaries: length, tone, what to include, what to leave out, what to avoid. Constraints are how you stop the AI from being generically helpful and make it specifically useful.\n\n## Format.\n\nThe shape of the output: a table, bullets, an email, a script with headers. Asking for a specific format is often the single fastest way to make a response usable instead of a wall of text.\n\nYou'll feel each of these in the exercise — you'll add them one at a time and watch the same task get sharper with every layer.",
        exercise: null,
        selfTest: [
          "Can you name the five parts of a structured prompt? (Role, context, task, constraints, format.)",
          "Can you say which part you most often skip — and what it costs you?",
        ],
        deeperPrompt: null,
      },
      {
        id: "exercise",
        title: "Build it up",
        estimatedMinutes: 15,
        required: true,
        kind: "exercise",
        reading:
          "You'll take one task and build the prompt for it in four passes — adding one layer each time and re-running, so you feel exactly what each part buys you.\n\n**Privacy note.** Don't paste confidential or proprietary information — client names, real financials, internal documents — into a public AI tool. Pick one of the three ready-made tasks below, or use a real task of your own with anything proprietary stripped out first.",
        exercise: {
          format: "Build",
          roundNoun: "Pass",
          roundNounPlural: "Passes",
          instructions:
            "Pick one task, then run it four times. Each pass, add the layer named in the round and re-run the SAME task. Don't start over — keep building on the prompt you already have, and watch the output sharpen with each addition.",
          scaffoldedTasks: [
            {
              id: "ops",
              audience: "Admin / operations",
              task: "Write a message announcing a new expense-reimbursement process to a 30-person office.",
            },
            {
              id: "mgmt",
              audience: "Management",
              task: "Write talking points for a manager delivering a team reorganisation in an all-hands meeting.",
            },
            {
              id: "sales",
              audience: "Sales / client-facing",
              task: "Write a follow-up message to a prospect who went quiet after a promising first call.",
            },
          ],
          scaffoldedRounds: [
            {
              id: "round-task",
              label: "Pass 1 — just the task",
              instructions:
                "Start with the bare task and nothing else — literally just ask for the thing. Run it. Read the result and keep it. This is your baseline; most people stop here.",
            },
            {
              id: "round-role-context",
              label: "Pass 2 — add role + context",
              instructions:
                'Now add a role ("You are a…") and context: who this is for, the situation around it, what you\'re trying to achieve. Re-run the same task. Notice what shifts — usually the assumptions and the relevance.',
            },
            {
              id: "round-constraints",
              label: "Pass 3 — add constraints",
              instructions:
                "Add the boundaries: length, tone, what to include, what to leave out. Re-run. This is usually where a generic answer becomes one you could actually use.",
            },
            {
              id: "round-format",
              label: "Pass 4 — add format",
              instructions:
                "Specify the exact shape you want the output in — bullets, a short email, a table, sections with headers. Re-run one last time. Compare this against your Pass 1 baseline and feel the full distance you covered.",
            },
          ],
        },
        selfTest: [
          "Which single pass changed the output the most for your task?",
          "Can you name what each of the four layers added?",
          "Could you build a prompt this way for a real task on your plate this week?",
        ],
        deeperPrompt:
          "Generate a fresh Build-format task in a different audience from the one the user picked last time (audiences: admin/ops, management, sales/client-facing). The task should be a single written deliverable producible in 10–15 minutes, no specialized domain knowledge required, and well-suited to being built up in layers (role, context, constraints, format) — i.e. a task where a bare one-line version and a fully-structured version would differ a lot.",
      },
      {
        id: "wrap",
        title: "What you learned",
        estimatedMinutes: 2,
        required: true,
        kind: "wrap",
        reading:
          "You just built the same prompt five times over and watched a vague baseline turn into something usable — not by trying harder, but by adding structure one part at a time. That sequence is the skill: when an output is weak, you now have a checklist to run, not a wall to bang your head against.\n\nWorks the same across every major AI assistant — use whichever you have. No paid plan is needed for this exercise.",
        exercise: null,
        selfTest: [
          "When an AI response comes back weak, I can name which part of my prompt to add or fix.",
        ],
        deeperPrompt: null,
      },
      {
        id: "reflect",
        title: "Reflect (60 seconds)",
        estimatedMinutes: 1,
        required: true,
        kind: "wrap",
        reading:
          "Take 60 seconds with the prompts below. Your answers are saved automatically and surface in your longitudinal view so you can see how your thinking changes across units.",
        exercise: null,
        selfTest: ["I've reflected on the prompts above."],
        deeperPrompt: null,
      },
    ],
    reflectionPrompts: [
      "Which of the five parts do you most often leave out — and why do you think that is?",
      "What changed most between your bare Pass 1 and your fully-built Pass 4?",
      "Which real task this week would most benefit from being built up in layers?",
    ],
    tools: [
      { name: "ChatGPT", vendor: "OpenAI" },
      { name: "Claude", vendor: "Anthropic" },
      { name: "Gemini", vendor: "Google" },
      { name: "Microsoft Copilot", vendor: "Microsoft" },
    ],
    goingDeeper:
      "Structured prompting is the manual version of a skill that becomes systematic later: reusable prompt templates, deliberate use of examples, and step-by-step reasoning are covered in the Applied tier. The discipline of checking and bounding what the AI gives back is Unit 07, Judgment and verification.",
  },
};

const units: UnitSeed[] = [UNIT_01, UNIT_02];

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
