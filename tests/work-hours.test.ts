/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { recalculateEditedWorkHours } from "../src/lib/work-hours";
import { formatTime12, parseTime24, toTime24 } from "../src/lib/time-picker";

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

describe("mobile clock time picker", () => {
  test("shows 8:00 AM and converts it back without changing stored format", () => {
    expect(parseTime24("08:00")).toEqual({ hour: 8, minute: 0, meridiem: "AM" });
    expect(formatTime12("08:00")).toBe("8:00 AM");
    expect(toTime24(8, 0, "AM")).toBe("08:00");
  });

  test("handles 12 AM and 12 PM correctly", () => {
    expect(toTime24(12, 0, "AM")).toBe("00:00");
    expect(toTime24(12, 0, "PM")).toBe("12:00");
    expect(formatTime12("00:00")).toBe("12:00 AM");
    expect(formatTime12("12:00")).toBe("12:00 PM");
  });

  test("preserves precise minutes in late afternoon and edited entries", () => {
    expect(parseTime24("17:07")).toEqual({ hour: 5, minute: 7, meridiem: "PM" });
    expect(toTime24(5, 7, "PM")).toBe("17:07");
    expect(toTime24(4, 45, "PM")).toBe("16:45");
  });

  test("rejects invalid minutes and hour values", () => {
    expect(() => toTime24(0, 0, "AM")).toThrow("Invalid clock time");
    expect(() => toTime24(8, 60, "PM")).toThrow("Invalid clock time");
  });
});
