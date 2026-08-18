// Default content for editable lists/checklists and visual reference categories.

import type {
  ChecklistItem,
  ComponentTag,
  EquipmentType,
  NoteCategory,
  SeanCategory,
  SeanQuoteRating,
} from "./types";
import { uid } from "./utils";

export const DEFAULT_ANNUAL_SERVICE_ITEMS: Omit<ChecklistItem, "id">[] = [
  { label: "Change / check air filter", done: false },
  { label: "General visual inspection", done: false },
  { label: "Check capacitor", done: false },
  { label: "Check contactor", done: false },
  { label: "Inspect wiring / connections", done: false },
  { label: "Check indoor equipment", done: false },
  { label: "Check outdoor equipment", done: false },
  { label: "Record refrigerant operating readings", done: false },
  { label: "Check temperatures / operation", done: false },
  { label: "Final operational test", done: false },
];

export const DEFAULT_BEFORE_I_LEAVE_ITEMS: Omit<ChecklistItem, "id">[] = [
  { label: "All screws accounted for", done: false },
  { label: "All screws reinstalled", done: false },
  { label: "Panels / covers installed correctly", done: false },
  { label: "Tools accounted for", done: false },
  { label: "No loose / misplaced wires", done: false },
  { label: "Connections visually checked", done: false },
  { label: "Any wiring I disconnected is restored correctly", done: false },
  { label: "Disconnect / power restored appropriately", done: false },
  { label: "Unit running after work", done: false },
  { label: "Indoor operation checked", done: false },
  { label: "Outdoor fan / compressor operation checked", done: false },
  { label: "Work area cleaned", done: false },
  { label: "FINAL WALK-AROUND", done: false },
];

export const DEFAULT_INSTALL_CHECKLIST: Omit<ChecklistItem, "id">[] = [
  { label: "Equipment level and clearances OK", done: false },
  { label: "Electrical connections tightened", done: false },
  { label: "Refrigerant lines inspected", done: false },
  { label: "Drainage checked", done: false },
  { label: "Thermostat wired and tested", done: false },
  { label: "System started and tested", done: false },
  { label: "Photos taken", done: false },
];

export function makeChecklistItems(
  defaults: Omit<ChecklistItem, "id">[]
): ChecklistItem[] {
  return defaults.map((d) => ({ ...d, id: uid() }));
}

export const NOTE_CATEGORIES: {
  value: NoteCategory;
  label: string;
}[] = [
  { value: "service-call", label: "Service Call" },
  { value: "refrigerant", label: "Refrigerant" },
  { value: "capacitor", label: "Capacitor" },
  { value: "contactor", label: "Contactor" },
  { value: "thermostat-wiring", label: "Thermostat / Wiring" },
  { value: "indoor-coil", label: "Indoor Coil" },
  { value: "install", label: "Install" },
  { value: "general-reminder", label: "General Reminder" },
];

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> =
  NOTE_CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.value]: c.label }),
    {} as Record<NoteCategory, string>
  );

/** Low-voltage wire color conventions shown on the Thermostat page */
export const LOW_VOLTAGE_CONVENTIONS: {
  terminal: string;
  color: string;
  function: string;
  hex: string;
}[] = [
  { terminal: "R", color: "RED", function: "24V power (Rc / Rh common)", hex: "#e23b3b" },
  { terminal: "C", color: "BLUE / BROWN", function: "Common (can vary)", hex: "#3b6ee2" },
  { terminal: "Y", color: "YELLOW", function: "Cooling / compressor call", hex: "#e2c93b" },
  { terminal: "G", color: "GREEN", function: "Indoor blower", hex: "#3be25e" },
  { terminal: "W", color: "WHITE", function: "Heat", hex: "#e8e8e8" },
  { terminal: "O/B", color: "ORANGE / varies", function: "Heat-pump reversing valve", hex: "#e28a3b" },
];

