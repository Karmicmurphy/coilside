"use client";

import { useMemo, useState } from "react";
import { Mic, MicOff, Save, Search, Trash2, Wrench } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/components/screen-router";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useCoilsideStore } from "@/lib/store";
import type { Note } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

const PREFIX = "[FIELD LOG]";

type ParsedLog = {
  job: string;
  site: string;
  equipment: string[];
  happened: string;
  checked: string;
  cause: string;
  fix: string;
  learned: string;
  raw: string;
};

const EQUIPMENT_RULES: Array<[string, RegExp]> = [
  ["Capacitor", /capacitor|microfarad|mfd/i],
  ["Contactor", /contactor/i],
  ["Thermostat", /thermostat|stat|r\s*wire|y\s*wire|g\s*wire|w\s*wire/i],
  ["Refrigerant", /refrigerant|freon|410a|r-?410|r-?22|superheat|subcool|pressure|psi/i],
  ["Indoor Coil", /evaporator|indoor coil|a coil|coil froze|frozen coil/i],
  ["Compressor", /compressor/i],
  ["Blower", /blower|indoor fan/i],
  ["Condenser Fan", /condenser fan|outdoor fan/i],
  ["Drain", /drain|condensate|float switch/i],
  ["Heat Pump", /heat pump|reversing valve|defrost/i],
  ["Furnace", /furnace|flame sensor|ignitor|gas valve|limit switch/i],
];

function extractAfter(text: string, labels: string[], stopLabels: string[]): string {
  const lower = text.toLowerCase();
  let start = -1;
  let used = "";
  for (const label of labels) {
    const idx = lower.indexOf(label);
    if (idx >= 0 && (start < 0 || idx < start)) {
      start = idx;
      used = label;
    }
  }
  if (start < 0) return "";
  const contentStart = start + used.length;
  let end = text.length;
  for (const label of stopLabels) {
    const idx = lower.indexOf(label, contentStart);
    if (idx >= 0 && idx < end) end = idx;
  }
  return text.slice(contentStart, end).replace(/^[:\-\s]+/, "").trim();
}

