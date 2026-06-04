// Item and unit status helpers per §15.5 (Amendment 6). Pure: no
// hooks, no I/O. Callers provide the data (PlateItem + per-item
// LessonItemProgress rows + the unit's content shape) and get a
// derived state back.
//
// Item state (per §15.5): not_started | in_progress | complete | got_it.
// Unit state (per §11 step 15 / dashboard rollup):
//   not_started        — PlateItem.startedAt is null
//   in_progress        — startedAt set, at least one required item not done
//   ready_to_complete  — startedAt set, every required item done (complete OR got_it), completedAt null
//   complete           — completedAt set

import type { LessonContent, LessonItem } from "@/lib/lesson-content";

export const ITEM_STATES = ["not_started", "in_progress", "complete", "got_it"] as const;
export type ItemState = (typeof ITEM_STATES)[number];

export const UNIT_STATES = [
  "not_started",
  "in_progress",
  "ready_to_complete",
  "complete",
] as const;
export type UnitState = (typeof UNIT_STATES)[number];

export interface ItemProgressRow {
  itemId: string;
  status: "in_progress" | "complete" | "got_it";
}

export interface PlateItemStateInput {
  startedAt: Date | null;
  completedAt: Date | null;
}

// Map a single item's progress row (or absence) to a four-state status.
export function itemState(row: ItemProgressRow | undefined): ItemState {
  if (!row) return "not_started";
  return row.status;
}

// Derive the unit-level rollup state per §15.5.
export function unitState(
  plate: PlateItemStateInput,
  content: LessonContent,
  itemProgress: ItemProgressRow[],
): UnitState {
  if (plate.completedAt) return "complete";
  if (!plate.startedAt) return "not_started";

  const byId = new Map(itemProgress.map((r) => [r.itemId, r] as const));
  const requiredItems = content.items.filter((i) => i.required);
  const allRequiredDone = requiredItems.every((i) => {
    const row = byId.get(i.id);
    return row?.status === "complete" || row?.status === "got_it";
  });

  return allRequiredDone ? "ready_to_complete" : "in_progress";
}

// Is the "Mark unit complete" CTA enabled?  Mirrors §15.5: enabled when
// every required item reaches complete OR got_it.
export function canMarkUnitComplete(
  content: LessonContent,
  itemProgress: ItemProgressRow[],
): boolean {
  const byId = new Map(itemProgress.map((r) => [r.itemId, r] as const));
  return content.items
    .filter((i) => i.required)
    .every((i) => {
      const row = byId.get(i.id);
      return row?.status === "complete" || row?.status === "got_it";
    });
}

// UI label + tone for a given item state. Components own colors;
// this returns a short string only.
export const ITEM_STATE_LABEL: Record<ItemState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  got_it: "Got it",
};

export const UNIT_STATE_LABEL: Record<UnitState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  ready_to_complete: "Ready to complete",
  complete: "Complete",
};

// Count helpers for the dashboard's progress text.
export function itemCounts(
  content: LessonContent,
  itemProgress: ItemProgressRow[],
): { total: number; done: number } {
  const required: LessonItem[] = content.items.filter((i) => i.required);
  const byId = new Map(itemProgress.map((r) => [r.itemId, r] as const));
  const done = required.filter((i) => {
    const row = byId.get(i.id);
    return row?.status === "complete" || row?.status === "got_it";
  }).length;
  return { total: required.length, done };
}
