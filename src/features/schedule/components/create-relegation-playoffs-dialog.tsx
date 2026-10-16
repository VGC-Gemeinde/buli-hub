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
import { createRelegationPlayoffsSchedule } from "../actions";
import {
  RELEGATION_PLAYOFFS_SCHEDULE_PHRASE,
  relegationPlayoffsWeekName,
} from "../relegation-playoffs";
import { dayAfter } from "../spieltage";
import { DeadlineRows, Fact, fmtDay, useDeadlines } from "./deadline-rows";

// "Spielplan für Relegation und Playoffs erstellen"
// (docs/plans/relegation-and-playoffs.md): the same calendar editor as the
// season's schedule, for the weeks after the last Spieltag. Terminal; the
// matches it creates stay with staff until the pairings are published.
export function CreateRelegationPlayoffsDialog({
  lastSpieltagEnd,
  defaultDeadlines,
  weekContents,
  relegationMatches,
  playoffMatches,
  triggerSize = "default",
}: {
  // Deadline of the last regular Spieltag; week 1 starts the day after.
  lastSpieltagEnd: string;
  defaultDeadlines: string[];
  // What each week holds ("Relegation · Viertelfinale").
  weekContents: string[];
  relegationMatches: number;
  playoffMatches: number;
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
    const result = await createRelegationPlayoffsSchedule({
      deadlines: editor.deadlines,
    });
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const start = dayAfter(lastSpieltagEnd);
  const weeks = editor.deadlines.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size={triggerSize}>
          Spielplan erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            Spielplan für Relegation und Playoffs erstellen?
          </DialogTitle>
          <DialogDescription>
            Die Wochen nach dem letzten Spieltag und alle Matches von Relegation
            und Playoffs werden angelegt. Wer sie spielt, steht erst mit der
            Veröffentlichung fest, bis dahin sehen nur Staff sie. Die Termine
            lassen sich danach nicht mehr ändern.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 rounded-lg bg-muted px-4 py-3 sm:grid-cols-[1fr_1fr_1.25fr] sm:gap-y-4">
          <Fact
            label="Wochen"
            value={String(weeks)}
            sub={`ab ${fmtDay(start)}`}
          />
          <Fact
            label="Matches"
            value={String(relegationMatches + playoffMatches)}
            sub={`Relegation ${relegationMatches} · Playoffs ${playoffMatches}`}
          />
          <Fact
            label="Letzte Woche"
            value={fmtDay(editor.deadlines[weeks - 1])}
            sub={weekContents[weeks - 1] ?? ""}
          />
        </div>

        <DeadlineRows
          start={start}
          editor={editor}
          name={(index) => relegationPlayoffsWeekName(index + 1)}
        />
        <ul className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
          {weekContents.map((content, index) => (
            <li key={relegationPlayoffsWeekName(index + 1)}>
              <span className="font-semibold text-foreground">
                {relegationPlayoffsWeekName(index + 1)}
              </span>{" "}
              · {content}
            </li>
          ))}
        </ul>

        <TypeToConfirm
          id="relegation-playoffs-schedule-confirmation"
          phrase={RELEGATION_PLAYOFFS_SCHEDULE_PHRASE}
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
                RELEGATION_PLAYOFFS_SCHEDULE_PHRASE,
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
