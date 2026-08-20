"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { useCoilsideStore, weeklyTotalsFor } from "@/lib/store";
import type { Employer, WorkEntry } from "@/lib/types";
import {
  formatHours,
  formatHoursFromMinutes,
  formatTime,
  formatDateLabel,
  weekKey,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNav } from "@/lib/nav";

const EMPLOYER_LABEL: Record<Employer, string> = {
  tim: "Tim Johnson Heating & Cooling",
  sean: "Sean / Farmhouse",
};

const EMPLOYER_SHORT: Record<Employer, string> = {
  tim: "Tim Johnson",
  sean: "Farmhouse",
};

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function totalHoursFor(startAt: number, stopAt: number, breakMinutes: number): number {
  return Math.max(0, stopAt - startAt - breakMinutes * 60_000) / 3_600_000;
}

export function WorkScreen() {
  const [employer, setEmployer] = useState<Employer>("tim");
  const [date, setDate] = useState(todayIsoLocal());
  const [start, setStart] = useState("08:00");
  const [stop, setStop] = useState("16:00");
  const [tookLunch, setTookLunch] = useState(false);
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const startAt = epochFromTime(date, start);
  const stopAt = epochFromTime(date, stop);
  const breakMinutes = tookLunch ? Math.max(0, lunchMinutes || 0) : 0;
  const previewHours = stopAt > startAt ? totalHoursFor(startAt, stopAt, breakMinutes) : 0;

  function saveEntry() {
    if (!date || !start || !stop) {
      setError("Date, start time, and end time are required.");
      return;
    }
    if (stopAt <= startAt) {
      setError("End time has to be after start time.");
      return;
    }
    if (previewHours <= 0) {
      setError("Lunch time cannot wipe out the whole shift.");
      return;
    }

    const entry: WorkEntry = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employer,
      date,
      startAt,
      stopAt,
      breakMinutes,
      totalHours: previewHours,
      note: note.trim(),
    };

    useCoilsideStore.setState((state) => ({
      workEntries: [entry, ...state.workEntries],
      activeTimer: null,
    }));

    setError("");
    setNote("");
    setTookLunch(false);
    setLunchMinutes(30);
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Work Hours" subtitle="Manual timecards — no timer" />

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={employer === "tim" ? "default" : "outline"}
            className="h-12"
            onClick={() => setEmployer("tim")}
          >
            Tim Johnson
          </Button>
          <Button
            type="button"
            variant={employer === "sean" ? "default" : "outline"}
            className="h-12"
            onClick={() => setEmployer("sean")}
          >
            Farmhouse
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
            {EMPLOYER_LABEL[employer]}
          </p>

          <div className="mb-3">
            <Label htmlFor="work-date">Date</Label>
            <Input
              id="work-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="work-start">Started</Label>
              <Input
                id="work-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <Label htmlFor="work-stop">Ended</Label>
              <Input
                id="work-stop"
                type="time"
                value={stop}
                onChange={(e) => setStop(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <div className="mb-3 rounded-lg border border-border bg-background/40 p-3">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block font-semibold">Took lunch?</span>
                <span className="block text-xs text-muted-foreground">Leave off for no lunch.</span>
              </span>
              <input
                type="checkbox"
                checked={tookLunch}
                onChange={(e) => setTookLunch(e.target.checked)}
                className="h-5 w-5 accent-amber-500"
              />
            </label>

            {tookLunch && (
              <div className="mt-3">
                <Label htmlFor="lunch-minutes">Lunch minutes</Label>
                <Input
                  id="lunch-minutes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={lunchMinutes}
                  onChange={(e) => setLunchMinutes(Math.max(0, parseInt(e.target.value || "0", 10)))}
                  className="h-12"
                />
              </div>
            )}
          </div>

          <div className="mb-3">
            <Label htmlFor="work-note">Note (optional)</Label>
            <Textarea
              id="work-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="What did I work on?"
            />
          </div>

          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This entry</p>
            <p className="mt-1 text-3xl font-black text-amber-300">{previewHours.toFixed(2)}h</p>
            <p className="text-xs text-muted-foreground">
              {start || "--:--"} → {stop || "--:--"}
              {breakMinutes > 0 ? ` · ${breakMinutes} min lunch deducted` : " · no lunch"}
            </p>
          </div>

          {error && (
            <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button onClick={saveEntry} className="h-12 w-full bg-amber-500 text-black hover:bg-amber-400">
            SAVE ENTRY — {previewHours.toFixed(2)} HOURS
          </Button>
        </div>

        <WeeklyTotalsCard />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-11" onClick={() => useNav.getState().go("work-history", { contextId: "tim" })}>
            Tim History
          </Button>
          <Button variant="secondary" className="h-11" onClick={() => useNav.getState().go("work-history", { contextId: "sean" })}>
            Farmhouse History
          </Button>
        </div>
      </div>
    </div>
  );
}

function WeeklyTotalsCard() {
  const workEntries = useCoilsideStore((s) => s.workEntries);
  const weekKeyVal = weekKey(new Date());
  const tim = weeklyTotalsFor(workEntries, "tim", weekKeyVal);
  const sean = weeklyTotalsFor(workEntries, "sean", weekKeyVal);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tim this week</p>
        <p className="mt-1 text-2xl font-black text-amber-300">{tim.hours.toFixed(2)}h</p>
        <p className="text-xs text-muted-foreground">{tim.count} entries</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Farmhouse this week</p>
        <p className="mt-1 text-2xl font-black text-amber-300">{sean.hours.toFixed(2)}h</p>
        <p className="text-xs text-muted-foreground">{sean.count} entries</p>
      </div>
    </div>
  );
}

export function WorkHistoryScreen() {
  const workEntries = useCoilsideStore((s) => s.workEntries);
  const update = useCoilsideStore((s) => s.updateWorkEntry);
  const del = useCoilsideStore((s) => s.deleteWorkEntry);

  const employerFilter = (useNav((s) => s.contextId) ?? "tim") as Employer;
  const entries = useMemo(
    () => workEntries.filter((e) => e.employer === employerFilter),
    [workEntries, employerFilter]
  );
  const total = entries.reduce((sum, entry) => sum + entry.totalHours, 0);

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title={`${EMPLOYER_SHORT[employerFilter]} — History`}
        subtitle={`${entries.length} entries`}
      />
      <div className="space-y-3 p-4">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No entries yet.
          </div>
        ) : (
          entries.map((e) => (
            <EntryCard key={e.id} entry={e} onUpdate={update} onDelete={del} />
          ))
        )}

        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total shown</p>
          <p className="text-3xl font-black text-amber-300">{total.toFixed(2)}h</p>
          <p className="text-xs text-muted-foreground">{formatHours(total)}</p>
        </div>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: WorkEntry;
  onUpdate: (id: string, patch: Partial<WorkEntry>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorkEntry>(entry);

  function save() {
    onUpdate(entry.id, {
      breakMinutes: Math.max(0, draft.breakMinutes || 0),
      note: draft.note,
      startAt: draft.startAt,
      stopAt: draft.stopAt,
      date: draft.date,
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold">{formatDateLabel(entry.date)}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(entry.startAt)} → {formatTime(entry.stopAt)}
              {entry.breakMinutes > 0 ? ` · ${entry.breakMinutes} min lunch` : " · no lunch"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-amber-300">{entry.totalHours.toFixed(2)}h</p>
            <p className="text-xs text-muted-foreground">{formatHours(entry.totalHours)}</p>
          </div>
        </div>
        {entry.note && (
          <p className="mt-2 rounded bg-background/40 px-2 py-1.5 text-sm text-foreground/90">
            {entry.note}
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-9">
            <Pencil size={14} className="mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Delete this entry?")) onDelete(entry.id);
            }}
            className="h-9 text-red-400"
          >
            <Trash2 size={14} className="mr-1" /> Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-amber-500/40 bg-card p-3">
      <h3 className="mb-2 text-sm font-bold">Edit Entry</h3>
      <div className="mb-2">
        <Label htmlFor={`date-${entry.id}`}>Date</Label>
        <Input
          id={`date-${entry.id}`}
          type="date"
          value={draft.date}
          onChange={(e) => {
            const newDate = e.target.value;
            setDraft({
              ...draft,
              date: newDate,
              startAt: epochFromTime(newDate, timeFromEpoch(draft.startAt)),
              stopAt: epochFromTime(newDate, timeFromEpoch(draft.stopAt)),
            });
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`st-${entry.id}`}>Started</Label>
          <Input
            id={`st-${entry.id}`}
            type="time"
            value={timeFromEpoch(draft.startAt)}
            onChange={(e) => setDraft({ ...draft, startAt: epochFromTime(draft.date, e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor={`et-${entry.id}`}>Ended</Label>
          <Input
            id={`et-${entry.id}`}
            type="time"
            value={timeFromEpoch(draft.stopAt)}
            onChange={(e) => setDraft({ ...draft, stopAt: epochFromTime(draft.date, e.target.value) })}
          />
        </div>
      </div>
      <div className="mt-2">
        <Label htmlFor={`bm-${entry.id}`}>Lunch minutes (0 = no lunch)</Label>
        <Input
          id={`bm-${entry.id}`}
          type="number"
          inputMode="numeric"
          value={draft.breakMinutes}
          onChange={(e) => setDraft({ ...draft, breakMinutes: Math.max(0, parseInt(e.target.value || "0", 10)) })}
        />
      </div>
      <div className="mt-2">
        <Label htmlFor={`nn-${entry.id}`}>Note</Label>
        <Textarea
          id={`nn-${entry.id}`}
          rows={2}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </div>
      <div className="mt-3 rounded bg-background/50 p-2 text-right">
        <span className="text-sm text-muted-foreground">New total: </span>
        <span className="font-black text-amber-300">
          {totalHoursFor(draft.startAt, draft.stopAt, draft.breakMinutes).toFixed(2)}h
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={save} className="h-11 bg-amber-500 text-black hover:bg-amber-400">Save</Button>
        <Button variant="ghost" onClick={() => setEditing(false)} className="h-11">Cancel</Button>
      </div>
    </div>
  );
}

function timeFromEpoch(epoch: number): string {
  const d = new Date(epoch);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function epochFromTime(dateIso: string, hhmm: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).getTime();
}
