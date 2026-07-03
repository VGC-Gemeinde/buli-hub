"use client";

import { format, parse } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseIso(value: string): Date | undefined {
  return value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
}

// Date picker with a German calendar and a DD.MM.YYYY label, independent of the
// browser locale. Value is an ISO date string (YYYY-MM-DD) or "" when unset.
export function DatePicker({
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
          className={cn("h-8 justify-start gap-2 font-normal", className)}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            format(selected, "dd.MM.yyyy", { locale: de })
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

// Date + time picker producing a datetime-local string (YYYY-MM-DDTHH:mm). The
// date uses the German calendar above; the time is a plain 24-hour field.
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
      <Input
        type="time"
        value={time}
        onChange={(event) =>
          datePart && onChange(`${datePart}T${event.target.value}`)
        }
        className="h-8 w-[110px]"
      />
    </div>
  );
}
