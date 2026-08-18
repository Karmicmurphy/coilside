import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Stable unique id generator (no external deps). */
export function uid(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

/** ISO date YYYY-MM-DD in local time. */
export function isoDate(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format minutes as H:MM (e.g. 90 -> 1:30). */
export function formatHoursFromMinutes(min: number): string {
  const hours = Math.floor(min / 60);
  const mins = Math.round(min % 60);
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

/** Format elapsed ms as H:MM:SS for a running timer. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Format a number of hours as "X.XX hrs". */
export function formatHours(hrs: number): string {
  return `${hrs.toFixed(2)} hrs`;
}

/** Get the Monday-based week key for a date. */
export function weekKey(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const tmp = new Date(date);
  const day = (tmp.getDay() + 6) % 7; // 0 = Monday
  tmp.setDate(tmp.getDate() - day);
  const y = tmp.getFullYear();
  const m = String(tmp.getMonth() + 1).padStart(2, "0");
  const day2 = String(tmp.getDate()).padStart(2, "0");
  return `${y}-${m}-${day2}`;
}

/** Human readable time-of-day from epoch ms. */
export function formatTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Friendly date label. */
export function formatDateLabel(iso: string): string {
  // Parse YYYY-MM-DD as local date
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
