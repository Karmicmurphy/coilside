/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { recalculateEditedWorkHours } from "../src/lib/work-hours";

describe("timesheet correction", () => {
  const original = {
    startAt: Date.parse("2026-10-15T08:00:00Z"),
    stopAt: Date.parse("2026-10-15T16:00:00Z"),
    breakMinutes: 30,
  };

  test("editing only the start time updates hours", () => {
    expect(recalculateEditedWorkHours(original, {
      startAt: Date.parse("2026-10-15T09:00:00Z"),
    })).toBe(6.5);
  });

  test("editing only end time updates hours", () => {
    expect(recalculateEditedWorkHours(original, {
      stopAt: Date.parse("2026-10-15T15:00:00Z"),
    })).toBe(6.5);
  });

  test("editing lunch uses new deduction", () => {
    expect(recalculateEditedWorkHours(original, { breakMinutes: 60 })).toBe(7);
  });

  test("zero-day entry remains zero", () => {
    expect(recalculateEditedWorkHours({ startAt: 0, stopAt: 0, breakMinutes: 0 }, {})).toBe(0);
  });

  test("nonpositive shifts do not become negative hours", () => {
    expect(recalculateEditedWorkHours(original, { stopAt: original.startAt - 3600000 })).toBe(0);
  });
});