export const SERVICE_CALL_CATEGORIES: {
  id: string;
  label: string;
  description: string;
  target: string;
}[] = [
  {
    id: "refrigerant-leak",
    label: "Refrigerant / Suspected Leak",
    description: "Low charge, ice, or poor cooling",
    target: "service-refrigerant",
  },
  {
    id: "indoor-coil-leak",
    label: "Indoor Evaporator Coil Leak",
    description: "Coil inspection and leak signs",
    target: "service-indoor-coil",
  },
  {
    id: "bad-capacitor",
    label: "Bad Capacitor",
    description: "Won't start, hum, single-phase / dual",
    target: "service-capacitor",
  },
  {
    id: "bad-contactor",
    label: "Bad Contactor",
    description: "Won't energize, pitted, stuck",
    target: "service-contactor",
  },
  {
    id: "thermostat-lowvolt",
    label: "Thermostat / Low-Voltage Wiring",
    description: "No call, wrong call, 24V issues",
    target: "service-thermostat",
  },
  {
    id: "other",
    label: "Other",
    description: "Free-form note",
    target: "service-other",
  },
];

export const CAPACITOR_REMINDERS: string[] = [
  "Verify power is OFF before electrical work.",
  "Follow proper procedure for safely isolating / discharging the capacitor.",
  "Take a photo or record the wires BEFORE removing them.",
  "Disconnect / isolate as required before testing.",
  "Use a meter with capacitance / \u00b5F capability.",
  "Compare the reading with the rating and tolerance printed on the capacitor.",
  "Inspect terminals and wires.",
  "Reconnect everything correctly.",
  "Double-check before restoring power.",
];

export const CONTACTOR_REMINDERS: string[] = [
  "Inspect for burning / discoloration",
  "Inspect for pitting or damage on contacts",
  "Check for overheated wires",
  "Check loose connections",
  "Verify the low-voltage call appropriately",
  "Verify operation safely",
];

export const REFRIGERANT_TYPES: string[] = [
  "R-410A",
  "R-22",
  "R-32",
  "R-454B",
  "R-452B",
  "Other",
];

// ============================================================================
// V1.1 — Sean Factor defaults
// ============================================================================

export const SEAN_CATEGORIES: { value: SeanCategory; label: string }[] = [
  { value: "capacitor", label: "Capacitor" },
  { value: "contactor", label: "Contactor" },
  { value: "refrigerant", label: "Refrigerant" },
  { value: "thermostat-wiring", label: "Thermostat / Wiring" },
  { value: "indoor-coil", label: "Indoor Coil" },
  { value: "service-call", label: "Service Call" },
  { value: "annual-service", label: "Annual Service" },
  { value: "install", label: "Install" },
  { value: "tools", label: "Tools" },
  { value: "general", label: "General" },
];

export const SEAN_CATEGORY_LABEL: Record<SeanCategory, string> =
  SEAN_CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.value]: c.label }),
    {} as Record<SeanCategory, string>
  );

/** Map a Sean category to a Field Guide section, if applicable. */
export function seanCategoryToFieldGuideSection(
  cat: SeanCategory
):
  | "capacitor"
  | "contactor"
  | "thermostat"
  | "refrigerant"
  | "indoor-coil"
  | undefined {
  switch (cat) {
    case "capacitor":
      return "capacitor";
    case "contactor":
      return "contactor";
    case "thermostat-wiring":
      return "thermostat";
    case "refrigerant":
      return "refrigerant";
    case "indoor-coil":
      return "indoor-coil";
    default:
      return undefined;
  }
}

export const SEAN_QUOTE_RATINGS: { value: SeanQuoteRating; label: string }[] = [
  { value: "decent", label: "Decent" },
  { value: "good-one", label: "Good one" },
  { value: "asshole", label: "Asshole" },
  { value: "hall-of-fame", label: "Hall of Fame" },
];

export const SEAN_QUOTE_RATING_LABEL: Record<SeanQuoteRating, string> =
  SEAN_QUOTE_RATINGS.reduce(
    (acc, r) => ({ ...acc, [r.value]: r.label }),
    {} as Record<SeanQuoteRating, string>
  );

