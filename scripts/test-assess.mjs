// One-off testing aid for /api/assess-exposure.
// Calls Claude directly with the same system prompt and a sample user
// message — no Next.js, no auth, no Prisma. Lets us inspect the raw JSON
// quality before wiring the UI. Delete after 7a is blessed.
//
// Run: node scripts/test-assess.mjs

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Kept in sync with lib/anthropic.ts by hand — this is a throwaway script,
// not worth a TS-import shim.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a labor-market analyst specialising in AI's impact on white-collar work. You assess how exposed a person's current role is to AI automation, using the distinction between observed exposure (what AI already does in the role) and theoretical exposure (what it could do within 2-3 years).

Reason about the user's SPECIFIC tasks, not just their job title. Be honest but never alarmist — exposure is task-level, not person-level, and exposure is not unemployment.

Your score is an evidence-based estimate, not an exact measurement. Do not imply false precision. The factor breakdown must make the score explainable: the user should understand WHY they scored as they did.

All scores — scoreToday, scoreProjected, scoreWithPlan, and each factor score — MUST be whole-number integers from 0 to 10 inclusive. Do not use decimals.

Score these five fixed factors, each 0-10, where 10 means AI can already perform most of that dimension of the user's work:
- "Routine and repeatable tasks"
- "Content and analysis generation"
- "Judgment in ambiguous situations"
- "Relationship and trust dependence"
- "Physical and on-site work"
For each factor, give a one-sentence note explaining that score for THIS user.

exposedTasks MUST contain exactly 3 to 4 items — the user's tasks most exposed to AI automation. defensibleTasks MUST contain exactly 3 to 4 items — tasks that remain genuinely human. Do not exceed 4 items in either array.

Return ONLY valid JSON, no markdown, with this structure:
{
  "occupationLabel": string,
  "scoreToday": number,
  "scoreProjected": number,
  "scoreWithPlan": number,
  "factors": [
    { "label": string, "score": number, "note": string }
  ],
  "exposedTasks": string[],
  "defensibleTasks": string[],
  "reasoning": string
}`;

const sample = {
  profileType: "threatened",
  resumeText:
    "Senior Marketing Manager at a B2B SaaS company. 12 years experience leading product marketing, demand generation, and content strategy. Owned messaging for 4 product launches; managed teams of 5–8 marketers; built and maintained reporting dashboards in HubSpot and Salesforce.",
  answers: {
    ai_experience: "I've experimented but don't feel fluent",
    motivation: "My current work is being automated or devalued",
    one_year: "Same role, but now the AI-fluent expert others rely on",
    weekly_hours: "4–6 hours — serious but balanced",
    strongest_asset: "Deep domain or industry expertise",
  },
};

const userMessage = [
  `Profile type: ${sample.profileType}.`,
  `Current role / background: ${sample.resumeText}.`,
  `Questionnaire answers: ${JSON.stringify(sample.answers)}.`,
].join("\n");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log(`Calling ${MODEL}…`);
const start = Date.now();
const response = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 2048,
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

  // Quick assertions matching the route's Zod constraints
  const checks = [
    [
      "scoreToday is integer 0-10",
      Number.isInteger(json.scoreToday) &&
        json.scoreToday >= 0 &&
        json.scoreToday <= 10,
    ],
    [
      "scoreProjected is integer 0-10",
      Number.isInteger(json.scoreProjected) &&
        json.scoreProjected >= 0 &&
        json.scoreProjected <= 10,
    ],
    [
      "scoreWithPlan is integer 0-10",
      Number.isInteger(json.scoreWithPlan) &&
        json.scoreWithPlan >= 0 &&
        json.scoreWithPlan <= 10,
    ],
    [
      "all 5 factor scores are integers 0-10",
      Array.isArray(json.factors) &&
        json.factors.length === 5 &&
        json.factors.every(
          (f) => Number.isInteger(f.score) && f.score >= 0 && f.score <= 10,
        ),
    ],
    [
      "exposedTasks length is 3-4",
      Array.isArray(json.exposedTasks) &&
        json.exposedTasks.length >= 3 &&
        json.exposedTasks.length <= 4,
    ],
    [
      "defensibleTasks length is 3-4",
      Array.isArray(json.defensibleTasks) &&
        json.defensibleTasks.length >= 3 &&
        json.defensibleTasks.length <= 4,
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
