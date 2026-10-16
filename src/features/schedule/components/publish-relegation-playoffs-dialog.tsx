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
import { publishRelegationPlayoffs } from "../actions";
import { PUBLISH_RELEGATION_PLAYOFFS_PHRASE } from "../relegation-playoffs-publish";
import { Fact } from "./deadline-rows";

// "Relegation und Playoffs veröffentlichen" (docs/plans/relegation-and-playoffs.md):
// the button says what staff want, the dialog leads with what it costs (the
// regular season's results become final), and the phrase to type names that
// cost. Same anatomy as "Pairings veröffentlichen".
export function PublishRelegationPlayoffsDialog({
  facts,
  triggerSize = "default",
}: {
  facts: { relegation: number; playoffs: number; tiebreakers: number };
  triggerSize?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmation("");
      setError(null);
    }
    setOpen(next);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await publishRelegationPlayoffs();
    setPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size={triggerSize}>
          Relegation und Playoffs veröffentlichen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Relegation und Playoffs veröffentlichen?</DialogTitle>
          <DialogDescription>
            Alle Ergebnisse der regulären Saison werden endgültig. Melden,
            Korrigieren, Anfechten und Drops sind danach nicht mehr möglich.
            Relegation, Playoffs und Tiebreaker werden für alle sichtbar, und
            die Spieler können ihre Matches melden. Das kann nicht rückgängig
            gemacht werden.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 rounded-lg bg-muted px-4 py-3 sm:grid-cols-3 sm:gap-y-4">
          <Fact
            label="Relegation"
            value={String(facts.relegation)}
            sub={facts.relegation === 1 ? "Paarung" : "Paarungen"}
          />
          <Fact
            label="Playoffs"
            value={String(facts.playoffs)}
            sub="im Bracket"
          />
          <Fact
            label="Tiebreaker"
            value={
              facts.tiebreakers === 0 ? "keine" : String(facts.tiebreakers)
            }
            sub="in Woche 1"
          />
        </div>

        <TypeToConfirm
          id="publish-relegation-playoffs-confirmation"
          phrase={PUBLISH_RELEGATION_PLAYOFFS_PHRASE}
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
                PUBLISH_RELEGATION_PLAYOFFS_PHRASE,
              ) || pending
            }
            onClick={submit}
          >
            {pending ? "Wird veröffentlicht…" : "Veröffentlichen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
