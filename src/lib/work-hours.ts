import type { WorkEntry } from "./types";

/**
 * The edited fields, not the original shift, are authoritative when
 * recalculating a corrected timesheet entry.
 */
export function recalculateEditedWorkHours(
  existing: Pick<WorkEntry, "startAt" | "stopAt" | "breakMinutes">,
  patch: Partial<Pick<WorkEntry, "startAt" | "stopAt" | "breakMinutes">>,
): number {
  const startAt = patch.startAt ?? existing.startAt;
  const stopAt = patch.stopAt ?? existing.stopAt;
  const breakMinutes = Math.max(0, patch.breakMinutes ?? existing.breakMinutes);
  return Math.max(0, stopAt - startAt - breakMinutes * 60_000) / 3_600_000;
}
