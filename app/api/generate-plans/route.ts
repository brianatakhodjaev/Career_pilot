import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CLAUDE_MODEL,
  SELECT_PLATE_SYSTEM_PROMPT,
  getAnthropicClient,
} from "@/lib/anthropic";
import { AssessmentSchema } from "@/lib/assessment";
import {
  SelectorOutputSchema,
  type BuffetMetadata,
  type SelectorOutput,
} from "@/lib/selector";

// Post-Amendment 3: this route is now the SELECTOR (§14.2). It marks up
// the existing buffet for the user — it does not invent unit content.
// Returns both the selector output and the buffet metadata so the menu
// UI (checkpoint 2) can render unit details alongside the markup without
// a second round trip.
export const maxDuration = 60;

const RequestSchema = z.object({
  profileType: z.enum(["veteran", "threatened", "starter"]),
  answers: z.record(z.string(), z.string()).refine(
    (a) => Object.keys(a).length >= 3,
    { message: "Need at least 3 questionnaire answers" },
  ),
  assessment: AssessmentSchema,
  background: z.string().min(20).max(20000).optional(),
});

function extractText(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

function stripJsonFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request payload" },
      { status: 400 },
    );
  }

  const { profileType, answers, assessment, background } = parsed.data;

  // Selector only sees PUBLISHED units. Unpublished work-in-progress units
  // stay out of the menu.
  const buffetUnits = await prisma.buffetUnit.findMany({
    where: { isPublished: true },
    orderBy: { unitNumber: "asc" },
    select: {
      unitNumber: true,
      title: true,
      skill: true,
      tier: true,
      timeRangeMin: true,
      timeRangeMax: true,
      exerciseFormat: true,
      prerequisites: true,
    },
  });

  if (buffetUnits.length === 0) {
    return NextResponse.json(
      { success: false, error: "No buffet units available" },
      { status: 503 },
    );
  }

  const buffet: BuffetMetadata[] = buffetUnits.map((u) => ({
    unitNumber: u.unitNumber,
    title: u.title,
    skill: u.skill,
    tier: u.tier,
    timeRangeMin: u.timeRangeMin,
    timeRangeMax: u.timeRangeMax,
    exerciseFormat: u.exerciseFormat,
    prerequisites: u.prerequisites,
  }));

  const userMessage = [
    `Profile type: ${profileType}.`,
    `Questionnaire answers: ${JSON.stringify(answers)}.`,
    `Exposure assessment: ${JSON.stringify(assessment)}.`,
    `Background: ${background ?? "not provided"}.`,
    ``,
    `The buffet (units available to mark up):`,
    JSON.stringify(buffet, null, 2),
  ].join("\n");

  let selector: SelectorOutput;
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SELECT_PLATE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const cleaned = stripJsonFences(extractText(response));
    const json: unknown = JSON.parse(cleaned);
    selector = SelectorOutputSchema.parse(json);

    // Cross-check: the selector must return exactly one item per buffet
    // unit (no extras, no omissions; same unitNumber values).
    const sent = new Set(buffet.map((b) => b.unitNumber));
    const returned = new Set(selector.items.map((i) => i.unitNumber));
    if (sent.size !== returned.size || ![...sent].every((n) => returned.has(n))) {
      throw new Error(
        `Selector item-set mismatch: sent ${[...sent].join(",")}, returned ${[...returned].join(",")}`,
      );
    }
  } catch (err) {
    console.error("[generate-plans] Selector call or validation failed", err);
    return NextResponse.json(
      { success: false, error: "Could not select your plate." },
      { status: 502 },
    );
  }

  // No DB write at this step — /onboard/confirm (checkpoint 2) persists
  // the user's adjusted plate (CareerPlan + PlateItem rows).

  return NextResponse.json(
    {
      success: true,
      data: { selector, buffet },
    },
    { status: 200 },
  );
}
