"use client";

import { useMemo, useState } from "react";
import { Check, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function isoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateForSpokenDay(label: string): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const lower = label.toLowerCase();
  if (lower === "today") return now;
  if (lower === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  const wanted = DAY_INDEX[lower];
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const result = new Date(sunday);
  result.setDate(sunday.getDate() + wanted);
  // If somebody says a weekday later than today, assume the most recent one,
  // not a future shift that has not happened yet.
  if (result.getTime() > now.getTime()) result.setDate(result.getDate() - 7);
  return result;
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

  if (!meridiem) {
    if (!isEnd) {
      // Field-work shorthand: “8” means 8 AM unless explicitly said otherwise.
      if (hour === 12) hour = 12;
    } else if (startHour != null) {
      // “8 to 4:30” / “8 to 2:30” means afternoon ending time.
      if (hour < 12 && hour <= startHour) hour += 12;
      else if (hour < 7) hour += 12;
    }
  }
  return { hour, minute };
}

function epoch(date: Date, clock: { hour: number; minute: number }): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), clock.hour, clock.minute, 0, 0).getTime();
}

function lunchMinutesFor(segment: string): number {
  if (/no\s+lunch|without\s+lunch|didn['’]?t\s+(?:take|have)\s+(?:a\s+)?lunch/i.test(segment)) return 0;
  const minuteMatch = segment.match(/(?:lunch|break)[^\d]{0,15}(\d{1,3})\s*(?:min|minute)/i)
    || segment.match(/(\d{1,3})\s*(?:min|minute)[^,.]{0,12}(?:lunch|break)/i);
  if (minuteMatch) return Math.max(0, Number(minuteMatch[1]));
  if (/took\s+(?:a\s+)?lunch|had\s+(?:a\s+)?lunch|lunch/i.test(segment)) return 30;
  return 0;
}

function parseSegment(dayLabel: string, segment: string): ParsedShift | null {
  const date = dateForSpokenDay(dayLabel);
  const dateIso = isoLocal(date);
  const zero = /didn['’]?t\s+work|did\s+not\s+work|off\s+work|zero\s+hours|0\s+hours/i.test(segment);
  if (zero) {
    const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
    return { date: dateIso, startAt: at, stopAt: at, breakMinutes: 0, totalHours: 0, zeroDay: true, source: segment.trim() };
  }

  const times = segment.match(/(?:worked|work|from)?\s*(\d{1,2}(?::\d{1,2})?\s*(?:am|pm)?)\s*(?:to|until|till|-)\s*(\d{1,2}(?::\d{1,2})?\s*(?:am|pm)?)/i);
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
  return { date: dateIso, startAt, stopAt, breakMinutes, totalHours, zeroDay: false, source: segment.trim() };
}

function parseVoiceHours(text: string): ParsedShift[] {
  const normalized = ` ${text.replace(/\n/g, " ").replace(/\s+/g, " ").trim()} `;
  const dayRe = /\b(yesterday|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
  const matches = [...normalized.matchAll(dayRe)];
  const shifts: ParsedShift[] = [];
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1];
    const start = (matches[i].index || 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index || normalized.length) : normalized.length;
    const segment = normalized.slice(start, end).replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "");
    const parsed = parseSegment(label, segment);
    if (parsed) shifts.push(parsed);
  }

  // De-dupe by date; the last thing spoken for a date wins.
  return Array.from(new Map(shifts.map((shift) => [shift.date, shift])).values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function VoiceHoursCapture() {
  const speech = useSpeechRecognition();
  const [employer, setEmployer] = useState<Employer>("tim");
  const [transcript, setTranscript] = useState("");
  const [saved, setSaved] = useState(false);
  const parsed = useMemo(() => parseVoiceHours(transcript), [transcript]);

  function start() {
    setSaved(false);
    speech.start((finalText) => setTranscript((prev) => `${prev}${prev ? " " : ""}${finalText}`.trim()));
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
      // Replace an existing same-employer/same-date entry instead of silently doubling the day.
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
        <p className="mt-1 text-sm text-muted-foreground">Tap it. Say your days. Check it. Save it.</p>
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

      <p className="mt-2 text-xs text-muted-foreground">Example: “Yesterday worked 8 to 4:30, no lunch. Monday didn’t work. Tuesday worked 8 to 2:30, took a lunch.”</p>
      {speech.interim && <p className="mt-2 text-sm italic text-muted-foreground">…{speech.interim}</p>}
      {speech.error && <p className="mt-2 text-sm text-amber-300">{speech.error}</p>}

      {transcript && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg bg-background/50 p-3 text-sm">“{transcript}”</div>
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
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">I didn’t find a complete day/time entry yet. Say the weekday plus “worked 8 to 4:30” or “didn’t work.”</p>
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
