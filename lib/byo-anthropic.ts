// Amendment 6 Stage 3 — Anthropic client factory that honors
// UserSettings.byoApiProvider. Returns a per-call Anthropic client
// using the user's decrypted BYO key when set, else the shared
// CareerPilot client.
//
// Used by /api/workspace/run and /api/workspace/deepen so workspace
// calls flow through the user's preferred backend.
//
// Per Stage 2 Decision E, v1 only supports "anthropic" as a BYO
// provider. The schema stays String so future providers don't break.
// Unknown providers fall back to the shared client with a warning.

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { decrypt } from "@/lib/encryption";

export interface ResolvedAnthropic {
  client: Anthropic;
  isByo: boolean;
}

export async function getAnthropicForUser(
  userId: string,
): Promise<ResolvedAnthropic> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { byoApiProvider: true, byoApiKey: true },
  });

  if (!settings?.byoApiProvider || !settings.byoApiKey) {
    return { client: getAnthropicClient(), isByo: false };
  }

  if (settings.byoApiProvider !== "anthropic") {
    console.warn(
      `[byo-anthropic] user ${userId} has unsupported BYO provider "${settings.byoApiProvider}" — falling back to default`,
    );
    return { client: getAnthropicClient(), isByo: false };
  }

  let apiKey: string;
  try {
    apiKey = decrypt(settings.byoApiKey);
  } catch (err) {
    console.error(
      `[byo-anthropic] failed to decrypt BYO key for user ${userId}`,
      err,
    );
    throw new ByoKeyError(
      "Your stored BYO key could not be decrypted. Save a new key in /settings/ai.",
    );
  }

  return {
    client: new Anthropic({ apiKey }),
    isByo: true,
  };
}

// Marker error so route handlers can distinguish "BYO key problem"
// from a generic Anthropic SDK error and surface a "check /settings/ai"
// message to the user (Decision F — fail loudly, no silent fallback).
export class ByoKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ByoKeyError";
  }
}

// Inspect an error thrown by the Anthropic SDK to decide whether it
// looks like an auth-rejection on the BYO key. Callers wrap with this
// when isByo is true.
export function isAnthropicAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number; type?: string };
  if (e.status === 401 || e.status === 403) return true;
  if (e.statusCode === 401 || e.statusCode === 403) return true;
  // Anthropic SDK sometimes surfaces errors with type strings.
  if (e.type === "authentication_error" || e.type === "permission_error") {
    return true;
  }
  return false;
}
