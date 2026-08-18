"use client";

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import {
  OutdoorCondenserOpen,
  CapacitorCloseUp,
  type Callout,
} from "@/components/illustrations";
import { RemindersPanel } from "@/components/reminders-panel";
import { FieldNotesPanel } from "@/components/field-notes-panel";
import { SeansNotesPanel } from "@/components/seans-notes-panel";
import { PhotoSlot } from "@/components/photo-slot";
import { ReadPageButton } from "@/components/read-page-button";
import { CAPACITOR_REMINDERS } from "@/lib/defaults";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const CONDENSER_CALLOUTS: Callout[] = [
  { id: "cap", label: "CAPACITOR", target: { x: 395, y: 215 }, labelPos: { x: 510, y: 175 } },
  { id: "cont", label: "CONTACTOR", target: { x: 230, y: 215 }, labelPos: { x: 80, y: 175 } },
  { id: "comp", label: "COMPRESSOR", target: { x: 290, y: 320 }, labelPos: { x: 80, y: 340 } },
];

const CAP_CALLOUTS: Callout[] = [
  { id: "c", label: "C — COMMON", target: { x: 240, y: 198 }, labelPos: { x: 80, y: 110 } },
  { id: "fan", label: "FAN", target: { x: 300, y: 198 }, labelPos: { x: 80, y: 170 } },
  { id: "herm", label: "HERM", target: { x: 360, y: 198 }, labelPos: { x: 80, y: 230 } },
  { id: "rating", label: "RATING", target: { x: 300, y: 290 }, labelPos: { x: 520, y: 290 } },
];

export function CapacitorScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const pageText = useMemo(
    () =>
      [
        "Capacitor. Dual-run capacitor reference.",
        "Safety first. Capacitors can hold a charge after power is removed. Verify power is OFF and follow proper discharge procedures before touching any wire or terminal.",
        "The capacitor is the round can inside the outdoor condenser. It has three terminals: C, common; FAN; and HERM, for the compressor.",
        "Quick reminders. " + CAPACITOR_REMINDERS.join(" "),
      ].join(" "),
    []
  );

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Capacitor"
        subtitle="Dual-run capacitor reference"
        right={<ReadPageButton getText={() => pageText} />}
      />
      <div className="space-y-4 p-4">
        {/* Safety callout */}
        <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-3">
          <div className="mb-1 flex items-center gap-2 text-red-300">
            <ShieldAlert size={18} />
            <p className="text-sm font-bold uppercase tracking-wider">Safety First</p>
          </div>
          <p className="text-sm text-red-100/90">
            Capacitors can hold a charge after power is removed. Verify power
            is OFF and follow proper discharge procedures before touching any
            wire or terminal.
          </p>
        </div>

        {/* Real photo slot with SVG fallback */}
        <PhotoSlot
          section="capacitor"
          title="Location — Outdoor Condenser"
          fallback={
            <OutdoorCondenserOpen
              callouts={CONDENSER_CALLOUTS}
              highlightId={activeId || undefined}
            />
          }
        />
        {/* Quick highlight chips — only relevant when SVG is shown */}
        <div className="mt-2 flex flex-wrap gap-2">
          {CONDENSER_CALLOUTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(activeId === c.id ? null : c.id)}
              className={cn(
                "tap-lg rounded-md border px-3 py-1.5 text-xs font-bold",
                activeId === c.id
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-border bg-card text-foreground/80"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Capacitor close-up */}
        <div>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-amber-400">
            Terminals — C / FAN / HERM
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <CapacitorCloseUp
              callouts={CAP_CALLOUTS}
              highlightId={activeId || undefined}
            />
          </div>
        </div>

        <RemindersPanel items={CAPACITOR_REMINDERS} />

        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <p className="font-bold text-foreground">Tolerance &amp; Spec</p>
          <p className="mt-1">
            Do NOT use a single universal tolerance. Always compare your meter
            reading against the rating and tolerance printed on the actual
            capacitor. If your employer specifies a tighter replacement rule,
            record it in the field notes below.
          </p>
        </div>

        <FieldNotesPanel section="capacitor" title="My Capacitor Notes" />
        <SeansNotesPanel section="capacitor" />
      </div>
    </div>
  );
}
