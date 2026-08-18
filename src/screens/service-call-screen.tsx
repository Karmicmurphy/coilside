"use client";

import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { SERVICE_CALL_CATEGORIES } from "@/lib/defaults";
import { BigButton } from "@/components/big-button";
import { ChevronRight } from "lucide-react";

export function ServiceCallScreen() {
  const { go } = useRouter();
  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Service Call" subtitle="Pick the problem you're seeing" />
      <div className="space-y-3 p-4">
        {SERVICE_CALL_CATEGORIES.map((c) => (
          <BigButton
            key={c.id}
            label={c.label}
            description={c.description}
            icon={<ChevronRight className="h-6 w-6 text-amber-400" />}
            onClick={() => go(c.target as never)}
          />
        ))}
      </div>
    </div>
  );
}
