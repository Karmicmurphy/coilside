"use client";

import { useEffect } from "react";
import { startAutomaticCloudSync } from "@/lib/cloud-sync";

export function CloudSyncBootstrap() {
  useEffect(() => startAutomaticCloudSync(), []);
  return null;
}
