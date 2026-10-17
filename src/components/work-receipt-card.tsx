"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/components/photo-image";
import { useCoilsideStore } from "@/lib/store";
import { fileToPhotoDataUrl } from "@/lib/photo-utils";
import { buildDailyWorkReceiptPng, shareWorkReceipt } from "@/lib/work-receipt-image";
import { workDayTotal, workDayPhotos } from "@/lib/work-hours";
import type { Employer, WorkEntry, WorkPhotoStage, PhotoSource } from "@/lib/types";

const EMPLOYER_NAME: Record<Employer, string> = {
  tim: "Tim Johnson",
  sean: "Sean / Farmhouse",
  jesse: "Jesse Johnson",
};

export function WorkReceiptCard({ employer, date, entries }: { employer: Employer; date: string; entries: WorkEntry[] }) {
  const allPhotos = useCoilsideStore((s) => s.equipmentPhotos);
  const addPhoto = useCoilsideStore((s) => s.addEquipmentPhoto);
  const photos = workDayPhotos(allPhotos, employer, date);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<WorkPhotoStage>("progress");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");

  async function onPhoto(file: File | undefined, source: PhotoSource) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Choose a photo file.");
    if (file.size > 15 * 1024 * 1024) return setMessage("Photo is too big (15 MB maximum).");
    if (photos.length >= 12) return setMessage("Limit is 12 photos per employer per day.");
    setBusy(true);
    setMessage("");
    try {
      const { dataUrl } = await fileToPhotoDataUrl(file);
      await addPhoto({
        workEmployer: employer,
        workDate: date,
        workStage: stage,
        name: `${EMPLOYER_NAME[employer]} · ${date} · ${stage}`,
        date,
        equipmentType: "other",
        tags: [],
        callouts: [],
        source,
        capturedAt: Date.now(), // Time added to this workflow; not gallery EXIF capture time
        dataUrl,
      });
      setMessage("Photo added to this day's receipt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!entries.length || sharing) return;
    setSharing(true);
    setMessage("");
    try {
      const blob = await buildDailyWorkReceiptPng({
        employerName: EMPLOYER_NAME[employer],
        date,
        entries,
        photos,
      });
      const delivery = await shareWorkReceipt(blob, `coilside-${employer}-${date}-work-receipt.png`, `${EMPLOYER_NAME[employer]} work receipt ${date}`);
      setMessage(delivery === "shared" ? "Receipt shared." : "Receipt downloaded. Send it to your employer.");
    } catch (error) {
      // Cancelling an Android share sheet is not a failed receipt.
      if (error instanceof Error && error.name === "AbortError") setMessage("Sharing cancelled.");
      else setMessage(error instanceof Error ? error.message : "Could not share receipt.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="rounded-xl border border-sky-500/30 bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">Work Receipt · {date}</h3>
          <p className="text-xs text-muted-foreground">{entries.length} work period{entries.length === 1 ? "" : "s"} · {workDayTotal(entries, employer, date).toFixed(2)}h · {photos.length} photo{photos.length === 1 ? "" : "s"}</p>
        </div>
        <Button size="sm" disabled={sharing} onClick={onShare}>
          <Share2 size={15} className="mr-1" />{sharing ? "Making…" : "Share"}
        </Button>
      </div>
      {entries.map((entry) => (
        <div key={entry.id} className="mb-2 rounded-md bg-background/50 px-3 py-2 text-xs">
          <span className="font-semibold">{entry.totalHours.toFixed(2)}h</span>
          {(entry.extraMinutes || 0) > 0 && <span> · +{entry.extraMinutes}m documented extra work</span>}
          {entry.workSite && <span> · {entry.workSite}</span>}
          {entry.note && <p className="mt-1 text-muted-foreground">{entry.note}</p>}
        </div>
      ))}
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-md border border-border">
              <div className="aspect-square"><PhotoImage photoId={photo.id} dataUrl={photo.dataUrl} alt={photo.name} className="h-full w-full object-cover" showEvidenceStamp={false}/></div>
              <p className="p-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">{photo.workStage || "progress"}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <label htmlFor={`stage-${employer}-${date}`} className="text-xs font-semibold">Photo type</label>
        <select
          id={`stage-${employer}-${date}`}
          value={stage}
          onChange={(event) => setStage(event.target.value as WorkPhotoStage)}
          className="h-10 flex-1 rounded-md border border-border bg-background px-2 text-sm"
          aria-label="Work photo type"
        >
          <option value="before">Before</option>
          <option value="progress">During</option>
          <option value="after">After</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={busy || photos.length >= 12} variant="secondary" className="h-11" onClick={() => camera.current?.click()}><Camera size={16} className="mr-1" /> Take photo</Button>
        <Button disabled={busy || photos.length >= 12} variant="secondary" className="h-11" onClick={() => gallery.current?.click()}><ImagePlus size={16} className="mr-1" /> Add existing</Button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void onPhoto(file, "camera"); }} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void onPhoto(file, "upload"); }} />
      {message && <p role="status" className="mt-2 text-xs text-amber-300">{message}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Photos are optional. This phone saves them with the day and employer; use Share to send the receipt.
        Adding photos does not automatically give Tim, Sean, or Jesse access to your phone.
      </p>
    </section>
  );
}
