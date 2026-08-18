"use client";

import { useEffect, useRef } from "react";
import { AppBar } from "@/components/app-bar";
import { EditableChecklist } from "@/components/editable-checklist";
import { useCoilsideStore, DEFAULT_ANNUAL_SERVICE_ITEMS } from "@/lib/store";
import { makeChecklistItems, SMARTASS_RESPONSES } from "@/lib/defaults";
import { useSmartassResponse } from "@/hooks/use-smartass-response";
import { ClipboardList } from "lucide-react";

export function AnnualServiceScreen() {
  // Select the existing annual-service checklist (or undefined) — derived selector.
  const active = useCoilsideStore((s) => s.checklists.find((c) => c.kind === "annual-service"));
  const create = useCoilsideStore((s) => s.createChecklist);
  const smartass = useSmartassResponse();

  // useRef sentinel so the smartass announcement fires once per all-done transition.
  const announcedRef = useRef(false);

  // Create on first visit only — Zustand mutation in effect is fine (not a setState call).
  useEffect(() => {
    if (!active) {
      create(
        "annual-service",
        "Annual Service",
        makeChecklistItems(DEFAULT_ANNUAL_SERVICE_ITEMS)
      );
    }
  }, [active, create]);

  const done = active ? active.items.filter((i) => i.done).length : 0;
  const allDone = !!active && done === active.items.length && done > 0;

  // Smartass voice announcement — fires once per "all-done" transition.
  useEffect(() => {
    if (allDone && !announcedRef.current) {
      announcedRef.current = true;
      smartass(SMARTASS_RESPONSES.annualServiceComplete);
    } else if (!allDone) {
      announcedRef.current = false;
    }
  }, [allDone, smartass]);

  if (!active) {
    return (
      <div className="min-h-dvh pb-24">
        <AppBar title="Annual Service" />
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Annual Service"
        subtitle={`${done} of ${active.items.length} done`}
      />
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-muted-foreground">
            Tap each item as you complete it. Add, remove, edit, or reorder items to match your employer&apos;s actual procedure — generic items can be replaced any time.
          </p>
        </div>
        <EditableChecklist checklist={active} accentColor="amber" />
        {allDone && (
          <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/15 p-4 text-center">
            <p className="text-lg font-black text-amber-300">SERVICE COMPLETE</p>
          </div>
        )}
      </div>
    </div>
  );
}
