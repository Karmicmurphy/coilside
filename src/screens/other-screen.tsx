"use client";

import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { BigButton } from "@/components/big-button";
import { ChevronRight } from "lucide-react";

export function OtherScreen() {
  const { go } = useRouter();
  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Other" subtitle="Not in the standard list" />
      <div className="space-y-3 p-4">
        <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          Pick a place to drop a quick note about whatever you&apos;re seeing. You can categorize the note after typing or speaking it.
        </p>
        <BigButton
          label="NEW NOTE"
          description="Type or speech-to-text"
          icon={<ChevronRight className="h-6 w-6 text-amber-400" />}
          variant="primary"
          onClick={() => go("note-new")}
        />
        <BigButton
          label="REFRIGERANT LOG"
          description="Record a reading"
          icon={<ChevronRight className="h-6 w-6 text-amber-400" />}
          onClick={() => go("service-refrigerant")}
        />
      </div>
    </div>
  );
}
