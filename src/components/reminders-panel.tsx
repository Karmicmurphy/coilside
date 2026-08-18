"use client";

// Built-in reminders panel — visually distinct from personal field notes.
// Renders as a checklist-style list of cautionary items specific to a section.

import { Check } from "lucide-react";

export function RemindersPanel({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-3">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-amber-400">
        Quick Reminders
      </h2>
      <ul className="space-y-2">
        {items.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
            <Check size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
