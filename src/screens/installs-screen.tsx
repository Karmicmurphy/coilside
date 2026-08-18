"use client";

import { useEffect, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Pencil, Plus, Trash2, X, Camera } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import { BigButton } from "@/components/big-button";
import { EditableChecklist } from "@/components/editable-checklist";
import { makeChecklistItems, DEFAULT_INSTALL_CHECKLIST } from "@/lib/defaults";
import { toast } from "sonner";

const EQUIPMENT_TYPES = [
  "Furnace",
  "Air Handler",
  "Condenser (AC)",
  "Heat Pump",
  "Evaporator Coil",
  "Mini-Split",
  "Other",
];

export function InstallsScreen() {
  const { go } = useRouter();
  const installs = useCoilsideStore((s) => s.installs);
  const addInstall = useCoilsideStore((s) => s.addInstall);
  const delInstall = useCoilsideStore((s) => s.deleteInstall);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    equipmentType: EQUIPMENT_TYPES[0],
    brand: "",
    model: "",
    serial: "",
    notes: "",
    photos: [] as string[],
  });

  function save() {
    if (!form.brand && !form.model && !form.serial) {
      toast.error("Fill in at least brand, model, or serial.");
      return;
    }
    const inst = addInstall(form);
    setForm({
      equipmentType: EQUIPMENT_TYPES[0],
      brand: "",
      model: "",
      serial: "",
      notes: "",
      photos: [],
    });
    setCreating(false);
    go("install-detail", { contextId: inst.id });
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Installs" subtitle={`${installs.length} recorded`} />
      <div className="space-y-4 p-4">
        <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          Simple V1 — keep track of equipment you installed. Not an inventory system.
        </p>

        {!creating && (
          <BigButton
            label="NEW INSTALL"
            description="Record a new piece of equipment"
            icon={<Plus className="h-6 w-6 text-amber-400" />}
            variant="primary"
            onClick={() => setCreating(true)}
          />
        )}

        {creating && (
          <div className="space-y-3 rounded-lg border-2 border-amber-500/40 bg-card p-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">New Install</h3>

            <div>
              <Label htmlFor="et">Equipment type</Label>
              <select
                id="et"
                value={form.equipmentType}
                onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}
                className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="br">Brand</Label>
              <Input id="br" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="mo">Model</Label>
              <Input id="mo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="h-12" />
            </div>
            <div>
              <Label htmlFor="se">Serial</Label>
              <Input id="se" value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} className="h-12" />
            </div>

            <div>
              <Label htmlFor="in">Notes</Label>
              <Textarea id="in" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            {/* Photo placeholders — no real upload in V1 */}
            <div>
              <Label>Photos (placeholder)</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {form.photos.map((p, i) => (
                  <div key={i} className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary text-xs text-muted-foreground">
                    {p}
                  </div>
                ))}
                <button
                  onClick={() => setForm({ ...form, photos: [...form.photos, `Photo ${form.photos.length + 1}`] })}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-amber-500"
                >
                  <Camera size={20} />
                  <span className="text-[10px]">placeholder</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={save} className="h-12 bg-amber-500 text-black hover:bg-amber-400">Save Install</Button>
              <Button variant="ghost" onClick={() => setCreating(false)} className="h-12">
                <X size={16} className="mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">Recorded Installs</h3>
          {installs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No installs recorded yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {installs.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => go("install-detail", { contextId: i.id })}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-amber-500/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{i.equipmentType}{i.brand ? ` · ${i.brand}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.model || "— model"} · {i.serial || "— serial"}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatTimestamp(i.createdAt)}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function InstallDetailScreen() {
  const { back, contextId } = useRouter();
  const installs = useCoilsideStore((s) => s.installs);
  const update = useCoilsideStore((s) => s.updateInstall);
  const del = useCoilsideStore((s) => s.deleteInstall);
  const checklists = useCoilsideStore((s) => s.checklists);
  const createChecklist = useCoilsideStore((s) => s.createChecklist);

  const install = installs.find((i) => i.id === contextId);

  // Get or create install checklist — create via effect, never during render.
  const checklist = install
    ? checklists.find((c) => c.id === install.checklistId)
    : undefined;

  useEffect(() => {
    if (install && !checklist) {
      const fresh = createChecklist(
        "install",
        `Install: ${install.equipmentType}`,
        makeChecklistItems(DEFAULT_INSTALL_CHECKLIST)
      );
      update(install.id, { checklistId: fresh.id });
    }
  }, [install, checklist, createChecklist, update]);

  if (!install) {
    return (
      <div className="min-h-dvh pb-24">
        <AppBar title="Install" />
        <div className="p-4 text-sm text-muted-foreground">Install not found.</div>
      </div>
    );
  }

  if (!checklist) {
    // Checklist will be created by the effect above; render placeholder meanwhile.
    return (
      <div className="min-h-dvh pb-24">
        <AppBar title={install.equipmentType} />
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title={install.equipmentType}
        subtitle={install.brand || undefined}
      />
      <div className="space-y-4 p-4">
        <div className="rounded-lg border border-border bg-card p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Brand</p>
              <p className="font-bold">{install.brand || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Model</p>
              <p className="font-bold">{install.model || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Serial</p>
              <p className="font-bold">{install.serial || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Date</p>
              <p className="font-bold">{formatTimestamp(install.createdAt)}</p>
            </div>
          </div>
          {install.notes && (
            <div className="mt-3">
              <p className="text-xs uppercase text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{install.notes}</p>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">Install Checklist</h3>
          <EditableChecklist checklist={checklist} />
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            if (confirm("Delete this install record?")) {
              del(install.id);
              back();
            }
          }}
          className="h-12 w-full text-red-400"
        >
          <Trash2 size={16} className="mr-1" /> Delete Install
        </Button>
      </div>
    </div>
  );
}
