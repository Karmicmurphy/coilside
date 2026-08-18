"use client";

import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { BigButton } from "@/components/big-button";
import { RealHvacPhotoReference } from "@/components/real-hvac-photo-reference";
import { ChevronRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

const GUIDE_ITEMS = [
  { id: "service-capacitor", label: "Capacitor", description: "C / FAN / HERM, µF test" },
  { id: "service-contactor", label: "Contactor", description: "Line / Load / Coil" },
  { id: "service-thermostat", label: "Thermostat / Low-Voltage", description: "Color conventions & flow" },
  { id: "service-refrigerant", label: "Refrigerant", description: "Pressure / temp log" },
  { id: "service-indoor-coil", label: "Indoor Unit / Evaporator Coil", description: "Air handler reference" },
] as const;

export function FieldGuideScreen() {
  const { go } = useRouter();
  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Field Guide" subtitle="Visual references" />
      <div className="space-y-4 p-4">
        {GUIDE_ITEMS.map((item) => (
          <BigButton
            key={item.id}
            label={item.label}
            description={item.description}
            icon={<ChevronRight className="h-6 w-6 text-amber-400" />}
            onClick={() => go(item.id as never)}
          />
        ))}

        <div className="mt-6 border-t-2 border-border pt-4">
          <RealHvacPhotoReference />
        </div>

        {/* MY EQUIPMENT PHOTOS — separate section */}
        <div className="mt-6 border-t-2 border-border pt-4">
          <h2 className="mb-2 text-base font-extrabold uppercase tracking-wide text-amber-400">
            My Equipment Photos
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Build your own field-reference library from equipment you actually
            encounter. Take a photo, add component callouts, search by brand or
            tag. New photos are automatically stamped with the local save time
            and, when you allow location access, device GPS.
          </p>
          <Button
            onClick={() => go("my-photos")}
            className="h-12 w-full bg-amber-500 text-black hover:bg-amber-400"
          >
            <Camera size={18} className="mr-2" /> MY EQUIPMENT PHOTOS
          </Button>
        </div>
      </div>
    </div>
  );
}
