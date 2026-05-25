import { prisma } from "@/lib/prisma";

// §13 principle 8: a day counts toward streak if the user completed a task
// OR logged a session >= 10 minutes. This module centralises that rule so
// the two API entry points (tasks/complete and sessions/end) can't diverge.
//
// Day boundary is UTC midnight for Phase 1. User-timezone localisation is
// a known limitation — fine for MVP, surface to localise when we ship to
// users in non-aligned zones.

const MIN_SESSION_MINUTES_FOR_STREAK = 10;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Records that the user was active today. Idempotent within a UTC day
 * (calling twice the same day does not double-increment the streak).
 * Resets to 1 if the last active day was anything other than yesterday
 * (or today, in which case it's a no-op).
 */
export async function recordActiveDay(userId: string): Promise<void> {
  const existing = await prisma.userProgress.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const today = startOfUtcDay(new Date());
  const lastActive = existing.lastActiveDate
    ? startOfUtcDay(existing.lastActiveDate)
    : null;

  if (lastActive && lastActive.getTime() === today.getTime()) {
    // Already counted today — no-op.
    return;
  }

  const yesterday = new Date(today.getTime() - 86_400_000);
  const isConsecutive =
    lastActive !== null && lastActive.getTime() === yesterday.getTime();

  const newStreak = isConsecutive ? existing.currentStreak + 1 : 1;
  const newLongest = Math.max(existing.longestStreak, newStreak);

  await prisma.userProgress.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
    },
  });
}

/**
 * Adds minutes to the cumulative total. Used by both task completion
 * (estimated minutes) and session end (actual minutes). Some
 * double-counting is possible if a user runs a session AND ticks tasks
 * within it — accepted as a Phase 1 trade-off for simpler accounting.
 */
export async function addProgressMinutes(
  userId: string,
  minutes: number,
): Promise<void> {
  if (minutes <= 0) return;
  await prisma.userProgress.upsert({
    where: { userId },
    create: { userId, totalMinutes: minutes },
    update: { totalMinutes: { increment: minutes } },
  });
}

/**
 * Convenience: record a session end. Always adds the duration to total
 * minutes. Only increments streak if the session was long enough to
 * count as "showing up" — see MIN_SESSION_MINUTES_FOR_STREAK.
 */
export async function recordSessionEnd(
  userId: string,
  durationMin: number,
): Promise<void> {
  await addProgressMinutes(userId, durationMin);
  if (durationMin >= MIN_SESSION_MINUTES_FOR_STREAK) {
    await recordActiveDay(userId);
  }
}
