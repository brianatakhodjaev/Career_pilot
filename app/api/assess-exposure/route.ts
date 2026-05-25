import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ASSESS_EXPOSURE_SYSTEM_PROMPT,
  CLAUDE_MODEL,
  getAnthropicClient,
} from "@/lib/anthropic";

// Allow Claude calls up to 60s — Sonnet on a structured-JSON task usually
// completes in 5–15s, but cold serverless containers + Neon connect can
// stretch the tail. Vercel Pro caps at 60s on the default runtime.
export const maxDuration = 60;

const FIVE_FACTOR_LABELS = [
  "Routine and repeatable tasks",
  "Content and analysis generation",
  "Judgment in ambiguous situations",
  "Relationship and trust dependence",
  "Physical and on-site work",
] as const;

const RequestSchema = z.object({
  profileType: z.enum(["veteran", "threatened", "starter"]),
  answers: z.record(z.string(), z.string()).refine((a) => Object.keys(a).length >= 3, {
    message: "Need at least 3 questionnaire answers",
  }),
  linkedInUrl: z.string().url().optional(),
  resumeText: z.string().min(20).max(20000).optional(),
});

const FactorSchema = z.object({
  label: z.enum(FIVE_FACTOR_LABELS),
  score: z.number().min(0).max(10),
  note: z.string().min(1),
});

const AssessmentSchema = z.object({
  occupationLabel: z.string().min(1),
  scoreToday: z.number().min(0).max(10),
  scoreProjected: z.number().min(0).max(10),
  scoreWithPlan: z.number().min(0).max(10),
  factors: z.array(FactorSchema).length(5),
  exposedTasks: z.array(z.string().min(1)).min(3).max(4),
  defensibleTasks: z.array(z.string().min(1)).min(3).max(4),
  reasoning: z.string().min(1),
});

type Assessment = z.infer<typeof AssessmentSchema>;

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
  const userId = session.user.id;

  const body: unknown = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request payload" },
      { status: 400 },
    );
  }

  const { profileType, answers, linkedInUrl, resumeText } = parsed.data;

  // Upsert the profile BEFORE the Claude call so the FK target for
  // RiskAssessment exists, and so the profile is persisted even if Claude
  // fails and the user retries.
  await prisma.userProfile.upsert({
    where: { userId },
    update: { profileType, linkedInUrl, resumeText, answers },
    create: { userId, profileType, linkedInUrl, resumeText, answers },
  });

  const background = resumeText ?? linkedInUrl ?? "not provided";
  const userMessage = [
    `Profile type: ${profileType}.`,
    `Current role / background: ${background}.`,
    `Questionnaire answers: ${JSON.stringify(answers)}.`,
  ].join("\n");

  let assessment: Assessment;
  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: ASSESS_EXPOSURE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const cleaned = stripJsonFences(extractText(response));
    const json: unknown = JSON.parse(cleaned);
    assessment = AssessmentSchema.parse(json);
  } catch (err) {
    console.error("[assess-exposure] Claude call or response validation failed", err);
    return NextResponse.json(
      { success: false, error: "Could not generate assessment." },
      { status: 502 },
    );
  }

  await prisma.riskAssessment.create({
    data: {
      userId,
      occupationLabel: assessment.occupationLabel,
      scoreToday: assessment.scoreToday,
      scoreProjected: assessment.scoreProjected,
      scoreWithPlan: assessment.scoreWithPlan,
      factors: assessment.factors,
      exposedTasks: assessment.exposedTasks,
      defensibleTasks: assessment.defensibleTasks,
      reasoning: assessment.reasoning,
    },
  });

  return NextResponse.json({ success: true, data: assessment }, { status: 200 });
}
