"use client";

import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";

export type RealHvacReference = {
  id: string;
  label: string;
  why: string;
  file: string;
  source: string;
  credit: string;
  license: string;
};

/**
 * Five-pass curated reference set:
 * 1) real photographed hardware, not generated art
 * 2) useful to a residential HVAC field tech
 * 3) reusable source/license is shown
 * 4) no claim that every brand/layout looks identical
 * 5) user's own field photos remain the primary truth
 */
export const REAL_HVAC_REFERENCES: RealHvacReference[] = [
  {
    id: "outdoor-condenser",
    label: "Outdoor condenser",
    why: "Residential central-air condenser — use this to orient cabinet, coil and top fan layout.",
    file: "Condenser unit for central air conditioning.JPG",
    source: "https://commons.wikimedia.org/wiki/File:Condenser_unit_for_central_air_conditioning.JPG",
    credit: "H Padleckas / Wikimedia Commons",
    license: "CC BY-SA 3.0",
  },
  {
    id: "air-handler",
    label: "Air handler",
    why: "Real air-handler cabinet reference. Actual coil, blower and access-panel arrangement varies by model.",
    file: "HVAC Air Handler Unit, pic1.JPG",
    source: "https://commons.wikimedia.org/wiki/File:HVAC_Air_Handler_Unit,_pic1.JPG",
    credit: "Alf van Beem / Wikimedia Commons",
    license: "CC0",
  },
  {
    id: "control-circuit",
    label: "Indoor control board / low voltage",
    why: "Household HVAC control section with thermostat wires, board, fan enclosure and filters visible.",
    file: "Control circuit in household HVAC unit.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Control_circuit_in_household_HVAC_unit.jpg",
    credit: "Idahoprogrammer / Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    id: "thermostat-wiring",
    label: "Thermostat wiring",
    why: "Real thermostat base and low-voltage conductors. Read terminal letters first; colors are conventions only.",
    file: "Thermostat Wires 1 2018-05-06.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Thermostat_Wires_1_2018-05-06.jpg",
    credit: "Fastily / Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    id: "contactor",
    label: "Contactor",
    why: "Real AC contactor showing the coil/power-contact idea. Residential condenser contactors are often smaller.",
    file: "ACcontactor.JPG",
    source: "https://commons.wikimedia.org/wiki/File:ACcontactor.JPG",
    credit: "david shummer / Wikimedia Commons",
    license: "Public domain",
  },
  {
    id: "capacitor",
    label: "Motor capacitor",
    why: "Real motor capacitor reference. This is not a promise of the exact dual-run C/FAN/HERM can you will see in every condenser — verify the actual label and terminals.",
    file: "Motor-Start-Capacitor.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Motor-Start-Capacitor.jpg",
    credit: "Elcap / Wikimedia Commons",
    license: "CC0",
  },
  {
    id: "compressor",
    label: "Hermetic A/C compressor",
    why: "Real air-conditioner compressor. Useful for identifying the sealed compressor body inside outdoor equipment.",
    file: "AC compressor.jpg",
    source: "https://commons.wikimedia.org/wiki/File:AC_compressor.jpg",
    credit: "Sarathkumaran Ranganathan / Wikimedia Commons",
    license: "CC BY-SA 4.0",
  },
  {
    id: "blower",
    label: "Furnace blower",
    why: "Real furnace blower assembly / squirrel-cage housing reference.",
    file: "Furnace blower (8509449905).jpg",
    source: "https://commons.wikimedia.org/wiki/File:Furnace_blower_(8509449905).jpg",
    credit: "OKFoundryCompany / Wikimedia Commons",
    license: "CC BY 2.0",
  },
  {
    id: "evaporator-coil",
    label: "Evaporator coil",
    why: "Real HVAC coil tubing and return bends. Coil case and metering-device placement vary by system.",
    file: "ACCoils.jpg",
    source: "https://commons.wikimedia.org/wiki/File:ACCoils.jpg",
    credit: "Chinesedrywall / Wikimedia Commons",
    license: "Public domain",
  },
  {
    id: "filter",
    label: "HVAC air filter",
    why: "Real HVAC filter reference for identifying filter media and frame orientation.",
    file: "HVAC air filter.webp",
    source: "https://commons.wikimedia.org/wiki/File:HVAC_air_filter.webp",
    credit: "Wikideas1 / Wikimedia Commons",
    license: "CC0",
  },
  {
    id: "refrigerant-lines",
    label: "Suction / liquid lines",
    why: "Real outdoor unit showing the larger insulated suction line and smaller liquid line entering the condenser.",
    file: "Aging Condenser Unit of a Split Air Conditioning System (7547606426).jpg",
    source: "https://commons.wikimedia.org/wiki/File:Aging_Condenser_Unit_of_a_Split_Air_Conditioning_System_(7547606426).jpg",
    credit: "Wikimedia Commons",
    license: "Reusable Commons license — see source",
  },
  {
    id: "refrigerant-service",
    label: "Refrigerant service setup",
    why: "Real HVAC-R service scene with manifold hoses on equipment. Physical orientation only — not a charging rule.",
    file: "332nd Expeditionary CE Squadron HVAC-R operations (9305716).jpg",
    source: "https://commons.wikimedia.org/wiki/File:332nd_Expeditionary_CE_Squadron_HVAC-R_operations_(9305716).jpg",
    credit: "U.S. Air Force / Wikimedia Commons",
    license: "Public domain (U.S. Government)",
  },
];

function commonsImage(file: string) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=900`;
}

export function RealHvacPhotoReference() {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-base font-extrabold uppercase tracking-wide text-amber-400">
          Real HVAC Photo Reference
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Real photographed hardware only. These are orientation references, not a claim that every brand is laid out the same. Your own field photo is always the better reference.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {REAL_HVAC_REFERENCES.map((item) => (
          <ReferenceCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ReferenceCard({ item }: { item: RealHvacReference }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-[4/3] bg-black">
        {failed ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff size={28} />
          </div>
        ) : (
          <img
            src={commonsImage(item.file)}
            alt={item.label}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="space-y-1 p-2">
        <h3 className="text-xs font-black text-foreground">{item.label}</h3>
        <p className="text-[10px] leading-snug text-muted-foreground">{item.why}</p>
        <a
          href={item.source}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 underline underline-offset-2"
        >
          {item.credit} · {item.license} <ExternalLink size={9} />
        </a>
      </div>
    </article>
  );
}
