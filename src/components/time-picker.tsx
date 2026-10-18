"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatTime12, parseTime24, toTime24, type Meridiem } from "@/lib/time-picker";

/**
 * A deliberate tap-to-open clock control. Native <input type="time"> often
 * focuses its text segments instead of opening a clock on Android browsers.
 * This is consistent in Chrome, installed PWAs, and other mobile browsers.
 */
export function TimePicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const initial = parseTime24(value);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(initial.hour);
  const [minuteText, setMinuteText] = useState(String(initial.minute).padStart(2, "0"));
  const [meridiem, setMeridiem] = useState<Meridiem>(initial.meridiem);
  const validMinute = /^\d{1,2}$/.test(minuteText) && Number(minuteText) >= 0 && Number(minuteText) <= 59;

  function onDialogOpenChange(next: boolean) {
    if (next) {
      const current = parseTime24(value);
      setHour(current.hour);
      setMinuteText(String(current.minute).padStart(2, "0"));
      setMeridiem(current.meridiem);
    }
    setOpen(next);
  }

  function applyTime() {
    if (!validMinute) return;
    onChange(toTime24(hour, Number(minuteText), meridiem));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Choose ${label.toLowerCase()} time. Current: ${formatTime12(value)}`}
          className="flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-base font-semibold shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>{formatTime12(value)}</span>
          <Clock3 aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-400" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[95dvh] w-[calc(100%-1rem)] max-w-sm gap-3 overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>{label} time</DialogTitle>
          <DialogDescription>Tap an hour, choose minutes, then AM or PM.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 py-3 text-center text-3xl font-black text-amber-300" aria-live="polite">
          {hour}:{validMinute ? String(Number(minuteText)).padStart(2, "0") : "--"} {meridiem}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Hour</p>
          <div role="group" aria-label="Hour" className="grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((choice) => (
              <Button
                key={choice}
                type="button"
                variant={hour === choice ? "default" : "outline"}
                aria-pressed={hour === choice}
                className="h-12 px-0 text-lg"
                onClick={() => setHour(choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Minutes</p>
          <div role="group" aria-label="Minute shortcuts" className="grid grid-cols-4 gap-2">
            {[0, 15, 30, 45].map((choice) => (
              <Button
                key={choice}
                type="button"
                variant={validMinute && Number(minuteText) === choice ? "default" : "outline"}
                aria-pressed={validMinute && Number(minuteText) === choice}
                className="h-12 px-0 text-base"
                onClick={() => setMinuteText(String(choice).padStart(2, "0"))}
              >
                {String(choice).padStart(2, "0")}
              </Button>
            ))}
          </div>
          <label htmlFor={`exact-minutes-${label.toLowerCase()}`} className="mt-2 block text-xs text-muted-foreground">
            Or enter exact minutes (0–59)
          </label>
          <Input
            id={`exact-minutes-${label.toLowerCase()}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={1}
            value={minuteText}
            onChange={(event) => setMinuteText(event.target.value)}
            className="mt-1 h-11 text-base"
            aria-invalid={!validMinute}
          />
        </div>
        <div role="group" aria-label="AM or PM" className="grid grid-cols-2 gap-2">
          {(["AM", "PM"] as const).map((choice) => (
            <Button key={choice} type="button" variant={meridiem === choice ? "default" : "outline"}
              aria-pressed={meridiem === choice} className="h-12 text-lg" onClick={() => setMeridiem(choice)}>
              {choice}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button type="button" variant="outline" className="h-12" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" className="h-12 bg-amber-500 font-bold text-black hover:bg-amber-400"
            disabled={!validMinute} onClick={applyTime}>Set time</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
