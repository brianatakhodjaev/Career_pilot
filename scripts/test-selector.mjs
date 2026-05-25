// One-off testing aid for the post-Amendment-3 selector at
// POST /api/generate-plans. Calls Claude directly with the same system
// prompt and a sample input, no Next.js / auth / Prisma — lets us inspect
// the selector's marked-up menu before wiring the menu UI in checkpoint 2.
//
// Run: node scripts/test-selector.mjs

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Kept in sync with lib/anthropic.ts by hand — throwaway script.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a curriculum selector for CareerPilot. Given a user's profile, exposure assessment, questionnaire answers, and background, plus a library of micro-learning units (the "buffet"), your job is to mark up the buffet for THIS user.

For each unit in the buffet, you assign:
- tag: "core" | "later" | "skip"
  - "core" = this unit directly supports the user's goal and belongs in their committed plan
  - "later" = useful but not essential right now; the user may add it after completing core units
  - "skip" = this unit is not relevant to this user's situation or goal
- rationale: ONE sentence explaining WHY this unit gets that tag for THIS user. Reference their specific context — their role, their assessment factors, or their stated goal. Generic rationale is a failure.
- orderIndex: the recommended order to do the core units in (a non-negative integer). Skip and later units may also be ordered, but it matters less.

You also produce:
- pacing: units-per-week, consistent with the user's stated weekly capacity.
- summary: ONE short paragraph (2-3 sentences) framing the plate as a whole — what the user is signing up for and why.

Rules:
- You do NOT invent units. You only mark up the units that exist in the buffet you are given.
- Rationale must be specific to THIS user. Reference their role, their assessment, or their stated goal. Generic / boilerplate rationale ("a foundational skill everyone needs") is wrong.
- Every user should have at least one "core" unit. Do not tag everything as "skip."
- If the buffet has fewer than 3 units, you may tag all of them "core"; the at-least-one-core rule still holds.
- All numeric fields (unitsPerWeek, orderIndex) MUST be whole-number integers.

Return ONLY valid JSON, no markdown, with this structure:
{
  "summary": string,
  "pacing": { "unitsPerWeek": number },
  "items": [
    { "unitNumber": number, "tag": "core" | "later" | "skip", "rationale": string, "orderIndex": number }
  ]
}

