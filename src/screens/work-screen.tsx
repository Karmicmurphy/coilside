"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Share2, Trash2 } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { VoiceHoursCapture } from "@/components/voice-hours-capture";
import { WorkReceiptCard } from "@/components/work-receipt-card";
import { useCoilsideStore, weeklyTotalsFor } from "@/lib/store";
import type { Employer, WorkEntry } from "@/lib/types";
import { formatHours, formatTime, formatDateLabel, weekKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNav } from "@/lib/nav";

const EMPLOYER_LABEL: Record<Employer, string> = {
  tim: "Tim Johnson Heating & Cooling",
  sean: "Sean / Farmhouse",
  jesse: "Jesse Johnson — Independent Projects",
};

const EMPLOYER_SHORT: Record<Employer, string> = {
  tim: "Tim Johnson",
  sean: "Farmhouse",
  jesse: "Jesse Johnson",
};

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function epochFromTime(dateIso: string, hhmm: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime();
}

function timeFromEpoch(epoch: number): string {
  const d = new Date(epoch);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function totalHoursFor(startAt: number, stopAt: number, breakMinutes: number): number {
  return Math.max(0, stopAt - startAt - breakMinutes * 60_000) / 3_600_000;
}

function weekDateFromKey(key: string, offsetDays = 0): Date {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function isoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function moveWeek(key: string, weeks: number): string {
  return isoLocal(weekDateFromKey(key, weeks * 7));
}

function weekRangeLabelFromKey(key: string): string {
  const start = isoLocal(weekDateFromKey(key));
  const end = isoLocal(weekDateFromKey(key, 6));
  return `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
}

function isZeroDay(entry: WorkEntry): boolean {
  return entry.totalHours === 0;
}

function shortDateLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

async function buildTimesheetPng(employer: Employer, entries: WorkEntry[], selectedWeekKey: string): Promise<Blob> {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((sum, e) => sum + e.totalHours, 0);
  const width = 1200;
  const padding = 56;
  const headerHeight = 250;
  const tableHeaderHeight = 76;
  const rowHeight = 112;
  const totalHeight = 170;
  const height = padding * 2 + headerHeight + tableHeaderHeight + rowHeight * Math.max(sorted.length, 1) + totalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#111318";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#07516c";
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.fillStyle = "#20bdf3";
  ctx.font = "700 38px Arial, sans-serif";
  ctx.fillText("WEEKLY TIMESHEET", padding, 92);
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "700 54px Arial, sans-serif";
  ctx.fillText(EMPLOYER_LABEL[employer], padding, 160);
  ctx.fillStyle = "#a8a8a8";
  ctx.font = "32px Arial, sans-serif";
  ctx.fillText(weekRangeLabelFromKey(selectedWeekKey), padding, 212);

  const tableTop = padding + headerHeight;
  const cols = [padding, 355, 555, 735, 940];
  ["DATE", "START", "END", "LUNCH", "HOURS"].forEach((label, i) => {
    ctx.fillStyle = "#a8a8a8";
    ctx.font = "700 29px Arial, sans-serif";
    ctx.textAlign = i === 4 ? "right" : "left";
    ctx.fillText(label, i === 4 ? width - padding : cols[i], tableTop + 49);
  });

  sorted.forEach((entry, index) => {
    const y = tableTop + tableHeaderHeight + index * rowHeight;
    ctx.strokeStyle = "#292c33";
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
    ctx.textAlign = "left"; ctx.fillStyle = "#f5f5f5"; ctx.font = "700 31px Arial, sans-serif";
    ctx.fillText(shortDateLabel(entry.date), cols[0], y + 68);
    ctx.font = "31px Arial, sans-serif";
    if (isZeroDay(entry)) {
      ctx.fillText("—", cols[1], y + 68); ctx.fillText("—", cols[2], y + 68); ctx.fillText("No work", cols[3], y + 68);
    } else {
      ctx.fillText(formatTime(entry.startAt), cols[1], y + 68); ctx.fillText(formatTime(entry.stopAt), cols[2], y + 68);
      ctx.fillText(entry.breakMinutes > 0 ? `${entry.breakMinutes} min` : "No", cols[3], y + 68);
    }
    ctx.textAlign = "right"; ctx.fillStyle = "#ffd12f"; ctx.font = "700 34px Arial, sans-serif";
    ctx.fillText(entry.totalHours.toFixed(2), width - padding, y + 68);
    if ((entry.extraMinutes || 0) > 0) { ctx.font = "20px Arial, sans-serif"; ctx.fillStyle = "#20bdf3"; ctx.fillText(`+${entry.extraMinutes}m extra`, width - padding, y + 102); }
  });

  const footerY = tableTop + tableHeaderHeight + Math.max(sorted.length, 1) * rowHeight;
  ctx.fillStyle = "#302416"; ctx.fillRect(padding, footerY + 20, width - padding * 2, 128);
  ctx.textAlign = "left"; ctx.fillStyle = "#aaa6a0"; ctx.font = "700 31px Arial, sans-serif"; ctx.fillText("WEEK TOTAL", padding + 30, footerY + 75);
  ctx.font = "28px Arial, sans-serif"; ctx.fillText(`${sorted.length} day${sorted.length === 1 ? "" : "s"} documented`, padding + 30, footerY + 113);
  ctx.textAlign = "right"; ctx.fillStyle = "#ffd12f"; ctx.font = "700 68px Arial, sans-serif"; ctx.fillText(`${total.toFixed(2)}h`, width - padding - 30, footerY + 100);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create image")), "image/png", 1));
}

export function WorkScreen() {
  const [employer, setEmployer] = useState<Employer>("tim");
  const [date, setDate] = useState(todayIsoLocal());
  const [start, setStart] = useState("08:00");
  const [stop, setStop] = useState("16:00");
  const [tookLunch, setTookLunch] = useState(false);
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [note, setNote] = useState("");
  const [workSite, setWorkSite] = useState("");
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [savedHint, setSavedHint] = useState(false);
  const [error, setError] = useState("");

  const startAt = epochFromTime(date, start);
  const stopAt = epochFromTime(date, stop);
  const breakMinutes = tookLunch ? Math.max(0, lunchMinutes || 0) : 0;
  const previewHours = stopAt > startAt && breakMinutes * 60_000 <= stopAt - startAt ? totalHoursFor(startAt, stopAt, breakMinutes) + extraMinutes / 60 : 0;

  function addEntry(entry: WorkEntry) {
    useCoilsideStore.setState((state) => ({ workEntries: [entry, ...state.workEntries], activeTimer: null }));
    setError(""); setNote(""); setWorkSite(""); setExtraMinutes(0); setSavedHint(true); setTookLunch(false); setLunchMinutes(30);
  }

  function saveEntry() {
    if (!date || !start || !stop) return setError("Date, start time, and end time are required.");
    if (stopAt <= startAt) return setError("End time has to be after start time.");
    if (previewHours <= 0) return setError("Use DID NOT WORK for a zero-hour day.");
    if (extraMinutes > 0 && !note.trim()) return setError("Describe the additional work in the note so the extra time is clear.");
    addEntry({ id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, employer, date, startAt, stopAt, breakMinutes, totalHours: previewHours, extraMinutes, note: note.trim(), workSite: workSite.trim() });
  }

  function saveZeroDay() {
    if (!date) return setError("Pick the date first.");
    const at = epochFromTime(date, "00:00");
    addEntry({ id: `zero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, employer, date, startAt: at, stopAt: at, breakMinutes: 0, totalHours: 0, note: note.trim() || "Did not work", workSite: workSite.trim() });
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Work Hours" subtitle="Sunday–Saturday work weeks" />
      <div className="space-y-4 p-4">
        <VoiceHoursCapture />

        <div className="grid grid-cols-3 gap-2">
          <Button variant={employer === "tim" ? "default" : "outline"} className="h-12" onClick={() => setEmployer("tim")}>Tim Johnson</Button>
          <Button variant={employer === "sean" ? "default" : "outline"} className="h-12" onClick={() => setEmployer("sean")}>Farmhouse</Button>
          <Button variant={employer === "jesse" ? "default" : "outline"} className="h-12 px-1 text-xs" onClick={() => setEmployer("jesse")}>Jesse Johnson</Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">Manual entry · {EMPLOYER_LABEL[employer]}</p>
          <Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mb-3 h-12" />
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div><Label>Started</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-12" /></div>
            <div><Label>Ended</Label><Input type="time" value={stop} onChange={(e) => setStop(e.target.value)} className="h-12" /></div>
          </div>
          <label className="mb-3 flex min-h-12 items-center justify-between rounded-lg border border-border bg-background/40 p-3"><span className="font-semibold">Took lunch?</span><input type="checkbox" checked={tookLunch} onChange={(e) => setTookLunch(e.target.checked)} className="h-5 w-5 accent-amber-500" /></label>
          {tookLunch && <div className="mb-3"><Label>Lunch minutes</Label><Input type="number" min={0} value={lunchMinutes} onChange={(e) => setLunchMinutes(Math.max(0, parseInt(e.target.value || "0", 10)))} className="h-12" /></div>}
          <div className="mb-3"><Label>Job / property (optional)</Label><Input value={workSite} onChange={(e) => setWorkSite(e.target.value)} placeholder="Example: Farmhouse fence" className="h-12" /></div>
          <div className="mb-3">
            <Label>Additional work not captured by these times (minutes)</Label>
            <Input type="number" min={0} max={480} step={5} value={extraMinutes} onChange={(e) => setExtraMinutes(Math.min(480, Math.max(0, parseInt(e.target.value || "0", 10))))} className="h-12" />
            <p className="mt-1 text-xs text-muted-foreground">Example: 30 minutes you worked but forgot to record. This is listed separately, not added to the clock times.</p>
          </div>
          <div className="mb-3"><Label>What did you do? Problems or delays? {extraMinutes > 0 ? "(required to explain the extra time)" : "(optional)"}</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"><p className="text-xs font-bold uppercase text-muted-foreground">This entry</p><p className="text-3xl font-black text-amber-300">{previewHours.toFixed(2)}h</p>{extraMinutes > 0 && <p className="text-xs text-muted-foreground">Includes +{extraMinutes} minutes of documented extra labor</p>}</div>
          {error && <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
          {savedHint && <div className="mb-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">Hours saved. Open this employer’s timesheet below to attach work photos and share a daily receipt.</div>}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={saveEntry} className="h-12 bg-amber-500 text-black">SAVE {previewHours.toFixed(2)}h</Button>
            <Button variant="secondary" onClick={saveZeroDay} className="h-12">DID NOT WORK · 0h</Button>
          </div>
        </div>
        <WeeklyTotalsCard />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="secondary" onClick={() => useNav.getState().go("work-history", { contextId: "tim" })}>Tim Timesheet</Button>
          <Button variant="secondary" onClick={() => useNav.getState().go("work-history", { contextId: "sean" })}>Farmhouse Timesheet</Button>
          <Button variant="secondary" onClick={() => useNav.getState().go("work-history", { contextId: "jesse" })}>Jesse Timesheet</Button>
        </div>
      </div>
    </div>
  );
}

