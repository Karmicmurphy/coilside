"use client";

// PhotoSlot — Field Guide reference pages use this to show a REAL user photo
// if one is attached to the section. If the user has not attached one yet,
// show a curated real-world reference photograph instead of an invented HVAC
// illustration. The old SVG illustration remains only as an offline/error
// fallback if the reference photo cannot load.

import { useMemo, useState } from "react";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import type { EquipmentNote } from "@/lib/types";
import { Camera, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/components/photo-image";

interface PhotoSlotProps {
  section: EquipmentNote["section"];
  /** Legacy SVG fallback — used only if the real reference photo cannot load. */
  fallback?: React.ReactNode;
  /** Title for the slot, e.g. "Capacitor — Outdoor Condenser" */
  title?: string;
}

type ReferencePhoto = {
  src: string;
  alt: string;
  note: string;
  credit: string;
  source: string;
  license: string;
};

/**
 * Curated REAL reference photos. These are deliberately not generated images.
 * User field photos always take priority over these references.
 *
 * Sources are Wikimedia Commons files that permit reuse. Keep the source and
 * license visible so COILSIDE does not silently hotlink random copyrighted art.
 */
const REFERENCE_PHOTOS: Record<EquipmentNote["section"], ReferencePhoto> = {
  capacitor: {
    src: "https://upload.wikimedia.org/wikipedia/commons/2/28/Motor-Start-Capacitor.jpg",
    alt: "Real motor start capacitor",
    note: "Real motor capacitor. Residential HVAC run and dual-run capacitors vary in shape and terminal layout; verify C / FAN / HERM on the actual part.",
    credit: "Elcap / Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:Motor-Start-Capacitor.jpg",
    license: "CC0",
  },
  contactor: {
    src: "https://upload.wikimedia.org/wikipedia/commons/a/aa/ACcontactor.JPG",
    alt: "Real AC contactor with coil and power wiring",
    note: "Real AC contactor. Residential condenser contactors are often smaller, but the coil plus line/load contact structure is the same idea.",
    credit: "david shummer / Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:ACcontactor.JPG",
    license: "Public domain",
  },
  thermostat: {
    src: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Thermostat_Wires_1_2018-05-06.jpg",
    alt: "Real thermostat base with low-voltage wiring terminals",
    note: "Real thermostat wiring. Read terminal letters first; wire colors are conventions, not proof of function.",
    credit: "Fastily / Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:Thermostat_Wires_1_2018-05-06.jpg",
    license: "CC BY-SA 4.0",
  },
  refrigerant: {
    src: "https://upload.wikimedia.org/wikipedia/commons/0/08/332nd_Expeditionary_CE_Squadron_HVAC-R_operations_%289305716%29.jpg",
    alt: "HVAC technician using a refrigerant manifold on real equipment",
    note: "Real HVAC refrigerant service setup. Use the photo for physical orientation only; charging decisions still depend on the actual system and measurements.",
    credit: "U.S. Air Force / Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:332nd_Expeditionary_CE_Squadron_HVAC-R_operations_(9305716).jpg",
    license: "Public domain (U.S. Government)",
  },
  "indoor-coil": {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/84/ACCoils.jpg",
    alt: "Real HVAC evaporator coil tubing and return bends",
    note: "Real evaporator-coil tubing and return bends. Coil shape, case access and metering-device location vary by equipment.",
    credit: "Chinesedrywall / Wikimedia Commons",
    source: "https://commons.wikimedia.org/wiki/File:ACCoils.jpg",
    license: "Public domain",
  },
};

export function PhotoSlot({ section, fallback, title }: PhotoSlotProps) {
  const { go } = useRouter();
  const photos = useCoilsideStore((s) => s.equipmentPhotos);

  // Find the first photo attached to this section (newest first since store
  // stores them with newest at top).
  const attached = useMemo(
    () => photos.find((p) => p.fieldGuideSection === section),
    [photos, section]
  );

  return (
    <section>
      {title && (
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-amber-400">
          {title}
        </h3>
      )}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {attached ? (
          <div className="relative">
            <PhotoImage
              photoId={attached.id}
              dataUrl={attached.dataUrl}
              alt={attached.name}
              className="block h-auto w-full"
            />
            {attached.callouts.length > 0 && (
              <CalloutOverlay callouts={attached.callouts} />
            )}
            <button
              onClick={() => go("photo-detail", { contextId: attached.id })}
              className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur"
            >
              View / Edit
            </button>
          </div>
        ) : (
          <ReferencePhotoView section={section} fallback={fallback} />
        )}
      </div>

      {!attached && (
        <Button
          onClick={() => go("my-photos")}
          variant="outline"
          className="mt-2 h-10 w-full text-xs"
        >
          <Camera size={14} className="mr-1" /> Add my real field photo
        </Button>
      )}
    </section>
  );
}

function ReferencePhotoView({
  section,
  fallback,
}: {
  section: EquipmentNote["section"];
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const reference = REFERENCE_PHOTOS[section];

  if (!reference || failed) {
    return (
      <div>
        {fallback || (
          <div className="flex aspect-video items-center justify-center text-muted-foreground">
            <ImageOff size={32} />
          </div>
        )}
        <div className="border-t border-border bg-background/40 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            Real reference photo unavailable. Add your own equipment photo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <img
        src={reference.src}
        alt={reference.alt}
        className="block max-h-[26rem] w-full object-contain bg-black"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <div className="border-t border-border bg-background/40 p-2.5">
        <p className="text-xs leading-relaxed text-foreground/90">{reference.note}</p>
        <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
          Real reference photo: {reference.credit} · {reference.license} ·{" "}
          <a
            href={reference.source}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            source
          </a>
        </p>
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-amber-400/90">
          Your attached field photo replaces this reference automatically.
        </p>
      </div>
    </div>
  );
}

// Render callout badges over a photo (read-only — editing happens on the
// photo detail page). Position is normalized 0..1.
function CalloutOverlay({
  callouts,
}: {
  callouts: { id: string; label: string; x: number; y: number }[];
}) {
  return (
    <>
      {callouts.map((c) => (
        <div
          key={c.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center rounded-md border border-amber-500 bg-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow">
              {c.label}
            </span>
            <span className="mt-0.5 block h-1.5 w-1.5 rounded-full border border-amber-500 bg-amber-500" />
          </div>
        </div>
      ))}
    </>
  );
}
