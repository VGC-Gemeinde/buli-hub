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
import { completeSeason } from "../actions";

const PHRASE = "Saison abschließen";

// "Saison abschließen" after the final (docs/plans/relegation-and-playoffs.md):
// what still keeps it open, or the button. The dialog only asks for the
// phrase; the outcomes are on the page above.
export function CompleteSeasonPanel({
  blockers,
  completed,
}: {
  blockers: string[];
  completed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (completed) {
    return (
      <p className="rounded-xl border px-5 py-4 font-semibold text-[14px]">
        Die Saison ist abgeschlossen. Alle Ergebnisse sind endgültig.
      </p>
    );
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await completeSeason();
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border px-5 py-4">
      {blockers.length > 0 ? (
        <ul className="flex flex-col gap-1 text-[14px]">
          {blockers.map((blocker) => (
            <li key={blocker} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[12px]"
              >
                !
              </span>
              {blocker}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              setConfirmation("");
              setError(null);
            }
            setOpen(next);
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" disabled={blockers.length > 0}>
              Saison abschließen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Saison abschließen?</DialogTitle>
              <DialogDescription>
                Alle Ergebnisse der Saison werden endgültig, und Auf- und
                Abstieg werden bei den Spielern festgeschrieben. Das kann nicht
                rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <TypeToConfirm
              id="complete-season-confirmation"
              phrase={PHRASE}
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
                  !matchesConfirmationPhrase(confirmation, PHRASE) || pending
                }
                onClick={submit}
              >
                {pending ? "Wird abgeschlossen…" : "Abschließen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <span className="text-[13px] text-muted-foreground">
          Danach sind alle Ergebnisse der Saison endgültig.
        </span>
      </div>
    </div>
  );
}
