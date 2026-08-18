"use client";

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { IndoorUnitDiagram, type Callout } from "@/components/illustrations";
import { FieldNotesPanel } from "@/components/field-notes-panel";
import { SeansNotesPanel } from "@/components/seans-notes-panel";
import { PhotoSlot } from "@/components/photo-slot";
import { ReadPageButton } from "@/components/read-page-button";
import { cn } from "@/lib/utils";

const CALLOUTS: Callout[] = [
  { id: "coil", label: "EVAPORATOR COIL", target: { x: 300, y: 100 }, labelPos: { x: 80, y: 80 } },
  { id: "blower", label: "BLOWER", target: { x: 245, y: 300 }, labelPos: { x: 80, y: 320 } },
  { id: "control", label: "CONTROL AREA", target: { x: 380, y: 300 }, labelPos: { x: 520, y: 320 } },
  { id: "filter", label: "FILTER", target: { x: 163, y: 224 }, labelPos: { x: 60, y: 220 } },
  { id: "drain", label: "CONDENSATE DRAIN", target: { x: 437, y: 205 }, labelPos: { x: 520, y: 200 } },
];

export function IndoorCoilScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const pageText = useMemo(
    () =>
      [
        "Indoor unit and evaporator coil reference.",
        "Components: evaporator coil at the top, blower below, control area on the right, filter on the side, and condensate drain stub.",
        "Suspected indoor coil leak — what to look for: oil staining on the coil face or cabinet; bubble-test hissing at joints, U-bends, or distributor tubes; a coil section that ices while the rest of the system is warm; compressor running but suction stays near 0 psig or pulls into vacuum; green or black corrosion around copper-to-aluminum joints.",
        "COILSIDE does NOT auto-diagnose a leak. Use leak detection methods appropriate to the refrigerant and your employer's procedures.",
      ].join(" "),
    []
  );

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Indoor Unit / Evaporator Coil"
        subtitle="Air handler / furnace reference"
        right={<ReadPageButton getText={() => pageText} />}
      />
      <div className="space-y-4 p-4">
        <PhotoSlot
          section="indoor-coil"
          title="Components"
          fallback={
            <IndoorUnitDiagram
              callouts={CALLOUTS}
              highlightId={activeId || undefined}
            />
          }
        />
        <div className="flex flex-wrap gap-2">
          {CALLOUTS.map((c) => (
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

        {/* Suspected leak panel */}
        <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-3">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            Suspected Indoor Coil Leak — What to Look For
          </h3>
          <ul className="space-y-2 text-sm text-foreground/90">
            <li>Oil staining on the coil face or cabinet (refrigerant oil travels with the leak)</li>
            <li>Bubble-test hissing at joints / U-bends / distributor tubes</li>
            <li>Coil section that ices while the rest of the system is warm</li>
            <li>Compressor running but suction stays near 0 psig or pulls into vacuum</li>
            <li>Green / black corrosion around copper-to-aluminum joints</li>
          </ul>
          <p className="mt-3 rounded bg-background/40 p-2 text-xs text-muted-foreground">
            COILSIDE does NOT auto-diagnose a leak. Use leak detection methods
            appropriate to the refrigerant and your employer&apos;s procedures.
          </p>
        </div>

        <FieldNotesPanel section="indoor-coil" title="My Indoor Coil Notes" />
        <SeansNotesPanel section="indoor-coil" />
      </div>
    </div>
  );
}
