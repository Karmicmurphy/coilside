// COILSIDE — TypeScript data types
// All persisted in localStorage via the Zustand store (src/lib/store.ts)
//
// V1.1 additions:
//   - SeanFactorNote      (Sean's teaching notes — separate from general notes)
//   - SeanQuote           (Sean Said Some Shit quote archive)
//   - ShitTalkDay         (historical per-day shit-talk counts)
//   - EquipmentPhoto      (My Equipment Photos library + callouts)
//   - VoiceSettings       (TTS + smartass responses)
//   - PhotoCallout        (arrow + label on a photo)
//   - expanded CoilsideState.settings (voice prefs)
//
// V1.2 additions:
//   - photo evidence metadata (capture timestamp, source, optional device GPS)
//
// Migration: existing persisted state is forward-compatible. Missing newer
// fields fall back to safe defaults via the store's `merge` option.

export type Employer = "tim" | "sean";

export interface WorkEntry {
  id: string;
  employer: Employer;
  date: string;          // ISO date (YYYY-MM-DD)
  startAt: number;      // epoch ms
  stopAt: number;       // epoch ms
  breakMinutes: number;  // deducted break time
  totalHours: number;   // computed (stopAt - startAt - break) in hours
  note: string;
}

// ----- Notes (general field notes; original V1 type kept intact) -----

export type NoteCategory =
  | "service-call"
  | "refrigerant"
  | "capacitor"
  | "contactor"
  | "thermostat-wiring"
  | "indoor-coil"
  | "install"
  | "general-reminder";

export interface Note {
  id: string;
  createdAt: number;
  updatedAt: number;
  category: NoteCategory;
  text: string;
  /** Marks this note as originating from a "Sean taught me" session */
  seanTaught?: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  /** whether the box is checked for the current session */
  done: boolean;
}

export type ChecklistKind = "annual-service" | "before-i-leave" | "install";

export interface Checklist {
  id: string;
  kind: ChecklistKind;
  title: string;
  items: ChecklistItem[];
  createdAt: number;
  installId?: string;
}

export interface RefrigerantLog {
  id: string;
  createdAt: number;
  refrigerantType: string;
  suctionPressure?: string;
  headPressure?: string;
  suctionTemp?: string;
  liquidTemp?: string;
  ambientTemp?: string;
  amountAdded?: string;
  equipmentInfo?: string;
  notes?: string;
}

export interface InstallRecord {
  id: string;
  createdAt: number;
  equipmentType: string;
  brand: string;
  model: string;
  serial: string;
  notes: string;
  /** photo placeholders — V1 left these as string refs. V1.1 may upgrade this
   *  to use the new EquipmentPhoto records, but V1 records are still readable. */
  photos: string[];
  checklistId?: string;
}

export interface EquipmentNote {
  id: string;
  createdAt: number;
  updatedAt: number;
  section: "capacitor" | "contactor" | "thermostat" | "refrigerant" | "indoor-coil";
  title: string;
  body: string;
}

// ============================================================================
// V1.1 — Sean Factor
// ============================================================================

/** Sean learning note categories (a superset of general note categories) */
export type SeanCategory =
  | "capacitor"
  | "contactor"
  | "refrigerant"
  | "thermostat-wiring"
  | "indoor-coil"
  | "service-call"
  | "annual-service"
  | "install"
  | "tools"
  | "general";

export interface SeanFactorNote {
  id: string;
  createdAt: number;
  updatedAt: number;
  category: SeanCategory;
  text: string;
  /** Optional link to a Field Guide section, derived from category */
  fieldGuideSection?: EquipmentNote["section"];
}

export type SeanQuoteRating = "decent" | "good-one" | "asshole" | "hall-of-fame";

export interface SeanQuote {
  id: string;
  createdAt: number;
  text: string;
  context?: string;
  rating?: SeanQuoteRating;
}

/** Historical per-day shit-talk totals (preserved when the day rolls over) */
export interface ShitTalkDay {
  /** ISO date YYYY-MM-DD */
  date: string;
  count: number;
}

