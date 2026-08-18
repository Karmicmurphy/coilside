"use client";

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { FieldNotesPanel } from "@/components/field-notes-panel";
import { SeansNotesPanel } from "@/components/seans-notes-panel";
import { ReadPageButton } from "@/components/read-page-button";
import { useCoilsideStore } from "@/lib/store";
import { REFRIGERANT_TYPES } from "@/lib/defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { formatDateLabel } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function RefrigerantScreen() {
  const logs = useCoilsideStore((s) => s.refrigerantLogs);
  const add = useCoilsideStore((s) => s.addRefrigerantLog);
  const del = useCoilsideStore((s) => s.deleteRefrigerantLog);
  const defaultType = useCoilsideStore((s) => s.settings.defaultRefrigerantType);

  const [form, setForm] = useState({
    refrigerantType: defaultType,
    suctionPressure: "",
    headPressure: "",
    suctionTemp: "",
    liquidTemp: "",
    ambientTemp: "",
    amountAdded: "",
    equipmentInfo: "",
    notes: "",
  });

  const pageText = useMemo(
    () =>
      [
        "Refrigerant. Field memory, not diagnosis.",
        "COILSIDE does NOT pretend a single pressure reading proves correct charge. Always verify against manufacturer specifications, superheat or subcooling targets, and operating conditions.",
        "Record refrigerant type, suction pressure, head pressure, suction temperature, liquid temperature, ambient temperature, amount of refrigerant added, and any notes.",
      ].join(" "),
    []
  );

  function save() {
    if (
      !form.suctionPressure &&
      !form.headPressure &&
      !form.notes &&
      !form.amountAdded
    ) {
      return;
    }
    add({
      refrigerantType: form.refrigerantType || "Unknown",
      suctionPressure: form.suctionPressure || undefined,
      headPressure: form.headPressure || undefined,
      suctionTemp: form.suctionTemp || undefined,
      liquidTemp: form.liquidTemp || undefined,
      ambientTemp: form.ambientTemp || undefined,
      amountAdded: form.amountAdded || undefined,
      equipmentInfo: form.equipmentInfo || undefined,
      notes: form.notes || undefined,
    });
    setForm({
      refrigerantType: defaultType,
      suctionPressure: "",
      headPressure: "",
      suctionTemp: "",
      liquidTemp: "",
      ambientTemp: "",
      amountAdded: "",
      equipmentInfo: "",
      notes: "",
    });
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="Refrigerant"
        subtitle="Field memory — record what you saw"
        right={<ReadPageButton getText={() => pageText} />}
      />
      <div className="space-y-4 p-4">
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-3">
          <div className="mb-1 flex items-center gap-2 text-amber-300">
            <AlertTriangle size={18} />
            <p className="text-sm font-bold uppercase tracking-wider">Field Memory — Not Diagnosis</p>
          </div>
          <p className="text-sm text-amber-100/90">
            COILSIDE does NOT pretend a single pressure reading proves correct charge. Always verify against manufacturer specifications, superheat / subcooling targets, and operating conditions.
          </p>
        </div>

        {/* FORM */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">New Reading</h3>

          <div>
            <Label htmlFor="rt">Refrigerant type</Label>
            <select
              id="rt"
              value={form.refrigerantType}
              onChange={(e) => setForm({ ...form, refrigerantType: e.target.value })}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              {REFRIGERANT_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sp">Suction (psig)</Label>
              <Input id="sp" inputMode="decimal" value={form.suctionPressure} onChange={(e) => setForm({ ...form, suctionPressure: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="hp">Head / Discharge (psig)</Label>
              <Input id="hp" inputMode="decimal" value={form.headPressure} onChange={(e) => setForm({ ...form, headPressure: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="st">Suction temp (°F)</Label>
              <Input id="st" inputMode="decimal" value={form.suctionTemp} onChange={(e) => setForm({ ...form, suctionTemp: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="lt">Liquid temp (°F)</Label>
              <Input id="lt" inputMode="decimal" value={form.liquidTemp} onChange={(e) => setForm({ ...form, liquidTemp: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="at">Ambient temp (°F)</Label>
              <Input id="at" inputMode="decimal" value={form.ambientTemp} onChange={(e) => setForm({ ...form, ambientTemp: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="amt">Refrigerant added</Label>
              <Input id="amt" inputMode="decimal" value={form.amountAdded} onChange={(e) => setForm({ ...form, amountAdded: e.target.value })} className="h-12" placeholder="e.g. 1.5 lb" />
            </div>
          </div>

          <div>
            <Label htmlFor="ei">Equipment info</Label>
            <Input id="ei" value={form.equipmentInfo} onChange={(e) => setForm({ ...form, equipmentInfo: e.target.value })} className="h-12" placeholder="Brand / model / serial" />
          </div>

          <div>
            <Label htmlFor="rn">Notes</Label>
            <Textarea id="rn" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What did you observe?" />
          </div>

          <Button onClick={save} className="h-12 w-full bg-amber-500 text-black hover:bg-amber-400">
            <Plus size={18} className="mr-1" /> Save Reading
          </Button>
        </div>

        {/* HISTORY */}
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">Recent Readings</h3>
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No readings logged yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <RefrigerantLogCard key={l.id} log={l} onDelete={() => del(l.id)} />
              ))}
            </ul>
          )}
        </div>

        <FieldNotesPanel section="refrigerant" title="My Refrigerant Notes" />
        <SeansNotesPanel section="refrigerant" />
      </div>
    </div>
  );
}

function RefrigerantLogCard({
  log,
  onDelete,
}: {
  log: import("@/lib/types").RefrigerantLog;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{log.refrigerantType}</p>
          <p className="text-xs text-muted-foreground">{formatDateLabel(new Date(log.createdAt).toISOString().slice(0, 10))}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setOpen(!open)} className="tap-lg flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="tap-lg flex h-8 w-8 items-center justify-center rounded-md text-red-400 hover:bg-red-500/15">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {log.suctionPressure && <span>Suction <span className="font-bold text-foreground">{log.suctionPressure}</span> psig</span>}
        {log.headPressure && <span>Head <span className="font-bold text-foreground">{log.headPressure}</span> psig</span>}
        {log.amountAdded && <span>Added <span className="font-bold text-foreground">{log.amountAdded}</span></span>}
      </div>
      {open && (
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
          {log.suctionTemp && <p>Suction temp: <span className="font-bold">{log.suctionTemp} °F</span></p>}
          {log.liquidTemp && <p>Liquid temp: <span className="font-bold">{log.liquidTemp} °F</span></p>}
          {log.ambientTemp && <p>Ambient: <span className="font-bold">{log.ambientTemp} °F</span></p>}
          {log.equipmentInfo && <p>Equipment: <span className="font-bold">{log.equipmentInfo}</span></p>}
          {log.notes && <p className="whitespace-pre-wrap text-foreground/90">{log.notes}</p>}
        </div>
      )}
    </li>
  );
}
