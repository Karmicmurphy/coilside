/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { reviseWorkEntry, workDayEntries, workDayTotal, workDayPhotos, recalculateEditedWorkHours, workPaymentBreakdown, summarizeWorkPayments } from "../src/lib/work-hours";
import type { EquipmentPhoto, WorkEntry } from "../src/lib/types";

const morning: WorkEntry = {
  id: "morning", employer: "sean", date: "2026-10-17",
  startAt: Date.parse("2026-10-17T14:45:00Z"), // 9:45 local
  stopAt: Date.parse("2026-10-17T16:30:00Z"), // 11:30 local
  breakMinutes: 0, totalHours: 1.75, note: "First work period", workSite: "Farmhouse",
};
const afternoon: WorkEntry = {
  ...morning, id: "afternoon",
  startAt: Date.parse("2026-10-17T18:00:00Z"),
  stopAt: Date.parse("2026-10-17T20:45:00Z"),
  totalHours: 2.75, note: "Second work period",
};

describe("COILSIDE daily work receipts", () => {
  test("adds two shifts on one date to 4.50 hours", () => {
    expect(workDayEntries([morning, afternoon], "sean", "2026-10-17")).toHaveLength(2);
    expect(workDayTotal([morning, afternoon], "sean", "2026-10-17")).toBe(4.5);
  });
  test("never mixes employers or dates", () => {
    const tim = { ...morning, employer: "tim" as const, id: "other" };
    expect(workDayTotal([morning, afternoon, tim], "sean", "2026-10-17")).toBe(4.5);
    expect(workDayTotal([morning], "sean", "2026-10-18")).toBe(0);
  });
  test("records an edit's previous values without permitting identity changes", () => {
    const changed = reviseWorkEntry(morning, { id: "injected", employer: "tim", stopAt: morning.stopAt + 900000, note: "Fixed description" }, 123);
    expect(changed.id).toBe(morning.id);
    expect(changed.employer).toBe("sean");
    expect(changed.totalHours).toBe(2);
    expect(changed.revisions).toHaveLength(1);
    expect(changed.revisions?.[0].before.totalHours).toBe(1.75);
    expect(changed.revisions?.[0].before.note).toBe("First work period");
    expect(changed.revisions?.[0].at).toBe(123);
    expect(morning.revisions).toBeUndefined();
  });
  test("documents an omitted 30 minutes for a 5.00-hour daily total without changing clocks", () => {
    const corrected = reviseWorkEntry(afternoon, { extraMinutes: 30, note: "30 minutes of previously unrecorded work" }, 300);
    expect(corrected.startAt).toBe(afternoon.startAt);
    expect(corrected.stopAt).toBe(afternoon.stopAt);
    expect(corrected.totalHours).toBe(3.25);
    expect(workDayTotal([morning, corrected], "sean", "2026-10-17")).toBe(5);
    expect(corrected.revisions?.[0].before.extraMinutes).toBeUndefined();
    expect(recalculateEditedWorkHours(corrected, { extraMinutes: 0 })).toBe(2.75);
  });
  test("2.5 hours worked minus 2 owed leaves 0.5 unpaid, without erasing work", () => {
    const shift: WorkEntry = { ...morning, totalHours: 2.5, offsetMinutes: 120 };
    expect(workPaymentBreakdown(shift)).toEqual({
      workedMinutes: 150, offsetMinutes: 120, payableMinutes: 30, paidMinutes: 0, unpaidMinutes: 30,
    });
    expect(summarizeWorkPayments([shift]).unpaidMinutes).toBe(30);
    expect(shift.totalHours).toBe(2.5);
  });

  test("paid hours and owed-hour credit are audited separately", () => {
    const shift: WorkEntry = { ...morning, totalHours: 2.5, offsetMinutes: 120 };
    const paid = reviseWorkEntry(shift, { paidMinutes: 30 }, 200);
    expect(workPaymentBreakdown(paid).unpaidMinutes).toBe(0);
    expect(paid.totalHours).toBe(2.5);
    expect(paid.revisions?.[0].before.offsetMinutes).toBe(120);
    expect(paid.revisions?.[0].before.paidMinutes).toBeUndefined();
  });

  test("legacy time entries stay fully unpaid by default and voided time stays out of receipts", () => {
    expect(workPaymentBreakdown(morning).unpaidMinutes).toBe(105);
    const voided = reviseWorkEntry(morning, { voidedAt: 123 }, 123);
    expect(summarizeWorkPayments([morning, voided]).workedMinutes).toBe(105);
  });

  test("credit and payment values cannot create a negative unpaid balance", () => {
    const entry = { ...morning, totalHours: 2.5, offsetMinutes: 500, paidMinutes: 999 };
    expect(workPaymentBreakdown(entry).unpaidMinutes).toBe(0);
    expect(workPaymentBreakdown(entry).offsetMinutes).toBe(150);
  });

  test("a mistaken zero-hour day can be corrected into real labor with an audit trail", () => {
    const zeroDay = { ...morning, startAt: 0, stopAt: 0, totalHours: 0 };
    const fixed = reviseWorkEntry(zeroDay, {
      startAt: morning.startAt,
      stopAt: morning.startAt + 150 * 60000,
      offsetMinutes: 120,
      note: "Farmhouse; 2 hours offset against debt",
    }, 456);
    expect(fixed.totalHours).toBe(2.5);
    expect(workPaymentBreakdown(fixed).unpaidMinutes).toBe(30);
    expect(fixed.revisions?.[0].before.totalHours).toBe(0);
  });

  test("no-op edits do not generate fake changes", () => {
    expect(reviseWorkEntry(morning, { note: morning.note })).toBe(morning);
  });
  test("voids exclude labor from receipts, and restoring records a second revision", () => {
    const voided = reviseWorkEntry(morning, { voidedAt: 100 }, 100);
    expect(workDayTotal([voided, afternoon], "sean", "2026-10-17")).toBe(2.75);
    const restored = reviseWorkEntry(voided, { voidedAt: undefined }, 200);
    expect(workDayTotal([restored, afternoon], "sean", "2026-10-17")).toBe(4.5);
    expect(restored.revisions).toHaveLength(2);
  });
  test("work photos only appear on exact employer+date receipt", () => {
    const photo = { id: "a", workEmployer: "sean", workDate: "2026-10-17", workStage: "before" } as EquipmentPhoto;
    const timPhoto = { id: "b", workEmployer: "tim", workDate: "2026-10-17" } as EquipmentPhoto;
    const otherDate = { id: "c", workEmployer: "sean", workDate: "2026-10-16" } as EquipmentPhoto;
    const unrelated = { id: "d" } as EquipmentPhoto;
    expect(workDayPhotos([photo, timPhoto, otherDate, unrelated], "sean", "2026-10-17").map((p) => p.id)).toEqual(["a"]);
  });
});
