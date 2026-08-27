"use client";

import { useMemo, useState } from "react";
import { Check, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useCoilsideStore } from "@/lib/store";
import type { Employer, WorkEntry } from "@/lib/types";
import { formatDateLabel, formatTime } from "@/lib/utils";

type ParsedShift = {
  date: string;
  startAt: number;
  stopAt: number;
  breakMinutes: number;
  totalHours: number;
  zeroDay: boolean;
  source: string;
};

type DayMarker = {
  label: string;
  date: Date;
  start: number;
  end: number;
};

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const MONTH_INDEX: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};

function isoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeTranscript(text: string): string {
  let value = text
    .replace(/\ba\s*\.\s*m\s*\.?\b/gi, "am")
    .replace(/\bp\s*\.\s*m\s*\.?\b/gi, "pm")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // Android speech occasionally returns identical adjacent words several times.
  value = value.replace(/\b([a-z]+)(?:\s+\1){1,}\b/gi, "$1");

  // Also collapse repeated month/date phrases such as "August 24th August 24th".
  value = value.replace(
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s+\1){1,}\b/gi,
    "$1"
  );

  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    value = value.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
  }
  return value;
}

function mostRecentWeekday(dayName: string): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const wanted = DAY_INDEX[dayName.toLowerCase()];
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const result = new Date(sunday);
  result.setDate(sunday.getDate() + wanted);
  if (result.getTime() > now.getTime()) result.setDate(result.getDate() - 7);
  return result;
}

function explicitDate(monthRaw: string, dayRaw: string): Date | null {
  const month = MONTH_INDEX[monthRaw.toLowerCase()];
  if (month == null) return null;
  const day = Number(dayRaw.replace(/(?:st|nd|rd|th)$/i, ""));
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  const now = new Date();
  let year = now.getFullYear();
  let result = new Date(year, month, day, 12, 0, 0, 0);
  // A spoken date far in the future is almost certainly last year's date.
  if (result.getTime() - now.getTime() > 45 * 24 * 60 * 60 * 1000) {
    year -= 1;
    result = new Date(year, month, day, 12, 0, 0, 0);
  }
  return result;
}

function findDayMarkers(text: string): DayMarker[] {
  const monthPattern = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  const markerRe = new RegExp(
    `\\b(today|yesterday|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\\s*,?\\s*(${monthPattern})\\s+(\\d{1,2}(?:st|nd|rd|th)?))?|\\b(${monthPattern})\\s+(\\d{1,2}(?:st|nd|rd|th)?)`,
    "gi"
  );

  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const markers: DayMarker[] = [];
  let match: RegExpExecArray | null;

  while ((match = markerRe.exec(text))) {
    const relativeOrWeekday = match[1]?.toLowerCase();
    const attachedMonth = match[2];
    const attachedDay = match[3];
    const standaloneMonth = match[4];
    const standaloneDay = match[5];

    let date: Date | null = null;
    let label = match[0];

    if (attachedMonth && attachedDay) {
      date = explicitDate(attachedMonth, attachedDay);
    } else if (relativeOrWeekday === "today") {
      date = new Date(now);
    } else if (relativeOrWeekday === "yesterday") {
      date = new Date(now);
      date.setDate(date.getDate() - 1);
    } else if (relativeOrWeekday) {
      date = mostRecentWeekday(relativeOrWeekday);
    } else if (standaloneMonth && standaloneDay) {
      date = explicitDate(standaloneMonth, standaloneDay);
    }

    if (date) markers.push({ label, date, start: match.index, end: markerRe.lastIndex });
  }
  return markers;
}

function parseClock(raw: string, isEnd: boolean, startHour?: number): { hour: number; minute: number } | null {
  const cleaned = raw.toLowerCase().replace(/\./g, "").trim();
  const m = cleaned.match(/(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const meridiem = m[3];
  if (hour > 23 || minute > 59) return null;

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  if (!meridiem && isEnd && startHour != null) {
    if (hour < 12 && (hour <= startHour || hour < 7)) hour += 12;
  }
  return { hour, minute };
}

function epoch(date: Date, clock: { hour: number; minute: number }): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), clock.hour, clock.minute, 0, 0).getTime();
}

