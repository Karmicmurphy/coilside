"use client";

import { useMemo, useRef } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { downloadBackup, parseBackup } from "@/lib/backup";
import { estimatePhotoStorageBytes } from "@/lib/photo-utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download,
  Upload,
  Trash2,
  Info,
  Database,
  ChevronRight,
  Camera,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { REFRIGERANT_TYPES } from "@/lib/defaults";

export function SettingsScreen() {
  // IMPORTANT: use individual primitive selectors only.
  const workCount = useCoilsideStore((s) => s.workEntries.length);
  const notesCount = useCoilsideStore((s) => s.notes.length);
  const checklistsCount = useCoilsideStore((s) => s.checklists.length);
  const refrigerantCount = useCoilsideStore((s) => s.refrigerantLogs.length);
  const installsCount = useCoilsideStore((s) => s.installs.length);
  const equipmentNotesCount = useCoilsideStore((s) => s.equipmentNotes.length);
  const seanNotesCount = useCoilsideStore((s) => s.seanNotes.length);
  const seanQuotesCount = useCoilsideStore((s) => s.seanQuotes.length);
  const photoCount = useCoilsideStore((s) => s.equipmentPhotos.length);

  // Photo data for storage estimate — select raw array (stable reference),
  // then compute the byte estimate via useMemo so we don't return a new
  // array reference from the selector (which would cause an infinite loop).
  const equipmentPhotos = useCoilsideStore((s) => s.equipmentPhotos);

  const defaultRefrigerantType = useCoilsideStore(
    (s) => s.settings.defaultRefrigerantType
  );
  const updateSettings = useCoilsideStore((s) => s.updateSettings);
  const exportState = useCoilsideStore((s) => s.exportState);
  const importState = useCoilsideStore((s) => s.importState);
  const clearAll = useCoilsideStore((s) => s.clearAll);

  // Voice settings via the TTS hook (which exposes individual primitive selectors)
  const tts = useTextToSpeech();
  const smartassEnabled = useCoilsideStore((s) => s.settings.voice.smartassEnabled);
  const updateVoiceSettings = useCoilsideStore((s) => s.updateVoiceSettings);

  const { go } = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const photoBytes = useMemo(
    () => estimatePhotoStorageBytes(equipmentPhotos.map((p) => ({ dataUrl: p.dataUrl }))),
    [equipmentPhotos]
  );
  // Note: photoBytes is the localStorage-side byte estimate. When IndexedDB
  // is available, photo bytes live in IndexedDB (typically 50 MB – 1 GB
  // quota, much larger than localStorage's 5 MB). photoBytes may be 0 in
  // that case — actual photo data usage is shown in the browser's
  // storage settings under "IndexedDB".

  const stats = [
    { label: "Work", n: workCount },
    { label: "Notes", n: notesCount },
    { label: "Checklists", n: checklistsCount },
    { label: "Refrig.", n: refrigerantCount },
    { label: "Installs", n: installsCount },
    { label: "Equip", n: equipmentNotesCount },
    { label: "Sean", n: seanNotesCount },
    { label: "Quotes", n: seanQuotesCount },
    { label: "Photos", n: photoCount },
  ];

  async function handleExport() {
    const state = exportState();

    // Pull photo blobs out of IndexedDB so the backup is self-contained.
    // If IndexedDB is unavailable (older browser) OR a photo's dataUrl was
    // already embedded in the localStorage record (V1.0 → V1.1 import case),
    // use whatever is already on the record.
    let photoCount = state.equipmentPhotos.length;
    let photoBytesLocal = 0;
    if (photoCount > 0) {
      try {
        const { getAllPhotoBlobs, isIndexedDBAvailable } = await import(
          "@/lib/photo-blobs"
        );
        if (isIndexedDBAvailable()) {
          const blobs = await getAllPhotoBlobs();
          // Attach blobs back to records (dataUrl was stripped when saved)
          state.equipmentPhotos = state.equipmentPhotos.map((p) => ({
            ...p,
            dataUrl: p.dataUrl || blobs[p.id],
          }));
        }
        photoBytesLocal = estimatePhotoStorageBytes(
          state.equipmentPhotos.map((p) => ({ dataUrl: p.dataUrl }))
        );
      } catch {
        /* fall back to in-record dataUrl */
      }
    }

    // Clear warning if backup is going to be large.
    if (photoBytesLocal > 2_000_000) {
      const ok = confirm(
        `Your backup will be ~${(photoBytesLocal / 1024 / 1024).toFixed(
          1
        )} MB because it includes ${photoCount} photo(s) ` +
          `as data URLs. This is fine but may take a moment. Continue?`
      );
      if (!ok) return;
    }

    // If IndexedDB isn't available AND photos have no dataUrl, warn that
    // the structured backup won't include photo files.
    const missingPhotos = state.equipmentPhotos.filter((p) => !p.dataUrl);
    if (missingPhotos.length > 0) {
      const ok = confirm(
        `WARNING: ${missingPhotos.length} of ${photoCount} photo(s) could ` +
          `not be included in this backup (IndexedDB unavailable or photos ` +
          `missing). Structured metadata WILL be saved, but photo files ` +
          `will be lost. Continue anyway?`
      );
      if (!ok) return;
    }

    downloadBackup(state);
    toast.success("Backup downloaded.");
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      if (!confirm("Importing will REPLACE all current data. Continue?"))
        return;

      // Photos: write any data URLs from the backup into IndexedDB so the
      // runtime can hydrate them. Strip dataUrl from the persisted record.
      if (parsed.state.equipmentPhotos?.length) {
        try {
          const { savePhotoBlob, isIndexedDBAvailable } = await import(
            "@/lib/photo-blobs"
          );
          if (isIndexedDBAvailable()) {
            for (const p of parsed.state.equipmentPhotos) {
              if (p.dataUrl) {
                const saved = await savePhotoBlob(p.id, p.dataUrl);
                if (saved) p.dataUrl = undefined;
              }
            }
          }
        } catch {
          /* keep dataUrl in record as fallback */
        }
      }

      importState(parsed.state);
      toast.success("Backup imported.");
    } catch (err) {
      toast.error(
        `Import failed: ${
          err instanceof Error ? err.message : "invalid file"
        }`
      );
    }
    e.target.value = "";
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Settings / Backup" />
      <div className="space-y-4 p-4">
        {/* Storage stats */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-amber-400">
            <Database size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Local Storage
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            All data is stored on this device only. No account, no server, no
            cloud sync.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {stats.map((s) => (
              <div key={s.label} className="rounded bg-background/50 p-2">
                <p className="text-lg font-black text-amber-300">{s.n}</p>
                <p className="text-[10px] uppercase text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          {photoCount > 0 && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {photoBytes > 0
                ? `Photos use ~${(photoBytes / 1024 / 1024).toFixed(
                    1
                  )} MB in localStorage`
                : `${photoCount} photo${photoCount === 1 ? "" : "s"} stored in IndexedDB (large quota)`}
            </p>
          )}
        </div>

        {/* Photos link */}
        <button
          onClick={() => go("my-photos")}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-amber-500/40"
        >
          <Camera size={20} className="text-amber-400" />
          <div className="flex-1">
            <p className="font-bold">My Equipment Photos</p>
            <p className="text-xs text-muted-foreground">
              {photoCount} saved · manage / delete
            </p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

        {/* Installs link */}
        <button
          onClick={() => go("installs")}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-amber-500/40"
        >
          <Database size={20} className="text-amber-400" />
          <div className="flex-1">
            <p className="font-bold">Installs</p>
            <p className="text-xs text-muted-foreground">
              Equipment records &amp; install checklists
            </p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

        {/* VOICE section */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-amber-400">
            <Volume2 size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Voice</h3>
          </div>

          {!tts.supported && (
            <p className="mb-2 text-xs text-muted-foreground">
              Text-to-speech isn&apos;t supported in this browser. Speech
              recognition (notes / quotes) may still work in Chrome/Edge.
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">Text-to-speech</p>
                <p className="text-xs text-muted-foreground">
                  🔊 Read reference pages, notes, quotes aloud
                </p>
              </div>
              <button
                onClick={() => tts.setTtsEnabled(!tts.ttsEnabled)}
                disabled={!tts.supported}
                className={
                  "tap-lg min-w-[3.5rem] rounded-md border-2 px-3 py-1.5 text-xs font-bold " +
                  (tts.ttsEnabled && tts.supported
                    ? "border-amber-500 bg-amber-500 text-black"
                    : "border-border bg-secondary text-muted-foreground")
                }
                aria-label="Toggle text-to-speech"
              >
                {tts.ttsEnabled && tts.supported ? "ON" : "OFF"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">Smartass responses</p>
                <p className="text-xs text-muted-foreground">
                  Predefined voice lines after saves / completions
                </p>
              </div>
              <button
                onClick={() =>
                  updateVoiceSettings({ smartassEnabled: !smartassEnabled })
                }
                disabled={!tts.supported || !tts.ttsEnabled}
                className={
                  "tap-lg min-w-[3.5rem] rounded-md border-2 px-3 py-1.5 text-xs font-bold " +
                  (smartassEnabled && tts.ttsEnabled && tts.supported
                    ? "border-amber-500 bg-amber-500 text-black"
                    : "border-border bg-secondary text-muted-foreground")
                }
                aria-label="Toggle smartass responses"
              >
                {smartassEnabled && tts.ttsEnabled && tts.supported
                  ? "ON"
                  : "OFF"}
              </button>
            </div>

            {/* Speech rate */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Speech rate
                </Label>
                <span className="font-mono text-xs text-amber-300">
                  {tts.speechRate.toFixed(2)}×
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    tts.setSpeechRate(Math.max(0.5, tts.speechRate - 0.1))
                  }
                  disabled={!tts.supported || !tts.ttsEnabled}
                  className="tap-lg h-10 w-10 rounded-md border border-border bg-secondary text-base font-bold text-foreground hover:border-amber-500 disabled:opacity-50"
                  aria-label="Slower"
                >
                  −
                </button>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={tts.speechRate}
                  onChange={(e) => tts.setSpeechRate(parseFloat(e.target.value))}
                  disabled={!tts.supported || !tts.ttsEnabled}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-amber-500"
                />
                <button
                  onClick={() =>
                    tts.setSpeechRate(Math.min(2, tts.speechRate + 0.1))
                  }
                  disabled={!tts.supported || !tts.ttsEnabled}
                  className="tap-lg h-10 w-10 rounded-md border border-border bg-secondary text-base font-bold text-foreground hover:border-amber-500 disabled:opacity-50"
                  aria-label="Faster"
                >
                  +
                </button>
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>0.5× slow</span>
                <span>1× normal</span>
                <span>2× fast</span>
              </div>
            </div>

            {/* Device voice picker */}
            {tts.supported && tts.voices.length > 0 && (
              <div>
                <Label
                  htmlFor="voice"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Device voice ({tts.voices.length} available)
                </Label>
                <select
                  id="voice"
                  value={tts.preferredVoiceURI || ""}
                  onChange={(e) =>
                    tts.setPreferredVoiceURI(e.target.value || undefined)
                  }
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Default</option>
                  {tts.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>
        </div>

        {/* Backup */}
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            Backup
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            JSON backup includes hours, notes, checklists, Sean Factor data,
            photo metadata + photo callouts, photo images (as data URLs), and
            voice preferences.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={handleExport}
              className="h-12 bg-amber-500 text-black hover:bg-amber-400"
            >
              <Download size={18} className="mr-2" /> EXPORT BACKUP (JSON)
            </Button>
            <Button
              onClick={handleImportClick}
              variant="secondary"
              className="h-12"
            >
              <Upload size={18} className="mr-2" /> IMPORT BACKUP
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            Preferences
          </h3>
          <div>
            <Label htmlFor="rt">Default refrigerant type</Label>
            <select
              id="rt"
              value={defaultRefrigerantType}
              onChange={(e) =>
                updateSettings({ defaultRefrigerantType: e.target.value })
              }
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              {REFRIGERANT_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border-2 border-red-500/40 bg-red-500/5 p-3">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-red-400">
            Danger Zone
          </h3>
          <Button
            variant="ghost"
            onClick={() => {
              if (
                confirm(
                  "Erase ALL data on this device? This cannot be undone without a backup."
                )
              ) {
                if (
                  confirm(
                    "Are you absolutely sure? Click OK again to confirm."
                  )
                ) {
                  clearAll();
                  toast.success("All data erased.");
                }
              }
            }}
            className="h-12 w-full text-red-400 hover:bg-red-500/15"
          >
            <Trash2 size={18} className="mr-2" /> ERASE ALL DATA
          </Button>
        </div>

        {/* About */}
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 text-amber-400">
            <Info size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              About COILSIDE
            </h3>
          </div>
          <p className="mb-2">
            Personal residential HVAC field companion. Not a CRM. Not a dispatch
            system. Not a substitute for manufacturer specifications or proper
            field procedures.
          </p>
          <p className="text-xs">
            v1.1 · Local + IndexedDB · No account · No paid APIs · Web Speech API
            for voice
          </p>
        </div>
      </div>
    </div>
  );
}