/**
 * Shit-talk milestone messages by today's count.
 * Returns the highest milestone reached (or null if 0).
 */
export function shitTalkMilestone(todayCount: number): string | null {
  if (todayCount >= 15) return "SEAN HAS COMPLETED NO ACTUAL HVAC WORK TODAY";
  if (todayCount >= 10) return "HOSTILE WORK ENVIRONMENT";
  if (todayCount >= 5) return "RANDY APPARENTLY DESERVED IT";
  if (todayCount >= 3) return "WARMING UP";
  if (todayCount >= 1) return "IN PROGRESS";
  return null;
}

/** Rotating Sean Factor status messages — randomly picked each load. */
export const SEAN_FACTOR_STATUSES: string[] = [
  "Technical knowledge: Annoyingly high",
  "Shit talking: Excessive",
  "Patience with Randy: Under review",
  "HVAC ability: Unfortunately legitimate",
  "Sarcasm reserves: Above seasonal average",
  "Tool borrowing: Suspicious",
  "Lunch break: Overdue",
  "Confidence: Borderline arrogant",
];

/**
 * Sean Factor percentage — deliberately meaningless.
 * Derived from notes + quotes counts in a deterministic but pointless way.
 */
export function computeSeanFactorPercent(
  notesCount: number,
  quotesCount: number,
  todayShitTalk: number
): number {
  // Use modulo so it stays in 0..100 and wobbles with activity.
  const seed = notesCount * 7 + quotesCount * 13 + todayShitTalk * 3 + 41;
  return 50 + (seed % 51); // always 50..100
}

// ============================================================================
// V1.1 — Equipment Photos defaults
// ============================================================================

export const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: "outdoor-condenser", label: "Outdoor Condenser" },
  { value: "heat-pump", label: "Heat Pump" },
  { value: "air-handler", label: "Air Handler" },
  { value: "furnace", label: "Furnace" },
  { value: "evaporator-coil", label: "Evaporator Coil" },
  { value: "thermostat", label: "Thermostat" },
  { value: "other", label: "Other" },
];

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> =
  EQUIPMENT_TYPES.reduce(
    (acc, t) => ({ ...acc, [t.value]: t.label }),
    {} as Record<EquipmentType, string>
  );

export const COMPONENT_TAGS: { value: ComponentTag; label: string }[] = [
  { value: "capacitor", label: "Capacitor" },
  { value: "contactor", label: "Contactor" },
  { value: "compressor", label: "Compressor" },
  { value: "condenser-fan", label: "Condenser Fan" },
  { value: "service-ports", label: "Service Ports" },
  { value: "control-board", label: "Control Board" },
  { value: "transformer", label: "Transformer" },
  { value: "evaporator-coil", label: "Evaporator Coil" },
  { value: "blower", label: "Blower" },
  { value: "filter", label: "Filter" },
  { value: "drain", label: "Drain" },
  { value: "thermostat", label: "Thermostat" },
  { value: "wiring", label: "Wiring" },
  { value: "other", label: "Other" },
];

export const COMPONENT_TAG_LABEL: Record<ComponentTag, string> =
  COMPONENT_TAGS.reduce(
    (acc, t) => ({ ...acc, [t.value]: t.label }),
    {} as Record<ComponentTag, string>
  );

// ============================================================================
// V1.1 — Smartass voice responses (predefined text, spoken via Web Speech API)
// ============================================================================

export const SMARTASS_RESPONSES = {
  seanQuoteSaved: "Sean Factor increased.",
  beforeILeaveComplete:
    "All checks complete. Screws accounted for. Try not to embarrass yourself.",
  annualServiceComplete: "Service complete.",
  seanShitTalk: [
    "Noted.",
    "Logged.",
    "Randy's fault, presumably.",
    "Sean Factor adjusting.",
  ],
} as const;

