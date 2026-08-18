"use client";

import { useEffect, useRef } from "react";
import { useCoilsideStore } from "@/lib/store";

/**
 * Best-effort local evidence capture for newly saved equipment photos.
 *
 * EquipmentPhoto.createdAt is already written at save time. This component
 * copies that into capturedAt and, for a photo saved in the last two minutes,
 * asks the browser for the device location. Nothing is sent to a server.
 *
 * Older photos are timestamped from their existing createdAt but are NOT given
 * a current GPS location, because that would falsely imply where they were
 * originally taken.
 */
export function PhotoEvidenceCapture() {
  const photos = useCoilsideStore((s) => s.equipmentPhotos);
  const updatePhoto = useCoilsideStore((s) => s.updateEquipmentPhoto);
  const processing = useRef<string | null>(null);

  useEffect(() => {
    const photo = photos.find((p) => p.capturedAt == null);
    if (!photo || processing.current === photo.id) return;

    processing.current = photo.id;
    updatePhoto(photo.id, { capturedAt: photo.createdAt });

    const ageMs = Date.now() - photo.createdAt;
    const recentEnoughForLocation = ageMs >= 0 && ageMs <= 2 * 60_000;

    if (
      recentEnoughForLocation &&
      typeof navigator !== "undefined" &&
      "geolocation" in navigator
    ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updatePhoto(photo.id, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locationAccuracy: position.coords.accuracy,
          });
          processing.current = null;
        },
        () => {
          // Location permission denied/unavailable: timestamp still remains.
          processing.current = null;
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    } else {
      processing.current = null;
    }
  }, [photos, updatePhoto]);

  return null;
}
