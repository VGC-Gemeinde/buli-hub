"use client";

import { format, parse } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseIso(value: string): Date | undefined {
  return value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
}

// While the popover is open, the trigger carries the same orange focus ring
// an Input shows while being edited — the pickers' „active" state.
const OPEN_RING =
  "data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/50";

// Date picker with a German calendar and a DD.MM.YYYY label, independent of the
// browser locale. Value is an ISO date string (YYYY-MM-DD) or "" when unset.
export function DatePicker({
  value,
  onChange,
  disabledBefore,
  id,
  className,
  formatStr = "dd.MM.yyyy",
}: {
  value: string;
  onChange: (value: string) => void;
  disabledBefore?: string;
  id?: string;
  className?: string;
  formatStr?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const before = disabledBefore ? parseIso(disabledBefore) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 font-normal",
            OPEN_RING,
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            format(selected, formatStr, { locale: de })
          ) : (
            <span className="text-muted-foreground">Datum wählen</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? before}
          disabled={before ? { before } : undefined}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Half-hour steps around the clock, plus 23:59 — the classic deadline. A
// native `<input type="time">` is deliberately not used: it renders in the
// *browser's* locale (12-hour AM/PM on an English system, whatever we set)
// and looks nothing like the DatePicker button next to it.
const TIME_OPTIONS = [
  ...Array.from({ length: 48 }, (_, i) => {
    const hour = String(Math.floor(i / 2)).padStart(2, "0");
    return `${hour}:${i % 2 === 0 ? "00" : "30"}`;
  }),
  "23:59",
];

// Time picker matching the DatePicker's anatomy: outline button + popover
// list, always 24-hour German display, independent of the browser locale.
// Value is HH:mm or "" when unset.
export function TimePicker({
  value,
  onChange,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 font-normal",
            OPEN_RING,
            className,
          )}
        >
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          {value ? (
            <span className="tabular-nums">{value} Uhr</span>
          ) : (
            <span className="text-muted-foreground">Uhrzeit</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[124px] p-1">
        <div className="max-h-64 overflow-y-auto">
          {TIME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              // Open the list scrolled to the current selection.
              ref={
                option === value
                  ? (el) => el?.scrollIntoView({ block: "center" })
                  : undefined
              }
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(
                "w-full rounded-md px-3 py-1.5 text-left text-sm tabular-nums hover:bg-secondary",
                option === value &&
                  "bg-brand-orange/10 font-semibold text-brand-blue dark:text-white",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Date + time picker producing a datetime-local string (YYYY-MM-DDTHH:mm).
// Both halves share the same button-plus-popover look and German formatting.
export function DateTimePicker({
  value,
  onChange,
  disabledBefore,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabledBefore?: string;
  id?: string;
  className?: string;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const time = timePart || "18:00";

  return (
    <div className={cn("flex gap-2", className)}>
      <DatePicker
        id={id}
        value={datePart}
        onChange={(date) => onChange(date ? `${date}T${time}` : "")}
        disabledBefore={disabledBefore}
        className="w-[150px]"
      />
      <TimePicker
        value={time}
        onChange={(newTime) => datePart && onChange(`${datePart}T${newTime}`)}
        className="w-[124px]"
      />
    </div>
  );
}
