"use client";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { TypeToConfirm } from "@/components/type-to-confirm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { matchesConfirmationPhrase } from "@/lib/confirm";
import { cn } from "@/lib/utils";
import { createSchedule } from "../actions";
import {
  matchdayName,
  SCHEDULE_CONFIRMATION_PHRASE,
  shiftDeadlineFrom,
  windowsFromDeadlines,
} from "../spieltage";

// Weekday-prefixed German dates make the Sunday rhythm (and any deviation)
// visible: "So. 30.08.2026", short "Mo. 03.07.".
function fmtDay(iso: string): string {
  return format(parseISO(iso), "EEEEEE. dd.MM.yyyy", { locale: de });
}

function fmtShort(iso: string): string {
  return format(parseISO(iso), "EEEEEE. dd.MM.", { locale: de });
}

function dayCount(startIso: string, endIso: string): number {
  return differenceInCalendarDays(parseISO(endIso), parseISO(startIso)) + 1;
}

function Fact({
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

// "Spielplan erstellen": staff fix the whole season calendar in one terminal
// action. The facts strip and per-week durations keep the season-level
// consequences (Saisonende, pause weeks) readable while editing; extending one
// deadline shifts — and flashes — every later week. Type-to-confirm commits.
export function CreateScheduleDialog({
  seasonStart,
  defaultDeadlines,
  largest,
  triggerSize = "default",
}: {
  seasonStart: string;
  defaultDeadlines: string[];
  largest: number;
  triggerSize?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deadlines, setDeadlines] = useState(defaultDeadlines);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [flashFrom, setFlashFrom] = useState<number | null>(null);
  const [flashTick, setFlashTick] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setDeadlines(defaultDeadlines);
      setConfirmation("");
      setError(null);
      setFlashFrom(null);
    }
    setOpen(next);
  }

  // Editing a deadline shifts every later week by the same delta; when it moves,
  // flash the shifted rows so the rule is visible, not prose-only.
  function editDeadline(index: number, date: string) {
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

  async function submit() {
    setPending(true);
    setError(null);
    const result = await createSchedule({ deadlines });
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const rows = windowsFromDeadlines(seasonStart, deadlines).map(
    (window, i) => ({
      round: i + 1,
      start: window.start,
      end: window.end,
      days: dayCount(window.start, window.end),
    }),
  );
  const count = deadlines.length;
  const lastDeadline = deadlines[count - 1];
  const seasonLength = dayCount(seasonStart, lastDeadline);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size={triggerSize}>
          Spielplan erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Spielplan erstellen?</DialogTitle>
          <DialogDescription>
            Für jede Gruppe wird ein einfaches Rundenturnier erzeugt und die
            reguläre Saison startet sofort. Das kann nicht rückgängig gemacht
            werden.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 rounded-lg bg-muted px-4 py-3 sm:grid-cols-[1fr_1fr_1.25fr] sm:gap-y-4">
          <Fact
            label="Spieltage"
            value={String(count)}
            sub={`größte Gruppe: ${largest} Spieler`}
          />
          <Fact label="Saisonstart" value="Heute" sub={fmtDay(seasonStart)} />
          <Fact
            label="Saisonende"
            value={fmtDay(lastDeadline)}
            sub={`${seasonLength} Tage insgesamt`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-[7px] w-3.5 shrink-0 -skew-x-[18deg] bg-brand-orange" />
            <p className="text-[12.5px] text-muted-foreground">
              Eine spätere Deadline verschiebt alle folgenden Spieltage mit. So
              planst du Feiertage und Pausen ein.
            </p>
          </div>

          <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
            {rows.map((row) => {
              const flashing = flashFrom !== null && row.round - 1 > flashFrom;
              const minFor =
                row.round === 1
                  ? format(addDays(parseISO(seasonStart), 1), "yyyy-MM-dd")
                  : row.start;
              return (
                <div
                  key={`${row.round}-${flashTick}`}
                  className={cn(
                    "flex flex-col gap-2 border-border/60 border-b px-3.5 py-2.5 last:border-b-0 sm:h-11 sm:flex-row sm:items-center sm:gap-3 sm:py-0",
                    flashing && "animate-[rowflash_0.9s_ease-out]",
                  )}
                >
                  <div className="flex items-center gap-3 sm:contents">
                    <span className="w-[82px] shrink-0 font-semibold text-[13.5px]">
                      {matchdayName(row.round)}
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
                      onChange={(date) => editDeadline(row.round - 1, date)}
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
        </div>

        <TypeToConfirm
          id="schedule-confirmation"
          phrase={SCHEDULE_CONFIRMATION_PHRASE}
          value={confirmation}
          onChange={setConfirmation}
          error={error}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={
              !matchesConfirmationPhrase(
                confirmation,
                SCHEDULE_CONFIRMATION_PHRASE,
              ) || pending
            }
            onClick={submit}
          >
            {pending ? "Wird erstellt…" : "Spielplan erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
