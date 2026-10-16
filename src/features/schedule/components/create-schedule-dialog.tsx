"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { matchdayName, SCHEDULE_CONFIRMATION_PHRASE } from "../spieltage";
import {
  DeadlineRows,
  dayCount,
  Fact,
  fmtDay,
  useDeadlines,
} from "./deadline-rows";

// "Spielplan erstellen": staff fix the whole season calendar in one terminal
// action. The facts strip and per-week durations keep the season-level
// consequences (last Spieltag, pause weeks) readable while editing; extending
// one deadline shifts — and flashes — every later week. Type-to-confirm
// commits.
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
  const editor = useDeadlines(defaultDeadlines);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      editor.reset();
      setConfirmation("");
      setError(null);
    }
    setOpen(next);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await createSchedule({ deadlines: editor.deadlines });
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const count = editor.deadlines.length;
  const lastDeadline = editor.deadlines[count - 1];
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
            label="Letzter Spieltag"
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
          <DeadlineRows
            start={seasonStart}
            editor={editor}
            name={(index) => matchdayName(index + 1)}
          />
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