function lunchMinutesFor(segment: string): number {
  if (/no\s+lunch|without\s+lunch|didn['’]?t\s+(?:take|have)\s+(?:a\s+)?lunch/i.test(segment)) return 0;
  const minuteMatch = segment.match(/(?:lunch|break)[^\d]{0,20}(\d{1,3})\s*(?:min|minute)/i)
    || segment.match(/(\d{1,3})\s*(?:min|minute)[^,.]{0,20}(?:lunch|break)/i);
  if (minuteMatch) return Math.max(0, Number(minuteMatch[1]));
  if (/took\s+(?:a\s+)?lunch|had\s+(?:a\s+)?lunch|took\s+(?:a\s+)?break|\blunch\b/i.test(segment)) return 30;
  return 0;
}

function parseSegment(date: Date, segment: string): ParsedShift | null {
  const dateIso = isoLocal(date);
  const zero = /didn['’]?t\s+work|did\s+not\s+work|was\s+off|off\s+work|zero\s+hours|0\s+hours|no\s+work/i.test(segment);
  if (zero) {
    const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
    return { date: dateIso, startAt: at, stopAt: at, breakMinutes: 0, totalHours: 0, zeroDay: true, source: segment.trim() };
  }

  const times = segment.match(
    /(?:worked|work|from|started(?:\s+at)?|start(?:ed)?(?:\s+at)?)?\s*(\d{1,2}(?::\d{1,2})?\s*(?:am|pm)?)\s*(?:to|until|till|through|-)\s*(\d{1,2}(?::\d{1,2})?\s*(?:am|pm)?)/i
  );
  if (!times) return null;

  const startClock = parseClock(times[1], false);
  if (!startClock) return null;
  const stopClock = parseClock(times[2], true, startClock.hour);
  if (!stopClock) return null;

  const startAt = epoch(date, startClock);
  let stopAt = epoch(date, stopClock);
  if (stopAt <= startAt) stopAt += 12 * 60 * 60 * 1000;

  const breakMinutes = lunchMinutesFor(segment);
  const totalHours = Math.max(0, stopAt - startAt - breakMinutes * 60_000) / 3_600_000;
  if (totalHours <= 0 || totalHours > 20) return null;

  return { date: dateIso, startAt, stopAt, breakMinutes, totalHours, zeroDay: false, source: segment.trim() };
}

function parseVoiceHours(text: string): ParsedShift[] {
  const normalized = normalizeTranscript(text);
  const markers = findDayMarkers(normalized);
  const shifts: ParsedShift[] = [];

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].start : normalized.length;
    const segment = normalized.slice(marker.end, nextStart).replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "");
    const parsed = parseSegment(marker.date, segment);
    if (parsed) shifts.push(parsed);
  }

  // Last spoken entry for the same date wins, preventing repeated recognition from duplicating a day.
  return Array.from(new Map(shifts.map((shift) => [shift.date, shift])).values())
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function VoiceHoursCapture() {
  const speech = useSpeechRecognition();
  const [employer, setEmployer] = useState<Employer>("tim");
  const [transcript, setTranscript] = useState("");
  const [saved, setSaved] = useState(false);
  const parsed = useMemo(() => parseVoiceHours(transcript), [transcript]);

  function start() {
    setSaved(false);
    speech.start((finalText) => {
      setTranscript((prev) => normalizeTranscript(`${prev}${prev ? " " : ""}${finalText}`));
    });
  }

  function clear() {
    speech.abort();
    setTranscript("");
    setSaved(false);
  }

  function saveAll() {
    if (!parsed.length) return;
    const now = Date.now();
    const newEntries: WorkEntry[] = parsed.map((shift, i) => ({
      id: `voice-${now}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      employer,
      date: shift.date,
      startAt: shift.startAt,
      stopAt: shift.stopAt,
      breakMinutes: shift.breakMinutes,
      totalHours: shift.totalHours,
      note: shift.zeroDay ? "Did not work — voice entry" : "Voice-entered hours",
    }));

    useCoilsideStore.setState((state) => {
      const dates = new Set(newEntries.map((e) => e.date));
      const remaining = state.workEntries.filter((e) => !(e.employer === employer && dates.has(e.date)));
      return { workEntries: [...newEntries, ...remaining], activeTimer: null };
    });

    setSaved(true);
    setTranscript("");
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="rounded-xl border-2 border-cyan-500/30 bg-card p-4">
      <div className="mb-3">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-400">WTF Simple Voice Hours</p>
        <p className="mt-1 text-sm text-muted-foreground">Tap it. Say the week naturally. Check it. Save it.</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button variant={employer === "tim" ? "default" : "outline"} onClick={() => setEmployer("tim")}>Tim Johnson</Button>
        <Button variant={employer === "sean" ? "default" : "outline"} onClick={() => setEmployer("sean")}>Farmhouse</Button>
      </div>

      <Button
        onClick={speech.listening ? speech.stop : start}
        className={`h-16 w-full text-base font-black ${speech.listening ? "bg-red-500 text-white hover:bg-red-400" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}
      >
        {speech.listening ? <><MicOff size={23} className="mr-2" /> STOP LISTENING</> : <><Mic size={23} className="mr-2" /> SAY MY HOURS</>}
      </Button>

      <p className="mt-2 text-xs text-muted-foreground">Example: “Monday August 24th, worked 8 to 4:30, no lunch. Tuesday worked 8 to 2:30, took a lunch.”</p>
      {speech.interim && <p className="mt-2 text-sm italic text-muted-foreground">Hearing: {speech.interim}</p>}
      {speech.error && <p className="mt-2 text-sm text-amber-300">{speech.error}</p>}

      {transcript && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What I heard — edit if needed</p>
            <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={4} />
          </div>

          {parsed.length ? (
            <div className="overflow-hidden rounded-lg border border-border">
              {parsed.map((shift) => (
                <div key={shift.date} className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-b-0">
                  <div>
                    <p className="font-bold">{formatDateLabel(shift.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {shift.zeroDay ? "Did not work" : `${formatTime(shift.startAt)} → ${formatTime(shift.stopAt)} · ${shift.breakMinutes ? `${shift.breakMinutes} min lunch` : "no lunch"}`}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-black text-amber-300">{shift.totalHours.toFixed(2)}h</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              I heard you, but I don’t have a complete day + hours yet. Say something like “Monday worked 8 to 4:30, no lunch” or edit the words above.
            </p>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button onClick={saveAll} disabled={!parsed.length} className="h-12 bg-amber-500 font-black text-black hover:bg-amber-400">
              <Check size={18} className="mr-2" /> SAVE {parsed.length} DAY{parsed.length === 1 ? "" : "S"}
            </Button>
            <Button variant="outline" onClick={clear} className="h-12 px-4" aria-label="Clear voice hours"><X size={18} /></Button>
          </div>
        </div>
      )}

      {saved && <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-center text-sm font-bold text-emerald-300">Hours saved.</p>}
    </div>
  );
}
