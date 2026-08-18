// COILSIDE — Zustand store with localStorage persistence.
// Designed so cloud sync can be added later by replacing the persistence layer.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_ANNUAL_SERVICE_ITEMS,
  DEFAULT_BEFORE_I_LEAVE_ITEMS,
  seanCategoryToFieldGuideSection,
} from "./defaults";
import type {
  Checklist,
  ChecklistItem,
  CoilsideState,
  Employer,
  EquipmentNote,
  EquipmentPhoto,
  InstallRecord,
  Note,
  NoteCategory,
  PhotoCallout,
  RefrigerantLog,
  SeanCategory,
  SeanFactorNote,
  SeanQuote,
  SeanQuoteRating,
  VoiceSettings,
  WorkEntry,
} from "./types";
import { isoDate, uid, weekKey } from "./utils";

interface StoreActions {
  // Work timer / entries
  startTimer: (employer: Employer) => void;
  stopTimer: (opts: { breakMinutes: number; note: string }) => WorkEntry | null;
  cancelTimer: () => void;
  updateWorkEntry: (id: string, patch: Partial<WorkEntry>) => void;
  deleteWorkEntry: (id: string) => void;

  // Notes
  addNote: (input: { category: NoteCategory; text: string; seanTaught?: boolean }) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Checklists
  createChecklist: (kind: Checklist["kind"], title: string, items: ChecklistItem[]) => Checklist;
  toggleChecklistItem: (checklistId: string, itemId: string) => void;
  addChecklistItem: (checklistId: string, label: string) => void;
  removeChecklistItem: (checklistId: string, itemId: string) => void;
  updateChecklistItem: (checklistId: string, itemId: string, patch: Partial<ChecklistItem>) => void;
  reorderChecklistItem: (checklistId: string, fromIdx: number, toIdx: number) => void;
  resetChecklist: (checklistId: string) => void;
  deleteChecklist: (checklistId: string) => void;

  // Refrigerant logs
  addRefrigerantLog: (input: Omit<RefrigerantLog, "id" | "createdAt">) => RefrigerantLog;
  updateRefrigerantLog: (id: string, patch: Partial<RefrigerantLog>) => void;
  deleteRefrigerantLog: (id: string) => void;

  // Installs
  addInstall: (input: Omit<InstallRecord, "id" | "createdAt">) => InstallRecord;
  updateInstall: (id: string, patch: Partial<InstallRecord>) => void;
  deleteInstall: (id: string) => void;

  // Equipment notes (per-section field notes)
  addEquipmentNote: (input: { section: EquipmentNote["section"]; title: string; body: string }) => EquipmentNote;
  updateEquipmentNote: (id: string, patch: Partial<EquipmentNote>) => void;
  deleteEquipmentNote: (id: string) => void;

  // Settings / data
  updateSettings: (patch: Partial<CoilsideState["settings"]>) => void;
  updateVoiceSettings: (patch: Partial<VoiceSettings>) => void;
  exportState: () => CoilsideState;
  importState: (state: CoilsideState) => void;
  clearAll: () => void;

  // ---------- V1.1: Sean Factor ----------
  // Sean learning notes
  addSeanNote: (input: { category: SeanCategory; text: string }) => SeanFactorNote;
  updateSeanNote: (id: string, patch: Partial<SeanFactorNote>) => void;
  deleteSeanNote: (id: string) => void;

  // Sean quotes
  addSeanQuote: (input: { text: string; context?: string; rating?: SeanQuoteRating }) => SeanQuote;
  updateSeanQuote: (id: string, patch: Partial<SeanQuote>) => void;
  deleteSeanQuote: (id: string) => void;

  // Shit-talk counter
  incrementShitTalk: () => void;
  decrementShitTalk: () => void;
  resetTodayShitTalk: () => void;

