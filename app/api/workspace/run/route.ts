import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, getAnthropicClient } from "@/lib/anthropic";
import {
  appendToHistory,
  parseHistory,
  type HistoryEntry,
} from "@/lib/workspace-history";
import {
  checkWorkspaceRateLimit,
  logWorkspaceRun,
} from "@/lib/workspace-rate-limit";

// Amendment 6 §15.4 / Change 4 — the workspace AI backend.
//
// Decision A: Sonnet 4.6.
// Decision B: NO system prompt for user-facing runs — the lesson IS
//   learning how to prompt; bare model behavior is pedagogically
//   load-bearing.
// Decision C: 20 runs/hour, 100 runs/day per user (enforced via
//   WorkspaceRunLog + lib/workspace-rate-limit).
// Decision E: streaming response via Anthropic messages.stream() +
//   Next.js ReadableStream — output appears as the model generates.
//
// On stream close (success): persist the prompt + accumulated response
// to WorkspaceState.promptHistory (capped at 20 entries) and insert a
// WorkspaceRunLog row.
//
// BYO providers come in Stage 3 (UserSettings.byoApiProvider).

export const maxDuration = 60;

const RequestSchema = z.object({
  plateItemId: z.string().min(1),
  itemId: z.string().min(1),
  prompt: z.string().min(1).max(20000),
  scaffoldedTaskId: z.string().min(1).nullable().optional(),
  roundId: z.string().min(1).nullable().optional(),
});

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
  const { plateItemId, itemId, prompt, scaffoldedTaskId, roundId } = parsed.data;

  const plate = await prisma.plateItem.findFirst({
    where: { id: plateItemId, userId },
  });
  if (!plate) {
    return NextResponse.json(
      { success: false, error: "Plate item not found" },
      { status: 404 },
    );
  }

  const rate = await checkWorkspaceRateLimit(userId);
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          rate.reason === "hour"
            ? "Hourly run limit reached. Try again in a bit."
            : "Daily run limit reached. Try again tomorrow.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    console.error("[workspace/run] Anthropic client init failed", err);
    return NextResponse.json(
      { success: false, error: "AI backend not configured." },
      { status: 503 },
    );
  }

  // Anthropic streaming. No system prompt (Decision B). The model sees
  // exactly what the user typed — the exercise is the user learning
  // what raw prompting feels like.
  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  let fullText = "";
  const encoder = new TextEncoder();

  const body_stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }
      } catch (err) {
        console.error("[workspace/run] Anthropic stream error", err);
        controller.error(err);
        return;
      }

      // Stream done. Persist the run before closing so the client's
      // "done reading" event fires after the DB write completes.
      try {
        await persistRunResult({
          plateItemId,
          itemId,
          userId,
          entry: {
            prompt,
            response: fullText,
            runAt: new Date().toISOString(),
            roundId: roundId ?? null,
          },
          selectedTaskId: scaffoldedTaskId ?? null,
        });
      } catch (err) {
        console.error("[workspace/run] Post-stream persist failed", err);
        // Stream content was delivered; the persist failure becomes
        // visible to the user on the next page load (history won't show
        // this run). Don't error the stream — close it cleanly.
      }
      controller.close();
    },
  });

  return new Response(body_stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

interface PersistArgs {
  plateItemId: string;
  itemId: string;
  userId: string;
  entry: HistoryEntry;
  selectedTaskId: string | null;
}

async function persistRunResult(args: PersistArgs): Promise<void> {
  const existing = await prisma.workspaceState.findUnique({
    where: {
      plateItemId_itemId: {
        plateItemId: args.plateItemId,
        itemId: args.itemId,
      },
    },
    select: { promptHistory: true },
  });
  const currentHistory = parseHistory(existing?.promptHistory);
  const nextHistory = appendToHistory(currentHistory, args.entry);

  await prisma.workspaceState.upsert({
    where: {
      plateItemId_itemId: {
        plateItemId: args.plateItemId,
        itemId: args.itemId,
      },
    },
    create: {
      plateItemId: args.plateItemId,
      itemId: args.itemId,
      selectedTaskId: args.selectedTaskId,
      promptHistory: nextHistory,
      currentPrompt: null,
    },
    update: {
      selectedTaskId: args.selectedTaskId,
      promptHistory: nextHistory,
      currentPrompt: null,
    },
  });

  await logWorkspaceRun(args.userId, args.plateItemId, args.itemId);
}
