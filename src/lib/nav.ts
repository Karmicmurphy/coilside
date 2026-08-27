// Simple navigation store — screen-based, no URL routing.
// This is a PWA meant to be used like a native app; a back-stack feels more natural than URLs.

"use client";

import { create } from "zustand";

export type Screen =
  | "home"
  | "work"
  | "work-history"
  | "service-call"
  | "service-capacitor"
  | "service-contactor"
  | "service-thermostat"
  | "service-refrigerant"
  | "service-indoor-coil"
  | "service-other"
  | "annual-service"
  | "field-guide"
  | "field-log"
  | "notes"
  | "note-new"
  | "before-i-leave"
  | "installs"
  | "install-detail"
  | "settings"
  | "field-guide-list"
  // V1.1 — Sean Factor
  | "sean-factor"
  | "sean-notes"
  | "sean-note-new"
  | "sean-quotes"
  | "sean-quote-new"
  // V1.1 — Equipment Photos
  | "my-photos"
  | "photo-detail";

interface NavState {
  current: Screen;
  stack: Screen[];
  /** Optional context id — used for install detail etc */
  contextId: string | null;
  go: (screen: Screen, opts?: { contextId?: string; reset?: boolean }) => void;
  back: () => void;
  home: () => void;
}

export const useNav = create<NavState>((set) => ({
  current: "home",
  stack: [],
  contextId: null,
  go: (screen, opts) =>
    set((s) => {
      if (opts?.reset) {
        return { current: screen, stack: [], contextId: opts?.contextId ?? null };
      }
      // Avoid stacking the same screen
      if (s.current === screen) return { contextId: opts?.contextId ?? null };
      return {
        current: screen,
        stack: [...s.stack, s.current],
        contextId: opts?.contextId ?? null,
      };
    }),
  back: () =>
    set((s) => {
      if (s.stack.length === 0) return { current: "home" as Screen };
      const stack = [...s.stack];
      const prev = stack.pop()!;
      return { current: prev, stack };
    }),
  home: () => set({ current: "home", stack: [], contextId: null }),
}));
