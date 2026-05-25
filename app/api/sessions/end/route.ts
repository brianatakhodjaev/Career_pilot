import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordSessionEnd } from "@/lib/streak";

const RequestSchema = z.object({
  sessionId: z.string().min(1),
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
  const durationMin = Math.max(
    1,
    Math.round((endedAt.getTime() - learning.startedAt.getTime()) / 60_000),
  );

  await prisma.learningSession.update({
    where: { id: learning.id },
    data: { endedAt, durationMin },
  });

  // §13 principle 8: session counts toward streak only if >= 10 minutes.
  await recordSessionEnd(userId, durationMin);

  return NextResponse.json(
    { success: true, data: { sessionId: learning.id, durationMin } },
    { status: 200 },
  );
}