function WeeklyTotalsCard() {
  const workEntries = useCoilsideStore((s) => s.workEntries);
  const key = weekKey(new Date());
  const tim = weeklyTotalsFor(workEntries, "tim", key);
  const sean = weeklyTotalsFor(workEntries, "sean", key);
  const jesse = weeklyTotalsFor(workEntries, "jesse", key);
  return <div className="grid grid-cols-3 gap-2"><div className="rounded-lg border border-border bg-card p-3"><p className="text-xs uppercase text-muted-foreground">Tim this week</p><p className="text-2xl font-black text-amber-300">{tim.hours.toFixed(2)}h</p></div><div className="rounded-lg border border-border bg-card p-3"><p className="text-xs uppercase text-muted-foreground">Farmhouse this week</p><p className="text-2xl font-black text-amber-300">{sean.hours.toFixed(2)}h</p></div><div className="rounded-lg border border-border bg-card p-3"><p className="text-xs uppercase text-muted-foreground">Jesse this week</p><p className="text-2xl font-black text-amber-300">{jesse.hours.toFixed(2)}h</p></div></div>;
}

export function WorkHistoryScreen() {
  const workEntries = useCoilsideStore((s) => s.workEntries);
  const update = useCoilsideStore((s) => s.updateWorkEntry);
  const del = useCoilsideStore((s) => s.deleteWorkEntry);
  const employerFilter = (useNav((s) => s.contextId) ?? "tim") as Employer;
  const [selectedWeekKey, setSelectedWeekKey] = useState(() => weekKey(new Date()));
  const [shareStatus, setShareStatus] = useState<"idle" | "working" | "done">("idle");
  const entries = useMemo(() => workEntries.filter((e) => e.employer === employerFilter && !e.voidedAt), [workEntries, employerFilter]);
  const weekEntries = useMemo(() => entries.filter((entry) => weekKey(new Date(`${entry.date}T12:00:00`)) === selectedWeekKey), [entries, selectedWeekKey]);
  const weekTotal = weekEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const receiptDates = [...new Set(weekEntries.map((entry) => entry.date))].sort().reverse();
  const voidedWeekEntries = workEntries.filter((entry) =>
    entry.employer === employerFilter && entry.voidedAt &&
    weekKey(new Date(`${entry.date}T12:00:00`)) === selectedWeekKey
  );

  async function shareWeeklyTimesheet() {
    if (!weekEntries.length || shareStatus === "working") return;
    setShareStatus("working");
    try {
      const blob = await buildTimesheetPng(employerFilter, weekEntries, selectedWeekKey);
      const file = new File([blob], `${employerFilter}-${selectedWeekKey}-timesheet.png`, { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ files: [file], title: `${EMPLOYER_LABEL[employerFilter]} Timesheet` });
      else {
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setShareStatus("done"); setTimeout(() => setShareStatus("idle"), 1500);
    } catch { setShareStatus("idle"); }
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title={`${EMPLOYER_SHORT[employerFilter]} — Timesheet`} subtitle="Sunday through Saturday" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-[52px_1fr_52px] items-center gap-2">
          <Button variant="secondary" onClick={() => setSelectedWeekKey(moveWeek(selectedWeekKey, -1))}><ChevronLeft /></Button>
          <div className="text-center"><p className="text-xs font-bold uppercase text-sky-400">Selected work week</p><p className="text-sm font-semibold">{weekRangeLabelFromKey(selectedWeekKey)}</p></div>
          <Button variant="secondary" onClick={() => setSelectedWeekKey(moveWeek(selectedWeekKey, 1))}><ChevronRight /></Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => setSelectedWeekKey(weekKey(new Date()))}>THIS WEEK</Button>

        <div className="rounded-xl border-2 border-sky-500/30 bg-card p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-sky-400">Weekly timesheet</p><p className="font-bold">{EMPLOYER_LABEL[employerFilter]}</p></div><Button onClick={shareWeeklyTimesheet} disabled={!weekEntries.length || shareStatus === "working"}>{shareStatus === "done" ? <Check size={17} className="mr-2" /> : <Share2 size={17} className="mr-2" />}{shareStatus === "working" ? "Making…" : shareStatus === "done" ? "Done" : "Copy / Share"}</Button></div>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr_1fr_0.75fr] gap-1 bg-background/70 px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground"><span>Date</span><span>Start</span><span>End</span><span>Lunch</span><span className="text-right">Hours</span></div>
            {weekEntries.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">No entries for this Sunday–Saturday week.</div> : [...weekEntries].sort((a,b)=>a.date.localeCompare(b.date)).map((entry) => <div key={entry.id} className="grid grid-cols-[1.25fr_0.8fr_0.8fr_1fr_0.75fr] gap-1 border-t border-border px-2 py-2 text-xs"><span className="font-semibold">{formatDateLabel(entry.date)}</span>{isZeroDay(entry) ? <><span>—</span><span>—</span><span>No work</span></> : <><span>{formatTime(entry.startAt)}</span><span>{formatTime(entry.stopAt)}</span><span>{entry.breakMinutes > 0 ? `${entry.breakMinutes} min` : "No"}</span></>}<span className="text-right font-black text-amber-300">{entry.totalHours.toFixed(2)}</span></div>)}
          </div>
          <div className="mt-3 flex items-end justify-between rounded-lg bg-amber-500/10 p-3"><div><p className="text-xs font-bold uppercase text-muted-foreground">Week total</p><p className="text-xs text-muted-foreground">{weekEntries.length} documented day{weekEntries.length === 1 ? "" : "s"}</p></div><p className="text-3xl font-black text-amber-300">{weekTotal.toFixed(2)}h</p></div>
        </div>

        <p className="pt-2 text-xs font-bold uppercase text-muted-foreground">Daily Work Receipts · photos + descriptions</p>
        {receiptDates.map((day) => (
          <WorkReceiptCard key={day} employer={employerFilter} date={day} entries={weekEntries.filter((entry) => entry.date === day)} />
        ))}
        <p className="pt-2 text-xs font-bold uppercase text-muted-foreground">Entries for this week only</p>
        {weekEntries.map((e) => <EntryCard key={e.id} entry={e} onUpdate={update} onDelete={del} />)}
        {voidedWeekEntries.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Voided entries · excluded from totals, retained for audit</p>
            {voidedWeekEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 border-t border-border py-2 text-sm">
                <span>{formatDateLabel(entry.date)} · {entry.totalHours.toFixed(2)}h (voided)</span>
                <Button variant="outline" size="sm" onClick={() => update(entry.id, { voidedAt: undefined })}>Restore</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCard({ entry, onUpdate, onDelete }: { entry: WorkEntry; onUpdate: (id: string, patch: Partial<WorkEntry>) => void; onDelete: (id: string) => void; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry);
  const [validation, setValidation] = useState("");
  if (!editing) return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-bold">{formatDateLabel(entry.date)}{entry.workSite ? ` · ${entry.workSite}` : ""}</p>
          <p className="text-xs text-muted-foreground">
            {isZeroDay(entry) ? "Did not work" : `${formatTime(entry.startAt)} → ${formatTime(entry.stopAt)}${entry.breakMinutes > 0 ? ` · ${entry.breakMinutes} min break` : " · no break"}`}
          </p>
        </div>
        <p className="text-lg font-black text-amber-300">{entry.totalHours.toFixed(2)}h</p>
      </div>
      {(entry.extraMinutes || 0) > 0 && <p className="mt-2 text-xs font-semibold text-sky-400">+{entry.extraMinutes} minutes documented additional work (not part of the clock interval)</p>}
      {entry.note && <p className="mt-2 text-sm">{entry.note}</p>}
      {(entry.revisions?.length || 0) > 0 && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary>{entry.revisions?.length} saved correction(s) · view previous values</summary>
          {entry.revisions?.map((revision, i) => (
            <div key={i} className="mt-2 border-t border-border pt-2">
              <p>Changed: {new Date(revision.at).toLocaleString()}</p>
              <p>Previous: {revision.before.date} · {new Date(revision.before.startAt).toLocaleTimeString()} – {new Date(revision.before.stopAt).toLocaleTimeString()} · {revision.before.breakMinutes}m break · {revision.before.totalHours.toFixed(2)}h</p>
              <p>Previous job: {revision.before.workSite || "Not entered"}</p>
              <p>Previous extra time: {revision.before.extraMinutes || 0} minutes</p>
              <p>Previous notes: {revision.before.note || "Not entered"}</p>
              {revision.before.voidedAt && <p>Previously voided</p>}
            </div>
          ))}
        </details>
      )}
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setDraft(entry); setValidation(""); setEditing(true); }}><Pencil size={14} className="mr-1"/>Edit</Button>
        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { if (confirm("Void this entry? It stays in the correction history and will not count toward hours.")) onDelete(entry.id); }}><Trash2 size={14} className="mr-1"/>Void</Button>
      </div>
    </div>
  );
  const zeroDay = isZeroDay(entry);
  return (
    <div className="rounded-lg border-2 border-amber-500/40 bg-card p-3">
      <Label>Date</Label>
      <Input type="date" value={draft.date} onChange={(event) => { const nd = event.target.value; setDraft({ ...draft, date: nd, startAt: epochFromTime(nd, timeFromEpoch(draft.startAt)), stopAt: epochFromTime(nd, timeFromEpoch(draft.stopAt)) }); }} />
      {!zeroDay && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div><Label>Started</Label><Input type="time" value={timeFromEpoch(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: epochFromTime(draft.date, event.target.value) })} /></div>
            <div><Label>Ended</Label><Input type="time" value={timeFromEpoch(draft.stopAt)} onChange={(event) => setDraft({ ...draft, stopAt: epochFromTime(draft.date, event.target.value) })} /></div>
          </div>
          <div className="mt-2"><Label>Break minutes</Label><Input type="number" min={0} value={draft.breakMinutes} onChange={(event) => setDraft({ ...draft, breakMinutes: Math.max(0, parseInt(event.target.value || "0", 10)) })} /></div>
        </>
      )}
      {!zeroDay && (
        <div className="mt-2">
          <Label>Additional work not captured by clock times (minutes)</Label>
          <Input type="number" min={0} max={480} step={5} value={draft.extraMinutes || 0} onChange={(event) => setDraft({ ...draft, extraMinutes: Math.min(480, Math.max(0, parseInt(event.target.value || "0", 10))) })} />
        </div>
      )}
      <div className="mt-2"><Label>Job / property</Label><Input value={draft.workSite || ""} onChange={(event) => setDraft({ ...draft, workSite: event.target.value })} /></div>
      <div className="mt-2"><Label>What did you do?</Label><Textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></div>
      {validation && <p className="mt-2 text-xs text-red-400">{validation}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => {
          if (!zeroDay && (draft.stopAt <= draft.startAt || draft.breakMinutes * 60_000 >= draft.stopAt - draft.startAt)) {
            setValidation("End must be after start and the break must be shorter than the shift.");
            return;
          }
          if ((draft.extraMinutes || 0) > 0 && !draft.note.trim()) {
            setValidation("Explain the additional work in the note before saving.");
            return;
          }
          onUpdate(entry.id, { date: draft.date, startAt: draft.startAt, stopAt: draft.stopAt, breakMinutes: draft.breakMinutes, extraMinutes: draft.extraMinutes || 0, note: draft.note, workSite: draft.workSite });
          setEditing(false);
        }}>Save correction</Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}
