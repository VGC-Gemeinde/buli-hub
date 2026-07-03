"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { createSchedule } from "../actions";
import {
  matchdayName,
  SCHEDULE_CONFIRMATION_PHRASE,
  shiftDeadlineFrom,
  windowsFromDeadlines,
} from "../spieltage";

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

// „Spielplan erstellen": staff review the weekly deadlines (pre-filled Sundays,
// extendable — a longer week pushes the rest back) and type-to-confirm. Terminal
// — generating starts the regular season and cannot be undone.
export function CreateScheduleDialog({
  seasonStart,
  defaultDeadlines,
}: {
  seasonStart: string;
  defaultDeadlines: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deadlines, setDeadlines] = useState(defaultDeadlines);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function change(next: boolean) {
    if (!next) {
      setDeadlines(defaultDeadlines);
      setConfirmation("");
      setError(null);
    }
    setOpen(next);
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
    }),
  );

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        <Button type="button">Spielplan erstellen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spielplan erstellen?</DialogTitle>
          <DialogDescription>
            Lege die Deadline jeder Spielwoche fest — ein längerer Abstand
            schiebt alle folgenden Wochen mit. Beim Bestätigen wird der
            Spielplan (einfaches Rundenturnier) erzeugt und die reguläre Saison
            startet. Das kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[40vh] gap-2 overflow-y-auto py-1">
          {rows.map((row) => (
            <div key={row.round} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-medium text-sm">
                {matchdayName(row.round)}
              </span>
              <span className="shrink-0 text-muted-foreground text-sm">
                ab {formatDay(row.start)} —
              </span>
              <DatePicker
                value={row.end}
                disabledBefore={row.start}
                onChange={(date) =>
                  setDeadlines(
                    shiftDeadlineFrom(deadlines, row.round - 1, date),
                  )
                }
                className="w-40"
              />
            </div>
          ))}
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