function parseTranscript(raw: string, job: string): ParsedLog {
  const clean = raw.replace(/\s+/g, " ").trim();
  const equipment = EQUIPMENT_RULES.filter(([, re]) => re.test(clean)).map(([name]) => name);
  const markers = [" problem ", " issue ", " symptom ", " checked ", " tested ", " found ", " cause ", " fixed ", " fix ", " replaced ", " learned ", " lesson "];

  const happened = extractAfter(` ${clean}`, [" problem ", " issue ", " symptom "], markers.filter((m) => ![" problem ", " issue ", " symptom "].includes(m))) || clean;
  const checked = extractAfter(` ${clean}`, [" checked ", " tested "], [" found ", " cause ", " fixed ", " fix ", " replaced ", " learned ", " lesson "]);
  const cause = extractAfter(` ${clean}`, [" cause ", " found "], [" fixed ", " fix ", " replaced ", " learned ", " lesson "]);
  const fix = extractAfter(` ${clean}`, [" fixed ", " fix ", " replaced "], [" learned ", " lesson "]);
  const learned = extractAfter(` ${clean}`, [" learned ", " lesson "], []);

  const siteMatch = clean.match(/(?:at|job|site)\s+([a-z0-9][a-z0-9 '\-]{2,40}?)(?=\s+(?:problem|issue|symptom|checked|tested|found|cause|fixed|fix|replaced|learned|lesson)\b|$)/i);

  return {
    job,
    site: siteMatch?.[1]?.trim() || "",
    equipment,
    happened,
    checked,
    cause,
    fix,
    learned,
    raw: clean,
  };
}

function serialize(log: ParsedLog): string {
  return [
    PREFIX,
    `JOB: ${log.job}`,
    `SITE: ${log.site || "Not specified"}`,
    `EQUIPMENT: ${log.equipment.length ? log.equipment.join(", ") : "General HVAC"}`,
    `WHAT HAPPENED: ${log.happened || "Not captured"}`,
    `WHAT WE CHECKED: ${log.checked || "Not captured"}`,
    `CAUSE: ${log.cause || "Not captured"}`,
    `FIX: ${log.fix || "Not captured"}`,
    `WHAT I LEARNED: ${log.learned || "Not captured"}`,
    `RAW: ${log.raw}`,
  ].join("\n");
}

function parseSaved(text: string): ParsedLog | null {
  if (!text.startsWith(PREFIX)) return null;
  const read = (label: string) => text.split("\n").find((line) => line.startsWith(label))?.slice(label.length).trim() || "";
  const equipment = read("EQUIPMENT:").split(",").map((x) => x.trim()).filter(Boolean);
  return {
    job: read("JOB:"),
    site: read("SITE:"),
    equipment,
    happened: read("WHAT HAPPENED:"),
    checked: read("WHAT WE CHECKED:"),
    cause: read("CAUSE:"),
    fix: read("FIX:"),
    learned: read("WHAT I LEARNED:"),
    raw: read("RAW:"),
  };
}

function guideScreenFor(equipment: string) {
  if (equipment === "Capacitor") return "service-capacitor" as const;
  if (equipment === "Contactor") return "service-contactor" as const;
  if (equipment === "Thermostat") return "service-thermostat" as const;
  if (equipment === "Refrigerant") return "service-refrigerant" as const;
  if (equipment === "Indoor Coil") return "service-indoor-coil" as const;
  return "service-call" as const;
}

export function FieldLogScreen() {
  const { go } = useRouter();
  const addNote = useCoilsideStore((s) => s.addNote);
  const deleteNote = useCoilsideStore((s) => s.deleteNote);
  const notes = useCoilsideStore((s) => s.notes);
  const speech = useSpeechRecognition();

  const [job, setJob] = useState("Tim Johnson");
  const [transcript, setTranscript] = useState("");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => parseTranscript(transcript, job), [transcript, job]);
  const fieldLogs = useMemo(() => notes.map((n) => ({ note: n, log: parseSaved(n.text) })).filter((x): x is { note: Note; log: ParsedLog } => !!x.log), [notes]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return fieldLogs;
    return fieldLogs.filter(({ log }) => serialize(log).toLowerCase().includes(q));
  }, [fieldLogs, search]);

  function startListening() {
    speech.start((finalText) => {
      setTranscript((prev) => `${prev}${prev ? " " : ""}${finalText}`.trim());
      setSaved(false);
    });
  }

  function saveLog() {
    if (!transcript.trim()) return;
    addNote({ category: "general-reminder", text: serialize(preview) });
    setTranscript("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="Field Log" subtitle="Tap. Talk. Save. Remember." />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={job === "Tim Johnson" ? "default" : "outline"} className="h-12" onClick={() => setJob("Tim Johnson")}>Tim Johnson</Button>
          <Button variant={job === "Farmhouse" ? "default" : "outline"} className="h-12" onClick={() => setJob("Farmhouse")}>Farmhouse</Button>
        </div>

        <div className="rounded-xl border-2 border-cyan-500/30 bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">One-tap field memory</p>
          <p className="mt-1 text-sm text-muted-foreground">Just talk normally. Best results if you say: “Problem… checked… cause… fixed… learned…”</p>

          <Button onClick={speech.listening ? speech.stop : startListening} className={`mt-4 h-20 w-full text-lg font-black ${speech.listening ? "bg-red-500 text-white hover:bg-red-400" : "bg-cyan-500 text-black hover:bg-cyan-400"}`}>
            {speech.listening ? <><MicOff size={28} className="mr-2" /> STOP — I GOT IT</> : <><Mic size={28} className="mr-2" /> WTF HAPPENED?</>}
          </Button>

          {speech.interim && <p className="mt-2 text-sm italic text-muted-foreground">…{speech.interim}</p>}
          {speech.error && <p className="mt-2 text-sm text-amber-300">{speech.error}</p>}

          {transcript && (
            <>
              <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={4} className="mt-3" />
              <div className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-sm">
                <p><b>Equipment:</b> {preview.equipment.length ? preview.equipment.join(", ") : "General HVAC"}</p>
                <p className="mt-1"><b>Problem:</b> {preview.happened}</p>
                {preview.checked && <p className="mt-1"><b>Checked:</b> {preview.checked}</p>}
                {preview.cause && <p className="mt-1"><b>Cause:</b> {preview.cause}</p>}
                {preview.fix && <p className="mt-1"><b>Fix:</b> {preview.fix}</p>}
                {preview.learned && <p className="mt-1"><b>Learned:</b> {preview.learned}</p>}
              </div>
              <Button onClick={saveLog} className="mt-3 h-14 w-full bg-amber-500 text-black hover:bg-amber-400"><Save size={20} className="mr-2" /> {saved ? "SAVED" : "SAVE FIELD LOG"}</Button>
            </>
          )}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search old problems, fixes, equipment…" className="h-12 pl-9" />
        </div>

        <div className="space-y-3">
          {filtered.map(({ note, log }) => (
            <div key={note.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">{log.job}{log.site && log.site !== "Not specified" ? ` · ${log.site}` : ""}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(note.createdAt)}</p>
                </div>
                <button onClick={() => { if (confirm("Delete this field log?")) deleteNote(note.id); }} className="tap-lg flex h-9 w-9 items-center justify-center text-red-400"><Trash2 size={16} /></button>
              </div>
              <p className="mt-3 text-sm"><b>What happened:</b> {log.happened}</p>
              {log.cause && log.cause !== "Not captured" && <p className="mt-2 text-sm"><b>Cause:</b> {log.cause}</p>}
              {log.fix && log.fix !== "Not captured" && <p className="mt-2 text-sm"><b>Fix:</b> {log.fix}</p>}
              {log.learned && log.learned !== "Not captured" && <p className="mt-2 text-sm"><b>Learned:</b> {log.learned}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {log.equipment.map((tag) => (
                  <Button key={tag} size="sm" variant="outline" className="h-9" onClick={() => go(guideScreenFor(tag))}><Wrench size={14} className="mr-1" /> {tag}</Button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No field logs yet. Tap WTF HAPPENED? and talk.</div>}
        </div>
      </div>
    </div>
  );
}
