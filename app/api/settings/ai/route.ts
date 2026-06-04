import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { CLAUDE_MODEL } from "@/lib/anthropic";
import { isAnthropicAuthError } from "@/lib/byo-anthropic";

// Amendment 6 Stage 3 — /settings/ai backend.
//
// GET → returns the current settings shape suitable for hydrating the
// form: { provider, hasKey } — never the key itself.
//
// POST → upsert UserSettings. Encrypts the key at rest. Provider "none"
// (or null) clears both fields (revert to CareerPilot default).
//
// Per Decision E (Stage 2), v1 only supports "anthropic" as a BYO
// provider. The schema's byoApiProvider stays String so future
// providers don't require a migration.

const PROVIDER_VALUES = ["none", "anthropic"] as const;

const PostSchema = z
  .object({
    provider: z.enum(PROVIDER_VALUES),
    apiKey: z.string().min(1).max(500).optional(),
  })
  .refine(
    (v) => v.provider === "none" || (v.apiKey && v.apiKey.length > 0),
    { message: "API key is required when provider is anthropic." },
  );

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { byoApiProvider: true, byoApiKey: true },
  });
  return NextResponse.json({
    success: true,
    data: {
      provider: settings?.byoApiProvider ?? "none",
      hasKey: Boolean(settings?.byoApiKey),
    },
  });
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
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Invalid request payload.",
      },
      { status: 400 },
    );
  }
  const { provider, apiKey } = parsed.data;

  let nextProvider: string | null = null;
  let nextKey: string | null = null;

  if (provider === "anthropic" && apiKey) {
    // Validate the key with Anthropic before storing. Decision F (Stage
    // 3) says workspace runs should fail loudly on bad BYO keys; the
    // cleanest UX is to refuse the save in the first place so a bad
    // key never reaches a workspace run. A tiny 1-token messages.create
    // is the standard validation pattern.
    try {
      const probe = new Anthropic({ apiKey });
      await probe.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
    } catch (err) {
      if (isAnthropicAuthError(err)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Anthropic rejected this key. Check the key and try again.",
          },
          { status: 400 },
        );
      }
      console.error("[settings/ai] BYO key validation probe failed", err);
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not reach Anthropic to validate the key. Try again in a moment.",
        },
        { status: 502 },
      );
    }
    try {
      nextKey = encrypt(apiKey);
    } catch (err) {
      console.error("[settings/ai] encryption failed", err);
      return NextResponse.json(
        {
          success: false,
          error:
            "Server is not configured to store BYO keys yet. Contact support.",
        },
        { status: 503 },
      );
    }
    nextProvider = "anthropic";
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      byoApiProvider: nextProvider,
      byoApiKey: nextKey,
    },
    update: {
      byoApiProvider: nextProvider,
      byoApiKey: nextKey,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: { provider: nextProvider ?? "none", hasKey: Boolean(nextKey) },
    },
    { status: 200 },
  );
}
