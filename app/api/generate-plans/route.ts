import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import {
  CLAUDE_MODEL,
  GENERATE_PLANS_SYSTEM_PROMPT,
  getAnthropicClient,
} from "@/lib/anthropic";
import { AssessmentSchema } from "@/lib/assessment";
import { PlansResponseSchema, type PlansResponse } from "@/lib/plans";

// Plan generation is ~3-4× the output of the assessment call — three plans
// with phases and tasks each. Keep the 60s ceiling.
export const maxDuration = 60;

const RequestSchema = z.object({
  profileType: z.enum(["veteran", "threatened", "starter"]),
  answers: z.record(z.string(), z.string()).refine((a) => Object.keys(a).length >= 3, {
    message: "Need at least 3 questionnaire answers",
  }),
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

  const userMessage = [
    `Profile type: ${profileType}.`,
    `Questionnaire answers: ${JSON.stringify(answers)}.`,
    `Exposure assessment: ${JSON.stringify(assessment)}.`,
    `Background: ${background ?? "not provided"}.`,
  ].join("\n");

  let plans: PlansResponse;
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: GENERATE_PLANS_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const cleaned = stripJsonFences(extractText(response));
    const json: unknown = JSON.parse(cleaned);
    plans = PlansResponseSchema.parse(json);
  } catch (err) {
    console.error("[generate-plans] Claude call or response validation failed", err);
    return NextResponse.json(
      { success: false, error: "Could not generate plans." },
      { status: 502 },
    );
  }

  // No DB write at this step — /onboard/confirm (a later step) persists the
  // single plan the user actually chooses. Until then plans ride client-side.

  return NextResponse.json({ success: true, data: plans }, { status: 200 });
}
