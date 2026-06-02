import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import {
  CLAUDE_HAIKU_MODEL,
  REVIEW_SUMMARY_SYSTEM_PROMPT,
  getAnthropicClient,
} from "@/lib/anthropic";
import { ReviewSummarySchema, type ReviewSummary } from "@/lib/review";

// Amendment 5 §5a.3 — the review-summary call. Runs after the user has
// pasted background and (optionally) added a pride-point; produces a
// 2-3 paragraph summary of how the system has understood them. The user
// confirms or corrects it on /onboard/review; the correction (if any) is
// then appended to the assessment call's user message.
//
// Powered by Haiku 4.5 (Decision C). Short summarisation task — Sonnet
// stays on the assessment and selector calls where real reasoning is
// required.
//
// This route deliberately does NOT touch the DB. Persistence of
// proudPoint, reviewSummary, and reviewCorrection happens at
// /api/assess-exposure when the full intake completes — same "upsert
// once at the end" pattern UserProfile has always followed.
export const maxDuration = 60;

const RequestSchema = z.object({
  profileType: z.enum(["veteran", "threatened", "starter"]),
  background: z.string().min(1).max(20000).optional(),
  proudPoint: z.string().min(1).max(5000).optional(),
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

  const { profileType, background, proudPoint } = parsed.data;

  const userMessage = [
    `Profile type: ${profileType}.`,
    `Background: ${background ?? "not provided"}.`,
    `Pride-point: ${proudPoint ?? "not provided"}.`,
  ].join("\n");

  let review: ReviewSummary;
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_HAIKU_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: REVIEW_SUMMARY_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const cleaned = stripJsonFences(extractText(response));
    const json: unknown = JSON.parse(cleaned);
    review = ReviewSummarySchema.parse(json);
  } catch (err) {
    console.error("[review-summary] Claude call or response validation failed", err);
    return NextResponse.json(
      { success: false, error: "Could not generate summary." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: review }, { status: 200 });
}
