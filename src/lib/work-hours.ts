import type { WorkEntry, WorkEntryRevision } from "./types";

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


/** Corrections are append-only snapshots of the previous values, including void/restore. */
export function reviseWorkEntry(entry: WorkEntry, patch: Partial<WorkEntry>, at = Date.now()): WorkEntry {
  const before: WorkEntryRevision["before"] = {
    date: entry.date,
    startAt: entry.startAt,
    stopAt: entry.stopAt,
    breakMinutes: entry.breakMinutes,
    totalHours: entry.totalHours,
    note: entry.note,
    workSite: entry.workSite,
    voidedAt: entry.voidedAt,
  };
  const updated: WorkEntry = {
    ...entry,
    date: patch.date ?? entry.date,
    startAt: patch.startAt ?? entry.startAt,
    stopAt: patch.stopAt ?? entry.stopAt,
    breakMinutes: patch.breakMinutes ?? entry.breakMinutes,
    note: patch.note ?? entry.note,
    workSite: patch.workSite ?? entry.workSite,
    voidedAt: Object.prototype.hasOwnProperty.call(patch, "voidedAt") ? patch.voidedAt : entry.voidedAt,
    // Identity and prior history cannot be rewritten from a generic patch.
    id: entry.id,
    employer: entry.employer,
    totalHours: recalculateEditedWorkHours(entry, patch),
  };
  const after: WorkEntryRevision["before"] = {
    date: updated.date,
    startAt: updated.startAt,
    stopAt: updated.stopAt,
    breakMinutes: updated.breakMinutes,
    totalHours: updated.totalHours,
    note: updated.note,
    workSite: updated.workSite,
    voidedAt: updated.voidedAt,
  };
  if (JSON.stringify(before) === JSON.stringify(after)) return entry;
  updated.revisions = [...(entry.revisions || []), { at, before }];
  return updated;
}

/** Multiple shifts on the same day count as one daily work receipt. */
export function workDayEntries(entries: WorkEntry[], employer: WorkEntry["employer"], day: string): WorkEntry[] {
  return entries.filter((entry) => entry.employer === employer && entry.date === day && !entry.voidedAt);
}

export function workDayTotal(entries: WorkEntry[], employer: WorkEntry["employer"], day: string): number {
  return workDayEntries(entries, employer, day).reduce((sum, entry) => sum + entry.totalHours, 0);
}