  // ---------- V1.1: Equipment Photos ----------
  // NOTE: addEquipmentPhoto is async because it writes the photo blob to
  // IndexedDB before returning the metadata record that gets persisted
  // in localStorage.
  addEquipmentPhoto: (input: Omit<EquipmentPhoto, "id" | "createdAt">) => Promise<EquipmentPhoto>;
  updateEquipmentPhoto: (id: string, patch: Partial<EquipmentPhoto>) => void;
  deleteEquipmentPhoto: (id: string) => void;
  addPhotoCallout: (photoId: string, callout: Omit<PhotoCallout, "id">) => void;
  updatePhotoCallout: (photoId: string, calloutId: string, patch: Partial<PhotoCallout>) => void;
  removePhotoCallout: (photoId: string, calloutId: string) => void;
}

type Store = CoilsideState & StoreActions;

function computeTotalHours(startAt: number, stopAt: number, breakMinutes: number): number {
  const netMs = Math.max(0, stopAt - startAt - breakMinutes * 60_000);
  return netMs / 3_600_000;
}

function getOrCreateChecklistsFor(state: CoilsideState, kind: Checklist["kind"]): Checklist[] {
  return state.checklists.filter((c) => c.kind === kind);
}

export const useCoilsideStore = create<Store>()(
  persist(
    (set, get) => ({
      version: 2,
      workEntries: [],
      notes: [],
      checklists: [],
      refrigerantLogs: [],
      installs: [],
      equipmentNotes: [],
      activeTimer: null,

      // V1.1 additions
      seanNotes: [],
      seanQuotes: [],
      shitTalkDays: [],
      equipmentPhotos: [],

      settings: {
        defaultRefrigerantType: "R-410A",
        showSeanTaughtShortcut: true,
        voice: {
          ttsEnabled: true,
          smartassEnabled: true,
          speechRate: 1,
        },
      },

      // ---------- Work Timer ----------
      startTimer: (employer) => {
        // Refuse if already running
        if (get().activeTimer) return;
        set({ activeTimer: { employer, startedAt: Date.now() } });
      },
      stopTimer: ({ breakMinutes, note }) => {
        const state = get();
        if (!state.activeTimer) return null;
        const stopAt = Date.now();
        const entry: WorkEntry = {
          id: uid(),
          employer: state.activeTimer.employer,
          date: isoDate(state.activeTimer.startedAt),
          startAt: state.activeTimer.startedAt,
          stopAt,
          breakMinutes: Math.max(0, breakMinutes),
          totalHours: computeTotalHours(state.activeTimer.startedAt, stopAt, Math.max(0, breakMinutes)),
          note,
        };
        set({
          workEntries: [entry, ...state.workEntries],
          activeTimer: null,
        });
        return entry;
      },
      cancelTimer: () => set({ activeTimer: null }),
      updateWorkEntry: (id, patch) =>
        set((s) => ({
          workEntries: s.workEntries.map((w) =>
            w.id === id ? { ...w, ...patch, totalHours: computeTotalHours(w.startAt, w.stopAt, patch.breakMinutes ?? w.breakMinutes) } : w
          ),
        })),
      deleteWorkEntry: (id) =>
        set((s) => ({ workEntries: s.workEntries.filter((w) => w.id !== id) })),

      // ---------- Notes ----------
      addNote: ({ category, text, seanTaught }) => {
        const now = Date.now();
        const note: Note = {
          id: uid(),
          createdAt: now,
          updatedAt: now,
          category,
          text,
          seanTaught: seanTaught ? true : undefined,
        };
        set((s) => ({ notes: [note, ...s.notes] }));
        return note;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
        })),
      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      // ---------- Checklists ----------
      createChecklist: (kind, title, items) => {
        const checklist: Checklist = {
          id: uid(),
          kind,
          title,
          items,
          createdAt: Date.now(),
        };
        set((s) => ({ checklists: [checklist, ...s.checklists] }));
        return checklist;
      },
      toggleChecklistItem: (checklistId, itemId) =>
        set((s) => ({
          checklists: s.checklists.map((c) =>
            c.id === checklistId
              ? {
                  ...c,
                  items: c.items.map((it) =>
                    it.id === itemId ? { ...it, done: !it.done } : it
                  ),
                }
              : c
          ),
        })),
      addChecklistItem: (checklistId, label) =>
        set((s) => ({
          checklists: s.checklists.map((c) =>
            c.id === checklistId
              ? { ...c, items: [...c.items, { id: uid(), label, done: false }] }
              : c
          ),
        })),
      removeChecklistItem: (checklistId, itemId) =>
        set((s) => ({
          checklists: s.checklists.map((c) =>
            c.id === checklistId
              ? { ...c, items: c.items.filter((it) => it.id !== itemId) }
              : c
          ),
        })),
      updateChecklistItem: (checklistId, itemId, patch) =>
        set((s) => ({
          checklists: s.checklists.map((c) =>
            c.id === checklistId
              ? { ...c, items: c.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
              : c
          ),
        })),
      reorderChecklistItem: (checklistId, fromIdx, toIdx) =>
        set((s) => ({
          checklists: s.checklists.map((c) => {
            if (c.id !== checklistId) return c;
            const items = [...c.items];
            if (fromIdx < 0 || fromIdx >= items.length || toIdx < 0 || toIdx >= items.length) return c;
            const [moved] = items.splice(fromIdx, 1);
            items.splice(toIdx, 0, moved);
            return { ...c, items };
          }),
        })),
      resetChecklist: (checklistId) =>
        set((s) => ({
          checklists: s.checklists.map((c) =>
            c.id === checklistId ? { ...c, items: c.items.map((it) => ({ ...it, done: false })) } : c
          ),
        })),
      deleteChecklist: (checklistId) =>
        set((s) => ({ checklists: s.checklists.filter((c) => c.id !== checklistId) })),

      // ---------- Refrigerant Logs ----------
      addRefrigerantLog: (input) => {
        const log: RefrigerantLog = { id: uid(), createdAt: Date.now(), ...input };
        set((s) => ({ refrigerantLogs: [log, ...s.refrigerantLogs] }));
        return log;
      },
      updateRefrigerantLog: (id, patch) =>
        set((s) => ({
          refrigerantLogs: s.refrigerantLogs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRefrigerantLog: (id) =>
        set((s) => ({ refrigerantLogs: s.refrigerantLogs.filter((r) => r.id !== id) })),

      // ---------- Installs ----------
      addInstall: (input) => {
        const install: InstallRecord = { id: uid(), createdAt: Date.now(), ...input };
        set((s) => ({ installs: [install, ...s.installs] }));
        return install;
      },
      updateInstall: (id, patch) =>
        set((s) => ({
          installs: s.installs.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      deleteInstall: (id) =>
        set((s) => ({ installs: s.installs.filter((i) => i.id !== id) })),

      // ---------- Equipment Notes ----------
      addEquipmentNote: ({ section, title, body }) => {
        const note: EquipmentNote = {
          id: uid(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          section,
          title,
          body,
        };
        set((s) => ({ equipmentNotes: [note, ...s.equipmentNotes] }));
        return note;
      },
      updateEquipmentNote: (id, patch) =>
        set((s) => ({
          equipmentNotes: s.equipmentNotes.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
          ),
        })),
      deleteEquipmentNote: (id) =>
        set((s) => ({ equipmentNotes: s.equipmentNotes.filter((e) => e.id !== id) })),

      // ---------- Settings / Data ----------
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateVoiceSettings: (patch) =>
        set((s) => ({
          settings: { ...s.settings, voice: { ...s.settings.voice, ...patch } },
        })),
      exportState: () => {
        const s = get();
        return {
          version: s.version,
          workEntries: s.workEntries,
          notes: s.notes,
          checklists: s.checklists,
          refrigerantLogs: s.refrigerantLogs,
          installs: s.installs,
          equipmentNotes: s.equipmentNotes,
          activeTimer: s.activeTimer,
          // V1.1
          seanNotes: s.seanNotes,
          seanQuotes: s.seanQuotes,
          shitTalkDays: s.shitTalkDays,
          equipmentPhotos: s.equipmentPhotos,
          settings: s.settings,
        };
      },
      importState: (state) => set({ ...state }),
      clearAll: () => {
        // Wipe IndexedDB photos too (best-effort, fire-and-forget).
        void (async () => {
          const { clearAllPhotoBlobs, isIndexedDBAvailable } = await import(
            "./photo-blobs"
          );
          if (isIndexedDBAvailable()) {
            await clearAllPhotoBlobs();
          }
        })();
        set({
          workEntries: [],
          notes: [],
          checklists: [],
          refrigerantLogs: [],
          installs: [],
          equipmentNotes: [],
          activeTimer: null,
          // V1.1
          seanNotes: [],
          seanQuotes: [],
          shitTalkDays: [],
          equipmentPhotos: [],
        });
      },

      // ---------- V1.1: Sean Factor ----------
      addSeanNote: ({ category, text }) => {
        const now = Date.now();
        const note: SeanFactorNote = {
          id: uid(),
          createdAt: now,
          updatedAt: now,
          category,
          text,
          fieldGuideSection: seanCategoryToFieldGuideSection(category),
        };
        set((s) => ({ seanNotes: [note, ...s.seanNotes] }));
        return note;
      },
      updateSeanNote: (id, patch) =>
        set((s) => ({
          seanNotes: s.seanNotes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  ...patch,
                  updatedAt: Date.now(),
                  // Recompute fieldGuideSection if category changed
                  fieldGuideSection:
                    patch.category
                      ? seanCategoryToFieldGuideSection(patch.category)
                      : n.fieldGuideSection,
                }
              : n
          ),
        })),
      deleteSeanNote: (id) =>
        set((s) => ({ seanNotes: s.seanNotes.filter((n) => n.id !== id) })),

      addSeanQuote: ({ text, context, rating }) => {
        const quote: SeanQuote = {
          id: uid(),
          createdAt: Date.now(),
          text,
          context,
          rating,
        };
        set((s) => ({ seanQuotes: [quote, ...s.seanQuotes] }));
        return quote;
      },
      updateSeanQuote: (id, patch) =>
        set((s) => ({
          seanQuotes: s.seanQuotes.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        })),
      deleteSeanQuote: (id) =>
        set((s) => ({ seanQuotes: s.seanQuotes.filter((q) => q.id !== id) })),

      // Shit-talk counter — bumps today's count, creating a new day record if needed.
      incrementShitTalk: () =>
        set((s) => {
          const today = isoDate(new Date());
          const existing = s.shitTalkDays.find((d) => d.date === today);
          if (existing) {
            return {
              shitTalkDays: s.shitTalkDays.map((d) =>
                d.date === today ? { ...d, count: d.count + 1 } : d
              ),
            };
          }
          return { shitTalkDays: [{ date: today, count: 1 }, ...s.shitTalkDays] };
        }),
      decrementShitTalk: () =>
        set((s) => {
          const today = isoDate(new Date());
          const existing = s.shitTalkDays.find((d) => d.date === today);
          if (!existing) return {};
          const newCount = Math.max(0, existing.count - 1);
          return {
            shitTalkDays: s.shitTalkDays.map((d) =>
              d.date === today ? { ...d, count: newCount } : d
            ),
          };
        }),
      resetTodayShitTalk: () =>
        set((s) => {
          const today = isoDate(new Date());
          return {
            shitTalkDays: s.shitTalkDays.map((d) =>
              d.date === today ? { ...d, count: 0 } : d
            ),
          };
        }),

      // ---------- V1.1: Equipment Photos ----------
      addEquipmentPhoto: async (input) => {
        const id = uid();
        const createdAt = Date.now();
        const { dataUrl, ...metadata } = input;
        const photo: EquipmentPhoto = {
          id,
          createdAt,
          dataUrl,
          ...metadata,
        };
        // Persist the photo blob to IndexedDB if available — keeps it out
        // of the (much smaller) localStorage quota.
        if (dataUrl) {
          const { savePhotoBlob, isIndexedDBAvailable } = await import(
            "./photo-blobs"
          );
          if (isIndexedDBAvailable()) {
            const saved = await savePhotoBlob(id, dataUrl);
            if (saved) {
              // Strip dataUrl from the localStorage record — the runtime
              // hydrates it back from IndexedDB when needed.
              photo.dataUrl = undefined;
            }
          }
        }
        set((s) => ({ equipmentPhotos: [photo, ...s.equipmentPhotos] }));
        return photo;
      },
      updateEquipmentPhoto: (id, patch) =>
        set((s) => ({
          equipmentPhotos: s.equipmentPhotos.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
      deleteEquipmentPhoto: (id) => {
        // Best-effort delete from IndexedDB (fire-and-forget).
        void (async () => {
          const { deletePhotoBlob, isIndexedDBAvailable } = await import(
            "./photo-blobs"
          );
          if (isIndexedDBAvailable()) {
            await deletePhotoBlob(id);
          }
        })();
        set((s) => ({
          equipmentPhotos: s.equipmentPhotos.filter((p) => p.id !== id),
        }));
      },
      addPhotoCallout: (photoId, callout) =>
        set((s) => ({
          equipmentPhotos: s.equipmentPhotos.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  callouts: [
                    ...p.callouts,
                    { ...callout, id: uid() },
                  ],
                }
              : p
          ),
        })),
      updatePhotoCallout: (photoId, calloutId, patch) =>
        set((s) => ({
          equipmentPhotos: s.equipmentPhotos.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  callouts: p.callouts.map((c) =>
                    c.id === calloutId ? { ...c, ...patch } : c
                  ),
                }
              : p
          ),
        })),
      removePhotoCallout: (photoId, calloutId) =>
        set((s) => ({
          equipmentPhotos: s.equipmentPhotos.map((p) =>
            p.id === photoId
              ? { ...p, callouts: p.callouts.filter((c) => c.id !== calloutId) }
              : p
          ),
        })),
    }),
    {
      name: "coilside:v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Migrate from V1 → V1.1 (adds new empty collections + voice settings)
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted || {}) as Partial<CoilsideState>;
        const next: Partial<CoilsideState> = {
          ...s,
          version: 2,
          seanNotes: s.seanNotes ?? [],
          seanQuotes: s.seanQuotes ?? [],
          shitTalkDays: s.shitTalkDays ?? [],
          equipmentPhotos: s.equipmentPhotos ?? [],
          settings: {
            defaultRefrigerantType:
              s.settings?.defaultRefrigerantType ?? "R-410A",
            showSeanTaughtShortcut:
              s.settings?.showSeanTaughtShortcut ?? true,
            voice: {
              ttsEnabled: s.settings?.voice?.ttsEnabled ?? true,
              smartassEnabled: s.settings?.voice?.smartassEnabled ?? true,
              speechRate: s.settings?.voice?.speechRate ?? 1,
              preferredVoiceURI: s.settings?.voice?.preferredVoiceURI,
            },
          },
        };
        return next;
      },
      // Merge persisted state with current state — ensures new fields default properly
      // even when migrate didn't run (fresh install).
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<CoilsideState>;
        return {
          ...current,
          ...p,
          settings: {
            ...(current as CoilsideState).settings,
            ...(p.settings ?? {}),
            voice: {
              ...((current as CoilsideState).settings.voice ?? {
                ttsEnabled: true,
                smartassEnabled: true,
                speechRate: 1,
              }),
              ...(p.settings?.voice ?? {}),
            },
        },
        };
      },
    }
  )
);

