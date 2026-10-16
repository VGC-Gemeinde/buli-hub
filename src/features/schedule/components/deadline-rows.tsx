"use client";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { cn } from "@/lib/utils";
import { shiftDeadlineFrom, windowsFromDeadlines } from "../spieltage";

// Weekday-prefixed German dates make the Sunday rhythm (and any deviation)
// visible: "So. 30.08.2026", short "Mo. 03.07.".
export function fmtDay(iso: string): string {
  return format(parseISO(iso), "EEEEEE. dd.MM.yyyy", { locale: de });
}

function fmtShort(iso: string): string {
  return format(parseISO(iso), "EEEEEE. dd.MM.", { locale: de });
}

export function dayCount(startIso: string, endIso: string): number {
  return differenceInCalendarDays(parseISO(endIso), parseISO(startIso)) + 1;
}

export function Fact({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
        {label}
      </div>
      <div className="font-semibold text-[15px]">{value}</div>
      <div className="truncate text-muted-foreground text-xs">{sub}</div>
    </div>
  );
}

// The editable deadlines of a calendar, one per week. Editing a deadline
// shifts every later week by the same delta; when it moves, the shifted rows
// flash so the rule is visible, not prose-only.
export function useDeadlines(defaults: string[]) {
  const [deadlines, setDeadlines] = useState(defaults);
  const [flashFrom, setFlashFrom] = useState<number | null>(null);
  const [flashTick, setFlashTick] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function edit(index: number, date: string) {
    const delta = differenceInCalendarDays(
      parseISO(date),
      parseISO(deadlines[index]),
    );
    setDeadlines(shiftDeadlineFrom(deadlines, index, date));
    if (delta !== 0 && index < deadlines.length - 1) {
      setFlashFrom(index);
      setFlashTick((tick) => tick + 1);
      if (flashTimer.current) {
        clearTimeout(flashTimer.current);
      }
      flashTimer.current = setTimeout(() => setFlashFrom(null), 1000);
    }
  }

  function reset() {
    setDeadlines(defaults);
    setFlashFrom(null);
  }

  return { deadlines, edit, reset, flashFrom, flashTick };
}

// The rows of the calendar: name, start, deadline picker, length. `start` is
// the first week's first day; a week longer than seven days is marked.
export function DeadlineRows({
  start,
  editor,
  name,
}: {
  start: string;
  editor: ReturnType<typeof useDeadlines>;
  name: (index: number) => string;
}) {
  const { deadlines, edit, flashFrom, flashTick } = editor;
  const rows = windowsFromDeadlines(start, deadlines).map((window, i) => ({
    index: i,
    start: window.start,
    end: window.end,
    days: dayCount(window.start, window.end),
  }));
  return (
    <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
      {rows.map((row) => {
        const flashing = flashFrom !== null && row.index > flashFrom;
        const minFor =
          row.index === 0
            ? format(addDays(parseISO(start), 1), "yyyy-MM-dd")
            : row.start;
        return (
          <div
            key={`${row.index}-${flashTick}`}
            className={cn(
              "flex flex-col gap-2 border-border/60 border-b px-3.5 py-2.5 last:border-b-0 sm:h-11 sm:flex-row sm:items-center sm:gap-3 sm:py-0",
              flashing && "animate-[rowflash_0.9s_ease-out]",
            )}
          >
            <div className="flex items-center gap-3 sm:contents">
              <span className="w-[82px] shrink-0 font-semibold text-[13.5px]">
                {name(row.index)}
              </span>
              <span className="shrink-0 text-[13px] text-muted-foreground sm:w-[104px]">
                ab {fmtShort(row.start)}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:contents">
              <DatePicker
                value={row.end}
                disabledBefore={minFor}
                formatStr="'bis' EEEEEE. dd.MM.yyyy"
                onChange={(date) => edit(row.index, date)}
                className="h-[30px] min-w-0 flex-1 justify-between sm:w-[172px] sm:flex-none"
              />
              <div className="hidden flex-1 sm:block" />
              <span
                className={cn(
                  "shrink-0 font-medium text-[12.5px] tabular-nums",
                  row.days > 7
                    ? "text-[oklch(0.55_0.13_50)]"
                    : "text-muted-foreground",
                )}
              >
                {row.days} Tage
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