The items array MUST contain exactly one entry per unit in the buffet you were given — same unitNumber values, no extras, no omissions.`;

// Sample user input — same Threatened persona / assessment we used for
// test-assess.mjs and test-plans.mjs.
const sample = {
  profileType: "threatened",
  background:
    "Senior Marketing Manager at a B2B SaaS company. 12 years experience leading product marketing, demand generation, and content strategy. Owned messaging for 4 product launches; managed teams of 5–8 marketers; built and maintained reporting dashboards in HubSpot and Salesforce.",
  answers: {
    ai_experience: "I've experimented but don't feel fluent",
    motivation: "My current work is being automated or devalued",
    one_year: "Same role, but now the AI-fluent expert others rely on",
    weekly_hours: "4–6 hours — serious but balanced",
    strongest_asset: "Deep domain or industry expertise",
  },
  assessment: {
    occupationLabel: "Senior Marketing Manager, B2B SaaS",
    scoreToday: 6,
    scoreProjected: 8,
    scoreWithPlan: 5,
    factors: [
      {
        label: "Routine and repeatable tasks",
        score: 8,
        note: "Dashboard reporting in HubSpot/Salesforce, campaign performance pulls, and content calendar management are already heavily automatable with current AI and native integrations.",
      },
      {
        label: "Content and analysis generation",
        score: 8,
        note: "Blog posts, email sequences, ad copy, and competitive briefs — core content strategy deliverables — are tasks where GPT-class models are already performing at or near senior-marketer output quality.",
      },
      {
        label: "Judgment in ambiguous situations",
        score: 4,
        note: "Positioning decisions for a new product launch, reading a competitive market shift, or knowing when a campaign narrative isn't landing yet requires contextual business judgment AI still handles poorly.",
      },
      {
        label: "Relationship and trust dependence",
        score: 4,
        note: "Cross-functional alignment with Sales, Product, and Executives — and managing a team of 5–8 through ambiguity — depends on earned credibility and interpersonal trust that AI cannot substitute.",
      },
      {
        label: "Physical and on-site work",
        score: 1,
        note: "This role is almost entirely digital and remote-compatible, offering no meaningful protection from AI exposure on this dimension.",
      },
    ],
    exposedTasks: [
      "Building and maintaining reporting dashboards (HubSpot, Salesforce)",
      "Drafting content assets: blog posts, email nurture sequences, landing page copy",
      "Competitive research and market analysis briefs",
      "Campaign performance summarisation and weekly reporting",
    ],
    defensibleTasks: [
      "Product launch narrative and positioning — synthesising customer insight, sales feedback, and market timing into a coherent story",
      "Managing and developing a marketing team through ambiguous, fast-moving priorities",
      "Executive and cross-functional alignment: negotiating budgets, priorities, and go-to-market sequencing",
      "Strategic vendor and agency relationships where institutional knowledge and trust matter",
    ],
    reasoning:
      "Your role sits at a genuinely high exposure level today, and the trajectory toward 8/10 within 2–3 years is credible. The tasks that have historically consumed the most hours — content production, reporting, research synthesis — are exactly where AI tools are already capable and improving fastest. With 12 years of experience, you've likely built real defensibility in the areas that still matter: market judgment, launch strategy, and organisational influence.",
  },
};

// Buffet snapshot. Mirrors what the API fetches from BuffetUnit
// (isPublished: true). For checkpoint 1 there's only Unit 01 seeded.
const buffet = [
  {
    unitNumber: 1,
    title: "Working with AI assistants well",
    skill:
      "Get genuinely useful output from an AI assistant by briefing it properly — and know when not to trust what it gives you back.",
    tier: "Foundation",
    timeRangeMin: 15,
    timeRangeMax: 30,
    exerciseFormat: "Compare",
    prerequisites: [],
  },
];

const userMessage = [
  `Profile type: ${sample.profileType}.`,
  `Questionnaire answers: ${JSON.stringify(sample.answers)}.`,
  `Exposure assessment: ${JSON.stringify(sample.assessment)}.`,
  `Background: ${sample.background}.`,
  ``,
  `The buffet (units available to mark up):`,
  JSON.stringify(buffet, null, 2),
].join("\n");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log(`Calling ${MODEL}…`);
const start = Date.now();
const response = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [{ role: "user", content: userMessage }],
});
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

const text = response.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("")
  .trim();

console.log(`\n=== RAW OUTPUT (${elapsed}s) ===\n`);
console.log(text);

console.log("\n=== USAGE ===\n");
console.log(JSON.stringify(response.usage, null, 2));

try {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const json = JSON.parse(cleaned);

  const TAGS = ["core", "later", "skip"];

  const checks = [
    ["summary is a non-empty string", typeof json.summary === "string" && json.summary.length > 0],
    [
      "pacing.unitsPerWeek is integer 1-10",
      Number.isInteger(json.pacing?.unitsPerWeek) &&
        json.pacing.unitsPerWeek >= 1 &&
        json.pacing.unitsPerWeek <= 10,
    ],
    [
      "items is an array",
      Array.isArray(json.items) && json.items.length > 0,
    ],
    [
      "items has exactly one entry per buffet unit (same unitNumbers)",
      Array.isArray(json.items) &&
        json.items.length === buffet.length &&
        buffet.every((b) =>
          json.items.some((i) => i.unitNumber === b.unitNumber),
        ),
    ],
    [
      "every item tag is in the enum",
      json.items?.every((i) => TAGS.includes(i.tag)),
    ],
    [
      "every item rationale is a non-empty string",
      json.items?.every((i) => typeof i.rationale === "string" && i.rationale.length > 0),
    ],
    [
      "every item orderIndex is a non-negative integer",
      json.items?.every(
        (i) => Number.isInteger(i.orderIndex) && i.orderIndex >= 0,
      ),
    ],
    [
      "at least one item is tagged 'core'",
      json.items?.some((i) => i.tag === "core"),
    ],
  ];

  console.log("\n=== CONSTRAINT CHECKS ===\n");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
  }
} catch (err) {
  console.log("\n=== PARSE FAILED ===\n");
  console.log(err.message);
}
