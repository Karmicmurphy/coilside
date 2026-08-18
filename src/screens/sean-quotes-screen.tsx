"use client";

// SEAN SAID SOME SHIT — quote archive + new quote flow.
// Big "Sean Said Some Shit" button starts a new quote (speech-to-text friendly).

import { useMemo, useState } from "react";
import { AppBar } from "@/components/app-bar";
import { useRouter } from "@/components/screen-router";
import { useCoilsideStore } from "@/lib/store";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useSmartassResponse } from "@/hooks/use-smartass-response";
import {
  SEAN_QUOTE_RATINGS,
  SEAN_QUOTE_RATING_LABEL,
  SMARTASS_RESPONSES,
} from "@/lib/defaults";
import type { SeanQuote, SeanQuoteRating } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mic,
  MicOff,
  Pencil,
  Save,
  Search,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { cn, formatDateLabel } from "@/lib/utils";

const RATING_BADGE: Record<SeanQuoteRating, string> = {
  decent: "bg-slate-500/20 text-slate-200",
  "good-one": "bg-emerald-500/20 text-emerald-300",
  asshole: "bg-red-500/20 text-red-300",
  "hall-of-fame": "bg-amber-500/30 text-amber-200",
};

// ----------------------------------------------------------------------------
// NEW SEAN QUOTE
// ----------------------------------------------------------------------------
export function SeanQuoteNewScreen() {
  const { go } = useRouter();
  const add = useCoilsideStore((s) => s.addSeanQuote);
  const incrementShitTalk = useCoilsideStore((s) => s.incrementShitTalk);
  const speech = useSpeechRecognition();
  const smartass = useSmartassResponse();

  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [rating, setRating] = useState<SeanQuoteRating>("decent");

  function handleStartSpeech() {
    speech.start((finalText) => {
      setText((prev) => {
        const sep = prev && !prev.endsWith(" ") ? " " : "";
        return prev + sep + finalText;
      });
    });
  }

  function handleSave() {
    if (!text.trim()) return;
    add({ text: text.trim(), context: context.trim() || undefined, rating });
    // Saving a quote also bumps the shit-talk counter (it counts as Sean talking some shit).
    incrementShitTalk();
    // Smartass voice response
    smartass(SMARTASS_RESPONSES.seanQuoteSaved);
    setText("");
    setContext("");
    go("sean-quotes");
  }

  return (
    <div className="min-h-dvh pb-24">
      <AppBar title="SEAN SAID SOME SHIT" subtitle="New quote" />
      <div className="space-y-4 p-4">
        <div>
          <Label htmlFor="sqq" className="text-xs uppercase tracking-wider text-muted-foreground">
            What Sean said
          </Label>
          <Textarea
            id="sqq"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Quote Sean directly..."
            className="mt-1 text-base"
            autoFocus
          />
          {speech.interim && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              ... {speech.interim}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="sqc">Context (optional)</Label>
          <Input
            id="sqc"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="On the job, after lunch, about Randy..."
            className="h-11"
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Rating
          </Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SEAN_QUOTE_RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRating(r.value)}
                className={cn(
                  "tap-lg rounded-md border-2 px-3 py-3 text-sm font-bold",
                  rating === r.value
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-border bg-card text-foreground/80"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {speech.error && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
            {speech.error}
          </div>
        )}
        {!speech.supported && (
          <p className="text-xs text-muted-foreground">
            Speech recognition isn&apos;t supported in this browser. Type the
            quote instead.
          </p>
        )}

        {speech.supported && (
          <Button
            onClick={speech.listening ? speech.stop : handleStartSpeech}
            className={cn(
              "h-14 w-full",
              speech.listening
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-cyan-500 text-black hover:bg-cyan-400"
            )}
          >
            {speech.listening ? (
              <>
                <MicOff size={22} className="mr-2" /> STOP LISTENING
              </>
            ) : (
              <>
                <Mic size={22} className="mr-2" /> SPEECH TO TEXT 🎙️
              </>
            )}
          </Button>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="h-12 flex-1 bg-amber-500 text-black hover:bg-amber-400"
          >
            <Save size={18} className="mr-1" /> Save Quote
          </Button>
          <Button variant="ghost" onClick={() => go("sean-quotes")} className="h-12">
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SEAN QUOTES LIST
// ----------------------------------------------------------------------------
export function SeanQuotesList() {
  const { go } = useRouter();
  const seanQuotes = useCoilsideStore((s) => s.seanQuotes);
  const del = useCoilsideStore((s) => s.deleteSeanQuote);
  const update = useCoilsideStore((s) => s.updateSeanQuote);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SeanQuoteRating | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editContext, setEditContext] = useState("");
  const [editRating, setEditRating] = useState<SeanQuoteRating>("decent");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return seanQuotes.filter((qte) => {
      if (filter !== "all" && qte.rating !== filter) return false;
      if (
        q &&
        !qte.text.toLowerCase().includes(q) &&
        !(qte.context || "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [seanQuotes, search, filter]);

  return (
    <div className="min-h-dvh pb-24">
      <AppBar
        title="SEAN SAID SOME SHIT"
        subtitle={`${seanQuotes.length} quotes`}
        right={
          <button
            onClick={() => go("sean-quote-new", { contextId: "sean-quote" })}
            className="tap-lg flex h-10 items-center rounded-lg bg-amber-500 px-3 text-xs font-bold text-black"
          >
            + NEW
          </button>
        }
      />
      <div className="space-y-3 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes..."
            className="h-11 pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </Chip>
          {SEAN_QUOTE_RATINGS.map((r) => (
            <Chip
              key={r.value}
              active={filter === r.value}
              onClick={() => setFilter(r.value)}
            >
              {r.label}
            </Chip>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {seanQuotes.length === 0
              ? "No quotes yet — tap + NEW when Sean says some shit."
              : "No quotes match your search."}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((q) => (
              <SeanQuoteCard
                key={q.id}
                quote={q}
                onDelete={() => del(q.id)}
                onStartEdit={() => {
                  setEditingId(q.id);
                  setEditText(q.text);
                  setEditContext(q.context || "");
                  setEditRating(q.rating || "decent");
                }}
                editing={editingId === q.id}
                editText={editText}
                editContext={editContext}
                editRating={editRating}
                onEditText={setEditText}
                onEditContext={setEditContext}
                onEditRating={setEditRating}
                onSaveEdit={() => {
                  if (editText.trim()) {
                    update(q.id, {
                      text: editText.trim(),
                      context: editContext.trim() || undefined,
                      rating: editRating,
                    });
                  }
                  setEditingId(null);
                }}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SeanQuoteCard({
  quote,
  onDelete,
  onStartEdit,
  editing,
  editText,
  editContext,
  editRating,
  onEditText,
  onEditContext,
  onEditRating,
  onSaveEdit,
  onCancelEdit,
}: {
  quote: SeanQuote;
  onDelete: () => void;
  onStartEdit: () => void;
  editing: boolean;
  editText: string;
  editContext: string;
  editRating: SeanQuoteRating;
  onEditText: (s: string) => void;
  onEditContext: (s: string) => void;
  onEditRating: (r: SeanQuoteRating) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const tts = useTextToSpeech();

  if (editing) {
    return (
      <li className="rounded-lg border-2 border-amber-500/40 bg-card p-3">
        <Textarea
          value={editText}
          onChange={(e) => onEditText(e.target.value)}
          rows={3}
          autoFocus
        />
        <div className="mt-2">
          <Label htmlFor="eqc">Context</Label>
          <Input
            id="eqc"
            value={editContext}
            onChange={(e) => onEditContext(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="mt-2">
          <Label className="text-xs uppercase text-muted-foreground">Rating</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {SEAN_QUOTE_RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => onEditRating(r.value)}
                className={cn(
                  "rounded-md border-2 px-3 py-2 text-xs font-bold",
                  editRating === r.value
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-border bg-card text-foreground/80"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={onSaveEdit}
            className="h-9 bg-amber-500 text-black hover:bg-amber-400"
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-9">
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">
        {quote.rating && (
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              RATING_BADGE[quote.rating]
            )}
          >
            {SEAN_QUOTE_RATING_LABEL[quote.rating]}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatDateLabel(new Date(quote.createdAt).toISOString().slice(0, 10))}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm italic text-foreground/90">
        &ldquo;{quote.text}&rdquo;
      </p>
      {quote.context && (
        <p className="mt-2 text-xs text-muted-foreground">— {quote.context}</p>
      )}
      <div className="mt-2 flex gap-1">
        {tts.supported && tts.ttsEnabled && (
          <button
            onClick={() => tts.speak(quote.text)}
            className="tap-lg flex h-8 w-8 items-center justify-center rounded text-amber-400 hover:bg-amber-500/15"
            aria-label="Speak quote"
          >
            <Volume2 size={14} />
          </button>
        )}
        <button
          onClick={onStartEdit}
          className="tap-lg flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this quote?")) onDelete();
          }}
          className="tap-lg flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/15"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold",
        active ? "bg-amber-500 text-black" : "bg-secondary text-foreground/80"
      )}
    >
      {children}
    </button>
  );
}
