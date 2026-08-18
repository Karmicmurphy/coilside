"use client";

// MY EQUIPMENT PHOTOS — searchable photo library.
//
// Photos are stored in IndexedDB (large quota, ~50 MB–1 GB on mobile Chrome).
// Only metadata (name, brand, model, serial, tags, callouts) lives in the
// Zustand-persisted localStorage record. The display layer auto-hydrates
// image bytes from IndexedDB via <PhotoImage>.

import { useEffect, useMemo, useRef, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { EQUIPMENT_TYPES, EQUIPMENT_TYPE_LABEL, COMPONENT_TAGS, COMPONENT_TAG_LABEL } from "@/lib/defaults";
import type { ComponentTag, EquipmentPhoto, EquipmentType } from "@/lib/types";
import {
  Camera,
  ChevronRight,
  ImagePlus,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoImage } from "@/components/photo-image";
import { cn, formatDateLabel, isoDate } from "@/lib/utils";
import {
  fileToPhotoDataUrl,
  estimatePhotoStorageBytes,
  useFilePicker,
} from "@/lib/photo-utils";

// ----------------------------------------------------------------------------
// LIST VIEW
// ----------------------------------------------------------------------------
export function MyPhotosScreen() {
  const { go } = useRouter();
  const photos = useCoilsideStore((s) => s.equipmentPhotos);
  const addPhoto = useCoilsideStore((s) => s.addEquipmentPhoto);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<EquipmentType | "all">("all");
  const [filterTag, setFilterTag] = useState<ComponentTag | "all">("all");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return photos.filter((p) => {
      if (filterType !== "all" && p.equipmentType !== filterType) return false;
      if (filterTag !== "all" && !p.tags.includes(filterTag)) return false;
      if (q) {
        const hay = [
          p.name,
          p.brand,
          p.model,
          p.serial,
          p.notes,
          EQUIPMENT_TYPE_LABEL[p.equipmentType],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [photos, search, filterType, filterTag]);

  const totalBytes = useMemo(
    () => estimatePhotoStorageBytes(photos),
    [photos]
  );

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="MY EQUIPMENT PHOTOS" subtitle={`${photos.length} saved`} />
      <div className="space-y-3 p-4">
        <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          Build your own field-reference library from equipment you actually
          encounter. Photos stay on this device. Tap a photo to add callouts
          pointing at components.
        </p>

        {/* Storage hint */}
        {photos.length > 0 && (
          <p className="text-center text-[10px] text-muted-foreground">
            {photos.length} photos · ~{(totalBytes / 1024 / 1024).toFixed(1)} MB used locally
          </p>
        )}

        {/* Add button */}
        {!creating && (
          <Button
            onClick={() => setCreating(true)}
            className="h-12 w-full bg-amber-500 text-black hover:bg-amber-400"
          >
            <ImagePlus size={18} className="mr-2" /> ADD PHOTO
          </Button>
        )}

        {creating && (
          <NewPhotoForm
            onSave={async (input) => {
              await addPhoto(input);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, model..."
            className="h-11 pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={filterType === "all"} onClick={() => setFilterType("all")}>
            All types
          </Chip>
          {EQUIPMENT_TYPES.map((t) => (
            <Chip
              key={t.value}
              active={filterType === t.value}
              onClick={() => setFilterType(t.value)}
            >
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={filterTag === "all"} onClick={() => setFilterTag("all")}>
            All tags
          </Chip>
          {COMPONENT_TAGS.map((t) => (
            <Chip
              key={t.value}
              active={filterTag === t.value}
              onClick={() => setFilterTag(t.value)}
            >
              {t.label}
            </Chip>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {photos.length === 0
              ? "No photos yet — add one above."
              : "No photos match your search."}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => go("photo-detail", { contextId: p.id })}
                  className="block w-full overflow-hidden rounded-lg border border-border bg-card text-left hover:border-amber-500/40"
                >
                  <div className="aspect-square w-full overflow-hidden bg-secondary">
                    <PhotoImage
                      photoId={p.id}
                      dataUrl={p.dataUrl}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-bold">{p.name || "(untitled)"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {EQUIPMENT_TYPE_LABEL[p.equipmentType]}
                    </p>
                    {p.callouts.length > 0 && (
                      <p className="text-[10px] text-amber-400">
                        {p.callouts.length} callouts
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// NEW PHOTO FORM
// ----------------------------------------------------------------------------
function NewPhotoForm({
  onSave,
  onCancel,
}: {
  onSave: (input: Omit<EquipmentPhoto, "id" | "createdAt">) => Promise<void> | void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [equipmentType, setEquipmentType] = useState<EquipmentType>("outdoor-condenser");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<ComponentTag[]>([]);
  const [tagPicker, setTagPicker] = useState<ComponentTag>("capacitor");

  // Declare file picker AFTER setDataUrl so the callback closes over a stable reference.
  const { busy, error, handleFile, clearError } = useFilePicker(async (file) => {
    const { dataUrl: newDataUrl } = await fileToPhotoDataUrl(file);
    setDataUrl(newDataUrl);
  });

  function toggleTag(t: ComponentTag) {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function save() {
    if (!dataUrl) return;
    onSave({
      name: name.trim() || "(untitled)",
      date,
      equipmentType,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      serial: serial.trim() || undefined,
      notes: notes.trim() || undefined,
      tags,
      callouts: [],
      dataUrl,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border-2 border-amber-500/40 bg-card p-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
        New Equipment Photo
      </h3>

      {/* Photo source */}
      {!dataUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => cameraRef.current?.click()}
            variant="secondary"
            className="h-12"
            disabled={busy}
          >
            <Camera size={18} className="mr-1" /> {busy ? "Loading…" : "Take Photo"}
          </Button>
          <Button
            onClick={() => fileRef.current?.click()}
            variant="secondary"
            className="h-12"
            disabled={busy}
          >
            <Upload size={18} className="mr-1" /> Upload
          </Button>
          {/* Camera input — captures from camera on mobile */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {/* File input — allows gallery upload */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <img src={dataUrl} alt="new" className="block h-auto w-full" />
          <button
            onClick={() => setDataUrl(null)}
            className="w-full bg-secondary py-1 text-xs text-muted-foreground hover:bg-secondary/80"
          >
            Replace photo
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400" onClick={clearError}>
          {error}
        </p>
      )}

      {dataUrl && (
        <>
          <div>
            <Label htmlFor="pn">Name</Label>
            <Input
              id="pn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Back condenser at Smith house"
              className="h-11"
            />
          </div>
          <div>
            <Label htmlFor="pd">Date</Label>
            <Input
              id="pd"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div>
            <Label htmlFor="pt">Equipment type</Label>
            <select
              id="pt"
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pb">Brand</Label>
              <Input
                id="pb"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="pm">Model</Label>
              <Input
                id="pm"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ps">Serial</Label>
            <Input
              id="ps"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="h-11"
            />
          </div>
          <div>
            <Label htmlFor="pnt">Notes</Label>
            <Textarea
              id="pnt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tag picker */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Component tags</Label>
            <div className="mt-1 flex gap-2">
              <select
                value={tagPicker}
                onChange={(e) => setTagPicker(e.target.value as ComponentTag)}
                className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                {COMPONENT_TAGS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => toggleTag(tagPicker)}
                variant="secondary"
                className="h-10"
                disabled={tags.includes(tagPicker)}
              >
                Add tag
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"
                  >
                    {COMPONENT_TAG_LABEL[t]}
                    <button
                      onClick={() => toggleTag(t)}
                      className="text-amber-300/80 hover:text-amber-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              onClick={save}
              className="h-12 bg-amber-500 text-black hover:bg-amber-400"
            >
              Save Photo
            </Button>
            <Button variant="ghost" onClick={onCancel} className="h-12">
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// PHOTO DETAIL VIEW — shows the photo + its callouts + metadata + editor
// ----------------------------------------------------------------------------
import { PhotoAnnotator } from "@/components/photo-annotator";
import { Pencil, Trash2, Volume2 } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

export function PhotoDetailScreen() {
  const { contextId, back } = useRouter();
  const photos = useCoilsideStore((s) => s.equipmentPhotos);
  const update = useCoilsideStore((s) => s.updateEquipmentPhoto);
  const del = useCoilsideStore((s) => s.deleteEquipmentPhoto);
  const addCallout = useCoilsideStore((s) => s.addPhotoCallout);
  const removeCallout = useCoilsideStore((s) => s.removePhotoCallout);
  const tts = useTextToSpeech();

  const photo = photos.find((p) => p.id === contextId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(photo?.name || "");
  const [editNotes, setEditNotes] = useState(photo?.notes || "");

  // Hydrate the photo's data URL from IndexedDB when not already on the record.
  const [hydratedDataUrl, setHydratedDataUrl] = useState<string | undefined>(
    photo?.dataUrl
  );
  useEffect(() => {
    let cancelled = false;
    if (photo?.dataUrl) {
      setHydratedDataUrl(photo.dataUrl);
      return;
    }
    if (!photo) return;
    (async () => {
      const { getPhotoBlob, isIndexedDBAvailable } = await import(
        "@/lib/photo-blobs"
      );
      if (isIndexedDBAvailable()) {
        const blob = await getPhotoBlob(photo.id);
        if (!cancelled && blob) setHydratedDataUrl(blob);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photo]);

  // Sync local state when the photo changes (e.g. after first mount)
  // (Not using effect — instead reset state on each new photo via key)
  if (!photo) {
    return (
      <div className="min-h-dvh pb-24">
        <AppBar title="Photo" />
        <div className="p-4 text-sm text-muted-foreground">Photo not found.</div>
      </div>
    );
  }

  function speakDescription() {
    if (!photo) return;
    const parts = [
      photo.name,
      EQUIPMENT_TYPE_LABEL[photo.equipmentType],
      photo.brand && `Brand: ${photo.brand}`,
      photo.model && `Model: ${photo.model}`,
      photo.serial && `Serial: ${photo.serial}`,
      photo.notes,
      photo.callouts.length > 0 &&
        `Callouts: ${photo.callouts.map((c) => c.label).join(", ")}`,
    ].filter(Boolean);
    tts.speak(parts.join(". "));
  }

  function saveEdits() {
    update(photo!.id, {
      name: editName.trim() || "(untitled)",
      notes: editNotes.trim() || undefined,
    });
    setEditing(false);
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title={photo.name || "(untitled)"}
        subtitle={EQUIPMENT_TYPE_LABEL[photo.equipmentType]}
      />
      <div className="space-y-3 p-4">
        {/* The photo with callouts */}
        {hydratedDataUrl ? (
          <PhotoAnnotator
            src={hydratedDataUrl}
            alt={photo.name}
            callouts={photo.callouts}
            editable
            tagChoices={COMPONENT_TAGS.map((t) => t.value)}
            onAddCallout={(c) => addCallout(photo.id, c)}
            onRemoveCallout={(cid) => removeCallout(photo.id, cid)}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
            Loading photo…
          </div>
        )}

        {/* Toolbar */}
        <div className="flex gap-2">
          {tts.supported && tts.ttsEnabled && (
            <Button
              onClick={speakDescription}
              variant="secondary"
              className="h-11 flex-1"
            >
              <Volume2 size={16} className="mr-1" /> 🔊 Read photo
            </Button>
          )}
          <Button
            onClick={() => {
              setEditName(photo.name);
              setEditNotes(photo.notes || "");
              setEditing(!editing);
            }}
            variant="secondary"
            className="h-11"
          >
            <Pencil size={16} />
          </Button>
          <Button
            onClick={() => {
              if (confirm("Delete this photo?")) {
                del(photo.id);
                back();
              }
            }}
            variant="ghost"
            className="h-11 text-red-400"
          >
            <Trash2 size={16} />
          </Button>
        </div>

        {/* Metadata */}
        {editing ? (
          <div className="space-y-2 rounded-lg border-2 border-amber-500/40 bg-card p-3">
            <div>
              <Label htmlFor="en">Name</Label>
              <Input
                id="en"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="eo">Notes</Label>
              <Textarea
                id="eo"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={saveEdits}
              className="h-11 w-full bg-amber-500 text-black hover:bg-amber-400"
            >
              Save
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Type</dt>
                <dd className="font-bold">{EQUIPMENT_TYPE_LABEL[photo.equipmentType]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Date</dt>
                <dd className="font-bold">{formatDateLabel(photo.date)}</dd>
              </div>
              {photo.brand && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Brand</dt>
                  <dd className="font-bold">{photo.brand}</dd>
                </div>
              )}
              {photo.model && (
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Model</dt>
                  <dd className="font-bold">{photo.model}</dd>
                </div>
              )}
              {photo.serial && (
                <div className="col-span-2">
                  <dt className="text-xs uppercase text-muted-foreground">Serial</dt>
                  <dd className="font-bold">{photo.serial}</dd>
                </div>
              )}
            </dl>
            {photo.notes && (
              <p className="mt-3 whitespace-pre-wrap border-t border-border pt-2 text-foreground/90">
                {photo.notes}
              </p>
            )}
            {photo.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {photo.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
                  >
                    {COMPONENT_TAG_LABEL[t]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold",
        active ? "bg-amber-500 text-black" : "bg-secondary text-foreground/80"
      )}
    >
      {children}
    </button>
  );
}
