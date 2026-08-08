"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Identity } from "@/features/season/dashboard";
import {
  draftToReport,
  emptyDraft,
  isDraftComplete,
  type NormalEditorInitial,
} from "../result-draft";
import { editResult } from "../staff-actions";
import { ResultFields } from "./result-fields";

// Neutral (player A vs player B), pre-filled editor for a NORMAL result. Staff
// change game winners / platform / replays / team sheets and save via
// editResult. Free wins / double losses are handled by the panel's award
// buttons; players still do the initial submission. On a disputed match this
// editor is not offered — the correction happens inside the decision dialog.
export function StaffResultEditor({
  matchId,
  playerA,
  playerB,
  initial,
}: {
  matchId: string;
  playerA: Identity;
  playerB: Identity;
  initial: NormalEditorInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await editResult({ matchId, report: draftToReport(draft) });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Bearbeiten
      </Button>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ergebnis bearbeiten</DialogTitle>
          <DialogDescription>
            {playerA.name} vs. {playerB.name}. Überschreibt das gemeldete
            Ergebnis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <ResultFields
            draft={draft}
            onChange={setDraft}
            playerA={playerA}
            playerB={playerB}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!isDraftComplete(draft) || pending}
            onClick={submit}
          >
            {pending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
