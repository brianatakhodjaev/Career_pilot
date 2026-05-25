// One-off testing aid for /api/generate-plans.
// Calls Claude directly with the same system prompt as the route, using a
// fixed sample input (the Threatened persona + the assessment JSON from the
// 7a test run). Lets us inspect plan quality before wiring /onboard/plans.
// Delete after step 9 is blessed.
//
// Run: node scripts/test-plans.mjs

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Kept in sync with lib/anthropic.ts by hand — throwaway script.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a career coach specialising in AI career transitions. Generate exactly 3 distinct career paths for this user, based on their profile, questionnaire answers, and AI exposure assessment.

Each plan should move the user away from high-exposure work toward a more defensible, AI-fluent position. Plans must differ meaningfully from each other in destination and approach. Tailor pacing to the user's stated weekly time.

The plans array MUST contain exactly 3 plans. trackType MUST be one of: consultant, builder, strategist, educator, expert. task.type MUST be one of: reading, practice, project, experiment.

All numeric fields — matchScore, durationWeeks, hoursPerWeek, weekNumber, and estimatedMinutes — MUST be whole-number integers. Do not use decimals. matchScore is 0-100. durationWeeks is 1-52. hoursPerWeek should reflect the user's stated weekly capacity. estimatedMinutes is between 5 and 600 per task. weekNumber is the week within the plan that this phase begins (e.g., 1, 3, 6 in a 16-week plan), not a phase index.

Each plan MUST contain 2 to 6 tags. Each phase MUST contain 1 to 6 objectives and 1 to 4 tasks. A plan MUST contain at least 1 phase and at most 8. Plans on a selection card must be graspable at a glance — keep task titles concise and avoid sprawling phase trees.

If you do not know a specific learning-resource URL for a task, set resourceUrl to null. Do NOT invent URLs that may not exist — null is correct when no specific resource applies.

Return ONLY valid JSON, no markdown, with this structure:
{
  "plans": [{
    "title": string,
    "trackType": string,
    "matchScore": number,
    "durationWeeks": number,
    "hoursPerWeek": number,
    "description": string,
    "tags": string[],
    "phases": [{
      "weekNumber": number,
      "title": string,
      "objectives": string[],
      "tasks": [{
        "title": string,
        "type": string,
        "estimatedMinutes": number,
        "resourceUrl": string | null
      }]
    }]
  }]
}`;

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
  // From the 7a test run, claude-sonnet-4-6 output.
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

const userMessage = [
  `Profile type: ${sample.profileType}.`,
  `Questionnaire answers: ${JSON.stringify(sample.answers)}.`,
  `Exposure assessment: ${JSON.stringify(sample.assessment)}.`,
  `Background: ${sample.background}.`,
].join("\n");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

console.log(`Calling ${MODEL}…`);
const start = Date.now();
const response = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 8192,
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

  const TRACK_TYPES = ["consultant", "builder", "strategist", "educator", "expert"];
  const TASK_TYPES = ["reading", "practice", "project", "experiment"];

  const checks = [
    [
      "plans array has exactly 3 plans",
      Array.isArray(json.plans) && json.plans.length === 3,
    ],
    [
      "every plan has integer matchScore 0-100",
      json.plans?.every(
        (p) =>
          Number.isInteger(p.matchScore) &&
          p.matchScore >= 0 &&
          p.matchScore <= 100,
      ),
    ],
    [
      "every plan has integer durationWeeks 1-52",
      json.plans?.every(
        (p) =>
          Number.isInteger(p.durationWeeks) &&
          p.durationWeeks >= 1 &&
          p.durationWeeks <= 52,
      ),
    ],
    [
      "every plan has integer hoursPerWeek 1-40",
      json.plans?.every(
        (p) =>
          Number.isInteger(p.hoursPerWeek) &&
          p.hoursPerWeek >= 1 &&
          p.hoursPerWeek <= 40,
      ),
    ],
    [
      "every plan's trackType is in the enum",
      json.plans?.every((p) => TRACK_TYPES.includes(p.trackType)),
    ],
    [
      "every plan has 2-6 tags",
      json.plans?.every(
        (p) => Array.isArray(p.tags) && p.tags.length >= 2 && p.tags.length <= 6,
      ),
    ],
    [
      "every phase has integer weekNumber",
      json.plans?.every((p) =>
        p.phases?.every((ph) => Number.isInteger(ph.weekNumber)),
      ),
    ],
    [
      "every phase has 1-6 objectives",
      json.plans?.every((p) =>
        p.phases?.every(
          (ph) =>
            Array.isArray(ph.objectives) &&
            ph.objectives.length >= 1 &&
            ph.objectives.length <= 6,
        ),
      ),
    ],
    [
      "every plan has 1-8 phases",
      json.plans?.every(
        (p) =>
          Array.isArray(p.phases) && p.phases.length >= 1 && p.phases.length <= 8,
      ),
    ],
    [
      "every phase has 1-4 tasks",
      json.plans?.every((p) =>
        p.phases?.every(
          (ph) =>
            Array.isArray(ph.tasks) &&
            ph.tasks.length >= 1 &&
            ph.tasks.length <= 4,
        ),
      ),
    ],
    [
      "every task type is in the enum",
      json.plans?.every((p) =>
        p.phases?.every((ph) =>
          ph.tasks?.every((t) => TASK_TYPES.includes(t.type)),
        ),
      ),
    ],
    [
      "every task has integer estimatedMinutes 5-600",
      json.plans?.every((p) =>
        p.phases?.every((ph) =>
          ph.tasks?.every(
            (t) =>
              Number.isInteger(t.estimatedMinutes) &&
              t.estimatedMinutes >= 5 &&
              t.estimatedMinutes <= 600,
          ),
        ),
      ),
    ],
    [
      "every task resourceUrl is null or a valid URL",
      json.plans?.every((p) =>
        p.phases?.every((ph) =>
          ph.tasks?.every((t) => {
            if (t.resourceUrl === null) return true;
            try {
              new URL(t.resourceUrl);
              return true;
            } catch {
              return false;
            }
          }),
        ),
      ),
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
