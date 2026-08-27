import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function isoDate(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatHoursFromMinutes(min: number): string {
  const hours = Math.floor(min / 60);
  const mins = Math.round(min % 60);
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHours(hrs: number): string {
  return `${hrs.toFixed(2)} hrs`;
}

/** Work-week key: Sunday through Saturday. The key is the Sunday's local ISO date. */
export function weekKey(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const tmp = new Date(date);
  tmp.setHours(12, 0, 0, 0);
  tmp.setDate(tmp.getDate() - tmp.getDay());
  return isoDate(tmp);
}

export function formatTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatTimestamp(epoch: number): string {
  return new Date(epoch).toLocaleString([], {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
  });
}

export function formatGps(latitude?: number, longitude?: number, accuracyMeters?: number): string | null {
  if (latitude == null || longitude == null) return null;
  const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  return accuracyMeters != null ? `${coords} (±${Math.round(accuracyMeters)} m)` : coords;
}

export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
