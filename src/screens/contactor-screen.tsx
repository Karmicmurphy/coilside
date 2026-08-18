"use client";

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import {
  OutdoorCondenserOpen,
  ContactorCloseUp,
  type Callout,
} from "@/components/illustrations";
import { RemindersPanel } from "@/components/reminders-panel";
import { FieldNotesPanel } from "@/components/field-notes-panel";
import { SeansNotesPanel } from "@/components/seans-notes-panel";
import { PhotoSlot } from "@/components/photo-slot";
import { ReadPageButton } from "@/components/read-page-button";
import { CONTACTOR_REMINDERS } from "@/lib/defaults";
import { cn } from "@/lib/utils";

const CONDENSER_CALLOUTS: Callout[] = [
  { id: "cont", label: "CONTACTOR", target: { x: 230, y: 220 }, labelPos: { x: 80, y: 170 } },
];

const CONT_CALLOUTS: Callout[] = [
  { id: "line", label: "LINE SIDE", target: { x: 230, y: 200 }, labelPos: { x: 80, y: 110 } },
  { id: "load", label: "LOAD SIDE", target: { x: 230, y: 305 }, labelPos: { x: 80, y: 330 } },
  { id: "coil", label: "24V COIL", target: { x: 465, y: 250 }, labelPos: { x: 540, y: 250 } },
  { id: "line-term", label: "LINE TERMINALS", target: { x: 410, y: 207 }, labelPos: { x: 520, y: 130 } },
  { id: "load-term", label: "LOAD TERMINALS", target: { x: 410, y: 282 }, labelPos: { x: 520, y: 350 } },
];

export function ContactorScreen() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const pageText = useMemo(
    () =>
      [
        "Contactor. Magnetic switching with a 24-volt coil.",
        "The contactor is the heavy-duty relay that switches high-voltage power to the compressor and fan. The thermostat's 24-volt call energizes the coil, which pulls the contacts closed.",
        "Line side brings power in. Load side sends power out to the compressor and condenser fan. The 24-volt coil is energized by the thermostat call.",
        "Inspect for burning or discoloration, pitting on contacts, overheated wires, loose connections, bugs and debris.",
      ].join(" "),
    []
  );

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Contactor"
        subtitle="Magnetic switching — 24V coil"
        right={<ReadPageButton getText={() => pageText} />}
      />
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <p>
            The contactor is the heavy-duty relay that switches high-voltage
            power to the compressor and fan. The thermostat&apos;s 24V call
            energizes the coil, which pulls the contacts closed.
          </p>
        </div>

        <PhotoSlot
          section="contactor"
          title="Location — Outdoor Condenser"
          fallback={
            <OutdoorCondenserOpen
              callouts={CONDENSER_CALLOUTS}
              highlightId={activeId || undefined}
            />
          }
        />

        <div>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-amber-400">
            Close-up — Line / Load / Coil
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ContactorCloseUp
              callouts={CONT_CALLOUTS}
              highlightId={activeId || undefined}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONT_CALLOUTS.map((c) => (
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
        </div>

        <RemindersPanel items={CONTACTOR_REMINDERS} />

        <div className="rounded-lg border border-border bg-card p-3 text-sm">
          <p className="font-bold">Inspect for:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Burning / discoloration on the plastic body</li>
            <li>Pitting or build-up on the contacts</li>
            <li>Overheated or melted wire insulation</li>
            <li>Loose screws on any terminal</li>
            <li>Bugs / debris inside the contactor (very common)</li>
          </ul>
        </div>

        <FieldNotesPanel section="contactor" title="My Contactor Notes" />
        <SeansNotesPanel section="contactor" />
      </div>
    </div>
  );
}