// ============================================================================
// V1.1 / V1.2 — Equipment Photos
// ============================================================================

export type EquipmentType =
  | "outdoor-condenser"
  | "heat-pump"
  | "air-handler"
  | "furnace"
  | "evaporator-coil"
  | "thermostat"
  | "other";

export type ComponentTag =
  | "capacitor"
  | "contactor"
  | "compressor"
  | "condenser-fan"
  | "service-ports"
  | "control-board"
  | "transformer"
  | "evaporator-coil"
  | "blower"
  | "filter"
  | "drain"
  | "thermostat"
  | "wiring"
  | "other";

/** A single arrow/label callout on a photo. Coordinates are normalized 0..1
 *  relative to the displayed image so they survive resizing. */
export interface PhotoCallout {
  id: string;
  /** Component tag for this callout (drives label) */
  tag: ComponentTag;
  /** Display label (defaults to the tag's label, but editable) */
  label: string;
  /** Optional short note */
  note?: string;
  /** Normalized position 0..1 — fraction of image width/height */
  x: number;
  y: number;
}

export type PhotoSource = "camera" | "upload";

export interface EquipmentPhoto {
  id: string;
  /** When the photo record was saved into COILSIDE. */
  createdAt: number;
  /**
   * When the image entered the evidence flow. For a camera capture this is set
   * immediately when the camera result is returned. For a gallery upload it is
   * the time it was added to COILSIDE, not a claim about the original camera time.
   */
  capturedAt?: number;
  /** Whether this image came from the phone camera or an existing file upload. */
  source?: PhotoSource;
  /** Optional device-reported geolocation captured at photo selection time. */
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  /** Photo name (user-supplied) */
  name: string;
  /** ISO date when the photo was taken/added — user editable for organization. */
  date: string;
  equipmentType: EquipmentType;
  brand?: string;
  model?: string;
  serial?: string;
  notes?: string;
  /** Component tags assigned to the photo (searchable) */
  tags: ComponentTag[];
  /** Arrow/label callouts on the photo */
  callouts: PhotoCallout[];
  /**
   * The image data URL (data:image/jpeg;base64,...).
   *
   * Storage strategy:
   *   - When IndexedDB is available, the actual image bytes live in
   *     IndexedDB (keyed by `id`) and this field is OMITTED from the
   *     persisted localStorage record. The runtime hydrates it back in
   *     via `getPhotoBlob(id)` before rendering.
   *   - When IndexedDB is unavailable (older browser / private mode),
   *     this field is persisted in localStorage directly as a fallback.
   *
   * Either way, the in-memory EquipmentPhoto object may have this property
   * populated while the app is running.
   */
  dataUrl?: string;
  /** Optional link to a Field Guide section (so a photo can be attached to a reference page) */
  fieldGuideSection?: EquipmentNote["section"];
}

// ============================================================================
// V1.1 — Voice settings
// ============================================================================

export interface VoiceSettings {
  /** Master TTS toggle */
  ttsEnabled: boolean;
  /** Smartass predefined voice responses toggle */
  smartassEnabled: boolean;
  /** 0.5 (slow) .. 2.0 (fast) */
  speechRate: number;
  /** Optional preferred voice URI from speechSynthesis.getVoices() */
  preferredVoiceURI?: string;
}

// ============================================================================
// Top-level state
// ============================================================================

export interface CoilsideState {
  version: number;
  workEntries: WorkEntry[];
  notes: Note[];
  checklists: Checklist[];
  refrigerantLogs: RefrigerantLog[];
  installs: InstallRecord[];
  equipmentNotes: EquipmentNote[];
  activeTimer: {
    employer: Employer;
    startedAt: number;
  } | null;

  // V1.1 additions
  seanNotes: SeanFactorNote[];
  seanQuotes: SeanQuote[];
  shitTalkDays: ShitTalkDay[];

  equipmentPhotos: EquipmentPhoto[];

  settings: {
    defaultRefrigerantType: string;
    showSeanTaughtShortcut: boolean;
    /** V1.1 voice settings */
    voice: VoiceSettings;
  };
}
