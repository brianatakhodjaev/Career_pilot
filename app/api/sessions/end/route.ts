import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordSessionEnd } from "@/lib/streak";

// Per Amendment 4 §15.4: callers (the lesson screen) supply working time
// — minutes spent counting, with paused time EXCLUDED. The fallback to
// elapsed time is kept for safety in case any future caller skips the
// param. recordSessionEnd applies the §13 principle 8 streak rule
// (>= 10 working minutes increments streak).

const RequestSchema = z.object({
  sessionId: z.string().min(1),
  workingTimeMin: z.number().int().min(0).optional(),
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

  const learning = await prisma.learningSession.findFirst({
    where: { id: parsed.data.sessionId, userId },
  });
  if (!learning) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 },
    );
  }
  if (learning.endedAt) {
    return NextResponse.json(
      { success: false, error: "Session already ended" },
      { status: 409 },
    );
  }

  const endedAt = new Date();
  const elapsedMin = Math.max(
    1,
    Math.round((endedAt.getTime() - learning.startedAt.getTime()) / 60_000),
  );
  const durationMin = parsed.data.workingTimeMin ?? elapsedMin;

  await prisma.learningSession.update({
    where: { id: learning.id },
    data: { endedAt, durationMin },
  });

  await recordSessionEnd(userId, durationMin);

  return NextResponse.json(
    { success: true, data: { sessionId: learning.id, durationMin } },
    { status: 200 },
  );
}
