"use client";

import { useMemo } from "react";
import { AppBar } from "@/components/app-bar";
import { ThermostatWiringDiagram } from "@/components/illustrations";
import { FieldNotesPanel } from "@/components/field-notes-panel";
import { SeansNotesPanel } from "@/components/seans-notes-panel";
import { ReadPageButton } from "@/components/read-page-button";
import { LOW_VOLTAGE_CONVENTIONS } from "@/lib/defaults";
import { AlertTriangle } from "lucide-react";

export function ThermostatScreen() {
  const pageText = useMemo(
    () =>
      [
        "Thermostat and low-voltage wiring.",
        "Flow is thermostat to indoor unit to outdoor condenser.",
        "Wire color conventions. " +
          LOW_VOLTAGE_CONVENTIONS.map(
            (c) => `${c.terminal}, usually ${c.color}, ${c.function}.`
          ).join(" "),
        "Warning. Wire color is a convention, not a guarantee. Verify the terminal and function at both ends.",
      ].join(" "),
    []
  );

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Thermostat / Low-Voltage"
        subtitle="Keep it simple — verify at both ends"
        right={<ReadPageButton getText={() => pageText} />}
      />
      <div className="space-y-4 p-4">
        {/* Diagram */}
        <div>
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-amber-400">
            Flow — THERMOSTAT → INDOOR UNIT → OUTDOOR CONDENSER
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-card p-2">
            <ThermostatWiringDiagram />
          </div>
        </div>

        {/* Conventions table */}
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            Color Conventions
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {LOW_VOLTAGE_CONVENTIONS.map((c) => (
              <li key={c.terminal} className="flex items-center gap-3 p-3">
                <span
                  className="inline-block h-8 w-5 shrink-0 rounded-sm border border-black/40"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    <span className="font-mono text-amber-300">{c.terminal}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {c.color}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.function}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning */}
        <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-3">
          <div className="mb-1 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={18} />
            <p className="text-sm font-bold uppercase tracking-wider">Warning</p>
          </div>
          <p className="text-sm text-amber-100/90">
            WIRE COLOR IS A CONVENTION, NOT A GUARANTEE. VERIFY THE TERMINAL AND
            FUNCTION AT BOTH ENDS. Always confirm R goes to R, C goes to C, etc.
            — never trust color alone.
          </p>
        </div>

        <FieldNotesPanel section="thermostat" title="My Wiring Notes" />
        <SeansNotesPanel section="thermostat" />
      </div>
    </div>
  );
}
