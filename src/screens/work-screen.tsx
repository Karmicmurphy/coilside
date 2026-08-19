"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pause,
  Play,
  Square,
  Trash2,
  Pencil,
  X,
  History,
} from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore, weeklyTotalsFor } from "@/lib/store";
import type { Employer, WorkEntry } from "@/lib/types";
import {
  formatElapsed,
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
import { BigButton } from "@/components/big-button";
import { cn } from "@/lib/utils";

const EMPLOYER_LABEL: Record<Employer, string> = {
  tim: "Tim Johnson Heating & Cooling",
  sean: "Sean / Farmhouse & Side Jobs",
};

const EMPLOYER_SHORT: Record<Employer, string> = {
  tim: "Tim Johnson",
  sean: "Sean / Farmhouse",
};

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WorkScreen() {
  const { go } = useRouter();
  const active = useCoilsideStore((s) => s.activeTimer);
  const startTimer = useCoilsideStore((s) => s.startTimer);
  const stopTimer = useCoilsideStore((s) => s.stopTimer);
  const cancelTimer = useCoilsideStore((s) => s.cancelTimer);

  const [employer, setEmployer] = useState<Employer | null>(null);
  const [, setTick] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [note, setNote] = useState("");

  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmployer, setManualEmployer] = useState<Employer>("tim");
  const [manualDate, setManualDate] = useState(todayIsoLocal());
  const [manualStart, setManualStart] = useState("08:00");
  const [manualStop, setManualStop] = useState("16:00");
  const [manualBreak, setManualBreak] = useState(0);
  const [manualNote, setManualNote] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  function confirmStart(emp: Employer) {
    if (active) return;
    startTimer(emp);
    setEmployer(null);
  }

  function handleStop() {
    setStopping(true);
  }

  function confirmStop() {
    const entry = stopTimer({ breakMinutes, note });
    setStopping(false);
    setBreakMinutes(0);
    setNote("");
    if (entry) go("work-history", { contextId: entry.employer });
  }

  function saveManualEntry() {
    const startAt = epochFromTime(manualDate, manualStart);
    const stopAt = epochFromTime(manualDate, manualStop);
    const breakMins = Math.max(0, manualBreak || 0);

    if (!manualDate || !manualStart || !manualStop) {
      setManualError("Date, start time, and stop time are required.");
      return;
    }
    if (stopAt <= startAt) {
      setManualError("Stop time has to be after start time.");
      return;
    }

    const totalHours = Math.max(0, stopAt - startAt - breakMins * 60_000) / 3_600_000;
    if (totalHours <= 0) {
      setManualError("Break time cannot wipe out the whole shift.");
      return;
    }

    const entry: WorkEntry = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employer: manualEmployer,
      date: manualDate,
      startAt,
      stopAt,
      breakMinutes: breakMins,
      totalHours,
      note: manualNote.trim(),
    };

    useCoilsideStore.setState((state) => ({
      workEntries: [entry, ...state.workEntries],
    }));

    setManualError("");
    setManualNote("");
    setManualBreak(0);
    setManualOpen(false);
    go("work-history", { contextId: manualEmployer });
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Work Hours" subtitle="Tim and Sean are tracked separately" />

      <div className="space-y-4 p-4">
        {active && (
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {EMPLOYER_SHORT[active.employer]}
              </p>
              <button
                onClick={cancelTimer}
                className="tap-lg flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <p className="mt-1 font-mono text-4xl font-black tabular-nums text-amber-100">
              {formatElapsed(Date.now() - active.startedAt)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Started {formatTime(active.startedAt)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                onClick={handleStop}
                className="h-12 bg-amber-500 text-black hover:bg-amber-400"
              >
                <Square size={18} className="mr-2" /> STOP & SAVE
              </Button>
              <Button
                onClick={() => go("work-history", { contextId: active.employer })}
                variant="secondary"
                className="h-12"
              >
                <History size={18} className="mr-2" /> History
              </Button>
            </div>
          </div>
        )}

        {active && stopping && (
          <div className="rounded-xl border-2 border-amber-500/60 bg-card p-4">
            <h3 className="mb-3 text-base font-bold">Stop & Save Entry</h3>
            <div className="mb-3">
              <Label htmlFor="bm">Break / Lunch deduction (minutes)</Label>
              <Input
                id="bm"
                type="number"
                inputMode="numeric"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Math.max(0, parseInt(e.target.value || "0", 10)))}
                min={0}
                className="h-12 text-lg"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Will deduct {formatHoursFromMinutes(breakMinutes)} from the entry.
              </p>
            </div>
            <div className="mb-3">
              <Label htmlFor="wn">Short note (optional)</Label>
              <Textarea
                id="wn"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What were you working on?"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={confirmStop} className="h-12 bg-amber-500 text-black hover:bg-amber-400">
                Save Entry
              </Button>
              <Button variant="ghost" onClick={() => setStopping(false)} className="h-12">
                <X size={16} className="mr-1" /> Keep Running
              </Button>
            </div>
          </div>
        )}

        {!active && !stopping && (
          <>
            <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
              Pick who you&apos;re working for. Tim and farmhouse hours stay strictly separate.
            </div>
            {employer === null ? (
              <div className="space-y-3">
                <BigButton
                  label="Tim Johnson Heating & Cooling"
                  description="Primary employer hours"
                  icon={<Play size={22} className="text-amber-400" />}
                  variant="primary"
                  onClick={() => setEmployer("tim")}
                />
                <BigButton
                  label="Sean / Farmhouse & Side Jobs"
                  description="Farmhouse / side work"
                  icon={<Play size={22} className="text-amber-400" />}
                  variant="default"
                  onClick={() => setEmployer("sean")}
                />
                <Button
                  variant="secondary"
                  className="h-12 w-full"
                  onClick={() => {
                    setManualEmployer("tim");
                    setManualError("");
                    setManualOpen(true);
                  }}
                >
                  MANUALLY ENTER HOURS
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-amber-500/60 bg-card p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  Start timer for:
                </p>
                <p className="mb-3 text-lg font-bold">{EMPLOYER_LABEL[employer]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => confirmStart(employer)} className="h-12 bg-amber-500 text-black hover:bg-amber-400">
                    <Play size={18} className="mr-1" /> Start Now
                  </Button>
                  <Button variant="ghost" onClick={() => setEmployer(null)} className="h-12">
                    Back
                  </Button>
                </div>
              </div>
            )}

            {manualOpen && (
              <div className="rounded-xl border-2 border-sky-500/40 bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-400">Manual time entry</p>
                    <h3 className="text-base font-bold">Add hours I forgot to clock</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setManualOpen(false)}>
                    <X size={16} />
                  </Button>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={manualEmployer === "tim" ? "default" : "outline"}
                    className="h-11"
                    onClick={() => setManualEmployer("tim")}
                  >
                    Tim Johnson
                  </Button>
                  <Button
                    type="button"
                    variant={manualEmployer === "sean" ? "default" : "outline"}
                    className="h-11"
                    onClick={() => setManualEmployer("sean")}
                  >
                    Farmhouse
                  </Button>
                </div>

                <div className="mb-3">
                  <Label htmlFor="manual-date">Date</Label>
                  <Input
                    id="manual-date"
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="manual-start">Start</Label>
                    <Input
                      id="manual-start"
                      type="time"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-stop">Stop</Label>
                    <Input
                      id="manual-stop"
                      type="time"
                      value={manualStop}
                      onChange={(e) => setManualStop(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <Label htmlFor="manual-break">Break / lunch deduction (minutes)</Label>
                  <Input
                    id="manual-break"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={manualBreak}
                    onChange={(e) => setManualBreak(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className="h-12"
                  />
                </div>

                <div className="mb-3">
                  <Label htmlFor="manual-note">Note (optional)</Label>
                  <Textarea
                    id="manual-note"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    rows={2}
                    placeholder="What did I work on?"
                  />
                </div>

                {manualError && (
                  <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
                    {manualError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={saveManualEntry} className="h-12 bg-sky-500 text-black hover:bg-sky-400">
                    SAVE HOURS
                  </Button>
                  <Button variant="ghost" onClick={() => setManualOpen(false)} className="h-12">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <WeeklyTotalsCard />
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

  const employerFilter = (useNav_employerContext() ?? "tim") as Employer;
  const entries = useMemo(
    () => workEntries.filter((e) => e.employer === employerFilter),
    [workEntries, employerFilter]
  );

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title={`${EMPLOYER_SHORT[employerFilter]} — History`}
        subtitle={`${entries.length} entries • Tap to edit`}
      />
      <div className="space-y-3 p-4">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No entries yet. Use START WORK or MANUALLY ENTER HOURS.
          </div>
        ) : (
          entries.map((e) => (
            <EntryCard key={e.id} entry={e} onUpdate={update} onDelete={del} />
          ))
        )}
      </div>
    </div>
  );
}

import { useNav } from "@/lib/nav";
function useNav_employerContext(): string | null {
  return useNav((s) => s.contextId);
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
              Started {formatTime(entry.startAt)} → Stopped {formatTime(entry.stopAt)}
              {entry.breakMinutes > 0 && ` · −${formatHoursFromMinutes(entry.breakMinutes)} break`}
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
      <h3 className="mb-2 text-sm font-bold">Edit Entry — {formatDateLabel(entry.date)}</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="st">Start (24h)</Label>
          <Input
            id="st"
            type="time"
            value={timeFromEpoch(entry.startAt)}
            onChange={(e) => {
              const newMs = epochFromTime(entry.date, e.target.value);
              setDraft({ ...draft, startAt: newMs });
            }}
          />
        </div>
        <div>
          <Label htmlFor="et">Stop (24h)</Label>
          <Input
            id="et"
            type="time"
            value={timeFromEpoch(entry.stopAt)}
            onChange={(e) => {
              const newMs = epochFromTime(entry.date, e.target.value);
              setDraft({ ...draft, stopAt: newMs });
            }}
          />
        </div>
      </div>
      <div className="mt-2">
        <Label htmlFor="bm2">Break (minutes)</Label>
        <Input
          id="bm2"
          type="number"
          inputMode="numeric"
          value={draft.breakMinutes}
          onChange={(e) => setDraft({ ...draft, breakMinutes: Math.max(0, parseInt(e.target.value || "0", 10)) })}
        />
      </div>
      <div className="mt-2">
        <Label htmlFor="nn">Note</Label>
        <Textarea
          id="nn"
          rows={2}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
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