// ---------- Selectors / helpers ----------

/** Get or create a checklist of a given kind. For "before-i-leave" and "annual-service"
 * we want one persistent active checklist per kind so checks persist across sessions. */
export function useOrInitChecklist(
  kind: Checklist["kind"],
  defaults: Omit<ChecklistItem, "id">[],
  title: string
): Checklist {
  const checklists = useCoilsideStore((s) => s.checklists);
  const create = useCoilsideStore((s) => s.createChecklist);

  const existing = checklists.find((c) => c.kind === kind);
  if (existing) return existing;

  // create one on first access — call outside render to be safe
  const newItems = defaults.map((d) => ({ ...d, id: uid() }));
  return create(kind, title, newItems);
}

/** Helper to compute weekly totals per employer. */
export function weeklyTotalsFor(
  entries: WorkEntry[],
  employer: Employer,
  weekKeyVal: string = weekKey(new Date())
): { hours: number; count: number } {
  const filtered = entries.filter(
    (e) => e.employer === employer && weekKey(new Date(e.startAt)) === weekKeyVal
  );
  const hours = filtered.reduce((acc, e) => acc + e.totalHours, 0);
  return { hours, count: filtered.length };
}

export { DEFAULT_ANNUAL_SERVICE_ITEMS, DEFAULT_BEFORE_I_LEAVE_ITEMS };
