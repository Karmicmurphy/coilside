"use client";

// Top app bar — title, back button, optional right-slot.

import { ArrowLeft, Home } from "lucide-react";
import { useRouter } from "./screen-router";
import { cn } from "@/lib/utils";

export function AppBar({
  title,
  subtitle,
  showBack = true,
  right,
  showHome = true,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  showHome?: boolean;
}) {
  const { back, home } = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 border-b-2 border-border bg-background/95 backdrop-blur px-3 py-3",
        "[padding-top:max(0.75rem,env(safe-area-inset-top))]"
      )}
    >
      {showBack && (
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="tap-lg flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-secondary active:bg-secondary/70"
        >
          <ArrowLeft size={24} />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-lg font-extrabold tracking-wide heading-industrial">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
      {showHome && (
        <button
          type="button"
          onClick={home}
          aria-label="Home"
          className="tap-lg flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-secondary active:bg-secondary/70"
        >
          <Home size={20} />
        </button>
      )}
    </header>
  );
}
