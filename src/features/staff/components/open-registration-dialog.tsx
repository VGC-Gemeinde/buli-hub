"use client";

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
} from "@/components/ui/dialog";
import { matchesConfirmationPhrase } from "@/lib/confirm";
import { formatGermanDateTime } from "@/lib/german-time";
import { openRegistration } from "../actions";
import { seasonName } from "../registration-window";

// Confirm-only: the season number + end date are chosen on the card
// (OpenRegistrationForm) and passed in here. The dialog only confirms.
export function OpenRegistrationDialog({
  open,
  onOpenChange,
  seasonNumber,
  closesAtLocal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonNumber: string;
  closesAtLocal: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Type-to-confirm phrase names what is opened: „Saison 1" (design §10) —
  // shorter and clearer than the action name. Purely a client-side gate; the
  // server action re-checks role + state.
  const confirmationPhrase = seasonName(Number(seasonNumber));

  const closesAtLabel = closesAtLocal
    ? formatGermanDateTime(new Date(closesAtLocal), {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmation("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await openRegistration({
      closesAt: new Date(closesAtLocal).toISOString(),
      seasonNumber,
    });
    setPending(false);
    if (result.ok) {
      handleOpenChange(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anmeldung öffnen?</DialogTitle>
          <DialogDescription>
            Die Anmeldung für{" "}
            <span className="font-semibold text-foreground">
              {seasonName(Number(seasonNumber))}
            </span>{" "}
            öffnet sofort und schließt automatisch am{" "}
            <span className="font-semibold text-foreground">
              {closesAtLabel}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <TypeToConfirm
          id="confirmation"
          phrase={confirmationPhrase}
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
              !matchesConfirmationPhrase(confirmation, confirmationPhrase) ||
              pending
            }
            onClick={submit}
          >
            {pending ? "Wird geöffnet…" : "Anmeldung öffnen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
