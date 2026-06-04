import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL } from "@/lib/anthropic";
import {
  getAnthropicForUser,
  isAnthropicAuthError,
  ByoKeyError,
} from "@/lib/byo-anthropic";
import { parseLessonContent } from "@/lib/lesson-content";

// Amendment 6 §15.8 — Deepen re-entry path.
//
// Generates a fresh scaffolded task for an exercise item using the
// item's `deeperPrompt` template, then wipes WorkspaceState history so
// the user works the variation in a fresh workspace.
//
// Routes the Claude call through lib/byo-anthropic so BYO users pay
// for their own Deepen generations.
//
// System prompt per Stage 3 Decision H (Brian's verbatim revision —
// adds "no preamble").

export const maxDuration = 60;

const DEEPEN_SYSTEM_PROMPT =
  'You generate one CareerPilot exercise task. Read the user\'s instructions and produce a single scaffolded task with audience and task fields. Return ONLY valid JSON: {"audience": string, "task": string}. No prose, no markdown fences, no preamble.';

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  itemId: z.string().min(1),
});

const GeneratedTaskSchema = z.object({
  audience: z.string().min(1).max(200),
  task: z.string().min(1).max(2000),
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

// Pull the first balanced top-level {...} object out of a string.
// Defensive against the model emitting preamble despite the system
// prompt forbidding it, or appending a trailing comment. Returns null
// if no balanced object found.
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
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
  const { plateItemId, itemId } = parsed.data;

  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
    include: { unit: true },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  const content = parseLessonContent(plate.unit.content);
  if (!content) {
    return NextResponse.json(
      { success: false, error: "Unit content invalid" },
      { status: 500 },
    );
  }

  const item = content.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json(
      { success: false, error: "Item not found in unit" },
      { status: 404 },
    );
  }
  if (item.kind !== "exercise" || !item.exercise) {
    return NextResponse.json(
      { success: false, error: "Deepen is only valid on exercise items" },
      { status: 400 },
    );
  }
  if (!item.deeperPrompt) {
    return NextResponse.json(
      { success: false, error: "This exercise does not support Deepen yet" },
      { status: 400 },
    );
  }

  // Last-task hint: look up the user's most recent selectedTaskId on
  // this item (could be a scaffolded id or null). Maps back to the
  // scaffolded task object so we can name it for the model.
  const ws = await prisma.workspaceState.findUnique({
    where: { plateItemId_itemId: { plateItemId, itemId } },
    select: { selectedTaskId: true, customTask: true },
  });
  const lastTaskHint = buildLastTaskHint(ws, item.exercise.scaffoldedTasks);

  const userMessage = [
    item.deeperPrompt,
    "",
    lastTaskHint,
  ].join("\n");

  let resolved;
  try {
    resolved = await getAnthropicForUser(userId);
  } catch (err) {
    if (err instanceof ByoKeyError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 502 },
      );
    }
    console.error("[deepen] anthropic client init failed", err);
    return NextResponse.json(
      { success: false, error: "AI backend not configured." },
      { status: 503 },
    );
  }

  let generatedTask;
  try {
    const response = await resolved.client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system: DEEPEN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const raw = extractText(response);
    const cleaned = stripJsonFences(raw);
    // Defensive: try strict parse first; fall back to extracting the
    // first balanced {...} if the model added preamble despite being
    // told not to.
    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      const extracted = extractFirstJsonObject(cleaned);
      if (!extracted) {
        console.error(
          "[deepen] no JSON object found in response. raw=",
          raw.slice(0, 500),
        );
        throw new Error("Model output not JSON");
      }
      json = JSON.parse(extracted);
    }
    generatedTask = GeneratedTaskSchema.parse(json);
  } catch (err) {
    if (resolved.isByo && isAnthropicAuthError(err)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your BYO API key was rejected by Anthropic. Check /settings/ai.",
        },
        { status: 502 },
      );
    }
    console.error("[deepen] Claude call or validation failed", err);
    return NextResponse.json(
      { success: false, error: "Could not generate a fresh exercise." },
      { status: 502 },
    );
  }

  // Wipe history and write the generated task. Reset the item's
  // progress to in_progress so the user can complete it again.
  await prisma.$transaction([
    prisma.workspaceState.upsert({
      where: { plateItemId_itemId: { plateItemId, itemId } },
      create: {
        plateItemId,
        itemId,
        selectedTaskId: null,
        currentPrompt: null,
        promptHistory: [],
        customTask: generatedTask,
      },
      update: {
        selectedTaskId: null,
        currentPrompt: null,
        promptHistory: [],
        customTask: generatedTask,
      },
    }),
    prisma.lessonItemProgress.upsert({
      where: { plateItemId_itemId: { plateItemId, itemId } },
      create: { plateItemId, itemId, status: "in_progress" },
      update: { status: "in_progress", completedAt: null },
    }),
  ]);

  return NextResponse.json(
    { success: true, data: { customTask: generatedTask } },
    { status: 200 },
  );
}

function buildLastTaskHint(
  ws: { selectedTaskId: string | null; customTask: unknown } | null,
  scaffolded: { id: string; audience: string; task: string }[],
): string {
  if (!ws) return "The user has not picked a task yet.";

  // Prior Deepen: hint with the generated task so the model can avoid
  // repeating.
  if (ws.customTask && typeof ws.customTask === "object") {
    const ct = ws.customTask as { audience?: string; task?: string };
    if (ct.audience && ct.task) {
      return `The user's last task (a previous Deepen variation) had audience "${ct.audience}". Pick a different audience.`;
    }
  }

  if (ws.selectedTaskId) {
    const match = scaffolded.find((t) => t.id === ws.selectedTaskId);
    if (match) {
      return `The user's last task targeted audience "${match.audience}". Pick a different audience.`;
    }
  }
  return "The user has not picked a task yet — pick any audience from the standard set.";
}
