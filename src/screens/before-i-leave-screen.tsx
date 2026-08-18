"use client";

import { useEffect, useRef } from "react";
import { AppBar } from "@/components/app-bar";
import { EditableChecklist } from "@/components/editable-checklist";
import { useCoilsideStore, DEFAULT_BEFORE_I_LEAVE_ITEMS } from "@/lib/store";
import { makeChecklistItems, SMARTASS_RESPONSES } from "@/lib/defaults";
import { useSmartassResponse } from "@/hooks/use-smartass-response";
import { ShieldCheck } from "lucide-react";

export function BeforeILeaveScreen() {
  const active = useCoilsideStore((s) => s.checklists.find((c) => c.kind === "before-i-leave"));
  const create = useCoilsideStore((s) => s.createChecklist);
  const smartass = useSmartassResponse();
  const announcedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      create(
        "before-i-leave",
        "Before I Leave",
        makeChecklistItems(DEFAULT_BEFORE_I_LEAVE_ITEMS)
      );
    }
  }, [active, create]);

  const done = active ? active.items.filter((i) => i.done).length : 0;
  const allDone = !!active && done === active.items.length && active.items.length > 0;

  // Smartass voice announcement — fires once per "all-done" transition.
  useEffect(() => {
    if (allDone && !announcedRef.current) {
      announcedRef.current = true;
      smartass(SMARTASS_RESPONSES.beforeILeaveComplete);
    } else if (!allDone) {
      announcedRef.current = false;
    }
  }, [allDone, smartass]);

  if (!active) {
    return (
      <div className="min-h-dvh pb-24">
        <AppBar title="Before I Leave" />
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Before I Leave"
        subtitle={`${done} of ${active.items.length} done`}
        showHome
      />
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3 rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-100/90">
            Run through every item before you drive off. This list exists to
            prevent stupid callbacks from forgetting one small thing.
          </p>
        </div>

        <EditableChecklist checklist={active} accentColor="amber" />

        {allDone && (
          <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/15 p-4 text-center">
            <p className="text-lg font-black text-amber-300">ALL CLEAR</p>
            <p className="mt-1 text-sm text-amber-100/80">
              Safe to leave the job site.
            </p>
          </div>
        )}

        {/* SCREW STATUS easter egg */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            SCREW STATUS
          </p>
          {allDone ? (
            <p className="mt-1 font-mono text-lg font-black text-emerald-400">
              ALL SCREWS ACCOUNTED FOR
            </p>
          ) : (
            <p className="mt-1 font-mono text-lg font-black text-amber-400">
              UNDER INVESTIGATION
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
