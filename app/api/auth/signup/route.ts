import { NextResponse } from "next/server";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid signup payload" },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Email already registered" },
      { status: 409 },
    );
  }

  const passwordHash = await bcryptjs.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: passwordHash, name },
  });

  return NextResponse.json(
    { success: true, data: { id: user.id, email: user.email } },
    { status: 201 },
  );
}
