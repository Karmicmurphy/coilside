/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { reviseWorkEntry, workDayEntries, workDayTotal, workDayPhotos } from "../src/lib/work-hours";
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
