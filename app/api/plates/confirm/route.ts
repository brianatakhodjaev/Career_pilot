import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SELECTOR_TAGS } from "@/lib/selector";

// Plate confirmation — persists the user's adjusted plate (CareerPlan +
// PlateItem rows). Deactivates any prior active plate first, then creates
// the new one + nested PlateItems in a single transaction.
//
// durationWeeks is derived from coreCount / pacing.unitsPerWeek so the
// dashboard's "Week N of M" math works without storing pacing separately
// on the row.
export const maxDuration = 30;

const RequestSchema = z.object({
  hoursPerWeek: z.number().int().min(1).max(40),
  pacing: z.object({
    unitsPerWeek: z.number().int().min(1).max(10),
  }),
  items: z
    .array(
      z.object({
        unitNumber: z.number().int().positive(),
        tag: z.enum(SELECTOR_TAGS),
        rationale: z.string().min(1),
        orderIndex: z.number().int().nonnegative(),
      }),
    )
    .min(1),
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

  const { hoursPerWeek, pacing, items } = parsed.data;

  // Resolve unitNumbers (selector vocabulary) to unitIds (DB vocabulary).
  const unitNumbers = items.map((i) => i.unitNumber);
  const units = await prisma.buffetUnit.findMany({
    where: { unitNumber: { in: unitNumbers } },
    select: { id: true, unitNumber: true },
  });
  if (units.length !== unitNumbers.length) {
    return NextResponse.json(
      { success: false, error: "Unknown buffet unit referenced" },
      { status: 400 },
    );
  }
  const numberToId = new Map(units.map((u) => [u.unitNumber, u.id]));

  // Estimated duration = core units / pacing. Min 1 week.
  const coreCount = items.filter((i) => i.tag === "core").length;
  const durationWeeks = Math.max(
    1,
    Math.ceil(coreCount / pacing.unitsPerWeek),
  );

  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.careerPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return await tx.careerPlan.create({
        data: {
          userId,
          isActive: true,
          durationWeeks,
          hoursPerWeek,
          plateItems: {
            create: items.map((item) => ({
              userId,
              unitId: numberToId.get(item.unitNumber)!,
              tag: item.tag,
              rationale: item.rationale,
              orderIndex: item.orderIndex,
            })),
          },
        },
      });
    });

    return NextResponse.json(
      { success: true, data: { planId: created.id } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[plates/confirm] DB write failed", err);
    return NextResponse.json(
      { success: false, error: "Could not save your plate." },
      { status: 502 },
    );
  }
}
