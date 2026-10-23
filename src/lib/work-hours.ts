import type { EquipmentPhoto, WorkEntry, WorkEntryRevision } from "./types";

/**
 * The edited fields, not the original shift, are authoritative when
 * recalculating a corrected timesheet entry.
 */
export function recalculateEditedWorkHours(
  existing: Pick<WorkEntry, "startAt" | "stopAt" | "breakMinutes" | "extraMinutes">,
  patch: Partial<Pick<WorkEntry, "startAt" | "stopAt" | "breakMinutes" | "extraMinutes">>,
): number {
  const startAt = patch.startAt ?? existing.startAt;
  const stopAt = patch.stopAt ?? existing.stopAt;
  const breakMinutes = Math.max(0, patch.breakMinutes ?? existing.breakMinutes);
  const extraMinutes = Math.max(0, patch.extraMinutes ?? existing.extraMinutes ?? 0);
  return Math.max(0, stopAt - startAt - breakMinutes * 60_000) / 3_600_000 + extraMinutes / 60;
}


/** Corrections are append-only snapshots of the previous values, including void/restore. */
export function reviseWorkEntry(entry: WorkEntry, patch: Partial<WorkEntry>, at = Date.now()): WorkEntry {
  const before: WorkEntryRevision["before"] = {
    date: entry.date,
    startAt: entry.startAt,
    stopAt: entry.stopAt,
    breakMinutes: entry.breakMinutes,
    totalHours: entry.totalHours,
    extraMinutes: entry.extraMinutes,
    offsetMinutes: entry.offsetMinutes,
    paidMinutes: entry.paidMinutes,
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
    extraMinutes: patch.extraMinutes ?? entry.extraMinutes,
    offsetMinutes: patch.offsetMinutes ?? entry.offsetMinutes,
    paidMinutes: patch.paidMinutes ?? entry.paidMinutes,
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
    extraMinutes: updated.extraMinutes,
    offsetMinutes: updated.offsetMinutes,
    paidMinutes: updated.paidMinutes,
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

/** A work photo never appears on another employer's receipt, even on the same date. */
export function workDayPhotos(photos: EquipmentPhoto[], employer: WorkEntry["employer"], day: string): EquipmentPhoto[] {
  return photos.filter((photo) => photo.workEmployer === employer && photo.workDate === day);
}

/** All accounting is in whole minutes. Credits and payments never rewrite hours actually worked. */
export function workPaymentBreakdown(entry: Pick<WorkEntry, "totalHours" | "offsetMinutes" | "paidMinutes">) {
  const workedMinutes = Math.max(0, Math.round(entry.totalHours * 60));
  const offsetMinutes = Math.min(workedMinutes, Math.max(0, Math.round(entry.offsetMinutes || 0)));
  const payableMinutes = workedMinutes - offsetMinutes;
  const paidMinutes = Math.min(payableMinutes, Math.max(0, Math.round(entry.paidMinutes || 0)));
  return { workedMinutes, offsetMinutes, payableMinutes, paidMinutes, unpaidMinutes: payableMinutes - paidMinutes };
}

/** Grouped receipts never include voided time or a different employer's entries. */
export function summarizeWorkPayments(entries: WorkEntry[]) {
  const total = { workedMinutes: 0, offsetMinutes: 0, payableMinutes: 0, paidMinutes: 0, unpaidMinutes: 0 };
  for (const entry of entries) {
    if (entry.voidedAt) continue;
    const breakdown = workPaymentBreakdown(entry);
    total.workedMinutes += breakdown.workedMinutes;
    total.offsetMinutes += breakdown.offsetMinutes;
    total.payableMinutes += breakdown.payableMinutes;
    total.paidMinutes += breakdown.paidMinutes;
    total.unpaidMinutes += breakdown.unpaidMinutes;
  }
  return total;
}
