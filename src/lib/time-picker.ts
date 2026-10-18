/** Clock-picker helpers. Persist time as local 24-hour HH:mm, regardless of display. */
export type Meridiem = "AM" | "PM";

export function parseTime24(value: string): { hour: number; minute: number; meridiem: Meridiem } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hours = match ? Number(match[1]) : NaN;
  const minutes = match ? Number(match[2]) : NaN;
  if (!Number.isInteger(hours) || hours < 0 || hours > 23 ||
      !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return { hour: 8, minute: 0, meridiem: "AM" };
  }
  return {
    hour: hours % 12 || 12,
    minute: minutes,
    meridiem: hours >= 12 ? "PM" : "AM",
  };
}

export function toTime24(hour: number, minute: number, meridiem: Meridiem): string {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59 ||
      (meridiem !== "AM" && meridiem !== "PM")) {
    throw new Error("Invalid clock time");
  }
  const hours = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTime12(value: string): string {
  const { hour, minute, meridiem } = parseTime24(value);
  return `${hour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}
