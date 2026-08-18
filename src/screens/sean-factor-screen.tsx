"use client";

// THE SEAN FACTOR — primary tab combining:
//   - WHAT SEAN TAUGHT ME (learning notes)
//   - SEAN SAID SOME SHIT (quote archive)
//   - SEAN SHIT-TALK COUNTER (today/week/all-time)
//   - SEAN FACTOR SCORE (Easter egg percentage + rotating status message)

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { BigButton } from "@/components/big-button";
import {
  SEAN_FACTOR_STATUSES,
  computeSeanFactorPercent,
  shitTalkMilestone,
} from "@/lib/defaults";
import { isoDate, weekKey } from "@/lib/utils";
import {
  Flame,
  Mic,
  Plus,
  Quote as QuoteIcon,
  BookOpen,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SeanFactorScreen() {
  const { go } = useRouter();

  // Individual primitive selectors — no array returns, no infinite loops.
  const seanNotesCount = useCoilsideStore((s) => s.seanNotes.length);
  const seanQuotesCount = useCoilsideStore((s) => s.seanQuotes.length);
  const shitTalkDays = useCoilsideStore((s) => s.shitTalkDays);
  const incrementShitTalk = useCoilsideStore((s) => s.incrementShitTalk);
  const decrementShitTalk = useCoilsideStore((s) => s.decrementShitTalk);
  const resetTodayShitTalk = useCoilsideStore((s) => s.resetTodayShitTalk);

  // Compute today / this-week / all-time totals
  const { today, thisWeek, allTime } = useMemo(() => {
    const todayIso = isoDate(new Date());
    const wk = weekKey(new Date());
    let today = 0;
    let thisWeek = 0;
    let allTime = 0;
    for (const d of shitTalkDays) {
      allTime += d.count;
      if (d.date === todayIso) today = d.count;
      if (weekKey(new Date(d.date + "T00:00:00")) === wk) thisWeek += d.count;
    }
    return { today, thisWeek, allTime };
  }, [shitTalkDays]);

  const factorPercent = computeSeanFactorPercent(
    seanNotesCount,
    seanQuotesCount,
    today
  );

  // Pick a rotating status message — stable per mount
  const [statusIdx] = useState(() =>
    Math.floor(Math.random() * SEAN_FACTOR_STATUSES.length)
  );
  const status = SEAN_FACTOR_STATUSES[statusIdx];

  const milestone = shitTalkMilestone(today);

  function handlePlusOne() {
    incrementShitTalk();
  }

  function handleReset() {
    if (confirm("Reset today's shit-talk count to 0?")) {
      resetTodayShitTalk();
    }
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="THE SEAN FACTOR" subtitle="Field mentor & chaos agent" />
      <div className="space-y-4 p-4">
        {/* SEAN FACTOR SCORE — Easter egg */}
        <section className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
            SEAN FACTOR
          </p>
          <p className="mt-1 font-mono text-5xl font-black text-amber-300">
            {factorPercent}%
          </p>
          <p className="mt-2 text-xs italic text-muted-foreground">{status}</p>
        </section>

        {/* SHIT-TALK COUNTER */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Sean Shit-Talk Counter
              </p>
              <p className="text-[10px] text-muted-foreground">
                Track today&apos;s incidents
              </p>
            </div>
            <TrendingUp size={18} className="text-amber-400" />
          </div>

          {/* Big +1 button */}
          <button
            onClick={handlePlusOne}
            className="tap-xl flex w-full flex-col items-center justify-center rounded-lg border-2 border-amber-500/60 bg-amber-500/20 py-6 font-black text-amber-200 transition active:scale-95"
            aria-label="Plus one shit talk"
          >
            <span className="text-4xl">+1</span>
            <span className="mt-1 text-xs uppercase tracking-wider">
              Sean talked some shit
            </span>
          </button>

          {/* Counts */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-background/50 p-2">
              <p className="text-2xl font-black text-amber-300">{today}</p>
              <p className="text-[10px] uppercase text-muted-foreground">
                Today
              </p>
            </div>
            <div className="rounded-md bg-background/50 p-2">
              <p className="text-2xl font-black text-amber-300">{thisWeek}</p>
              <p className="text-[10px] uppercase text-muted-foreground">
                This week
              </p>
            </div>
            <div className="rounded-md bg-background/50 p-2">
              <p className="text-2xl font-black text-amber-300">{allTime}</p>
              <p className="text-[10px] uppercase text-muted-foreground">
                All time
              </p>
            </div>
          </div>

          {/* Milestone */}
          {milestone && (
            <p className="mt-3 rounded-md bg-amber-500/15 px-3 py-2 text-center text-sm font-bold text-amber-300">
              {milestone}
            </p>
          )}

          {/* Reset / undo */}
          <div className="mt-3 flex gap-2">
            <Button
              onClick={decrementShitTalk}
              variant="ghost"
              className="h-9 flex-1 text-xs text-muted-foreground"
              disabled={today === 0}
            >
              Undo last
            </Button>
            <Button
              onClick={handleReset}
              variant="ghost"
              className="h-9 flex-1 text-xs text-red-400"
              disabled={today === 0}
            >
              <RotateCcw size={12} className="mr-1" /> Reset today
            </Button>
          </div>
        </section>

        {/* What Sean Taught Me */}
        <BigButton
          label="WHAT SEAN TAUGHT ME"
          description={seanNotesCount > 0 ? `${seanNotesCount} notes` : "Learning notes"}
          icon={<BookOpen className="h-7 w-7 text-amber-400" />}
          onClick={() => go("sean-notes")}
        />

        {/* Sean Said Some Shit */}
        <BigButton
          label="SEAN SAID SOME SHIT"
          description={seanQuotesCount > 0 ? `${seanQuotesCount} quotes` : "Quote archive"}
          icon={<QuoteIcon className="h-7 w-7 text-amber-400" />}
          variant="warning"
          onClick={() => go("sean-quotes")}
        />

        {/* Quick: + Sean Said Some Shit */}
        <Button
          onClick={() => go("sean-quote-new", { contextId: "sean-quote" })}
          className="h-12 w-full bg-amber-500 text-black hover:bg-amber-400"
        >
          <Mic size={18} className="mr-2" /> + SEAN SAID SOME SHIT 🎙️
        </Button>

        {/* Quick: + Sean taught me */}
        <Button
          onClick={() => go("sean-note-new")}
          variant="secondary"
          className="h-12 w-full"
        >
          <Plus size={18} className="mr-2" /> + WHAT SEAN TAUGHT ME
        </Button>

        <Flame className="mx-auto h-6 w-6 text-amber-500/60" />
        <p className="text-center text-[10px] italic text-muted-foreground">
          Sean Factor is a deliberately meaningless Easter egg. Not analytics.
        </p>
      </div>
    </div>
  );
}
