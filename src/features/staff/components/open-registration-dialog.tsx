"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openRegistration } from "../actions";
import { matchesConfirmationPhrase, SEASON_NAME } from "../registration-window";

// Confirm-only: the end date is chosen on the card (OpenRegistrationForm) and
// passed in here as a datetime-local string. The dialog only confirms.
export function OpenRegistrationDialog({
  open,
  onOpenChange,
  closesAtLocal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closesAtLocal: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const closesAtLabel = closesAtLocal
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(closesAtLocal))
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
      confirmation,
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
            <span className="font-semibold text-foreground">{SEASON_NAME}</span>{" "}
            öffnet sofort und schließt automatisch am{" "}
            <span className="font-semibold text-foreground">
              {closesAtLabel}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="confirmation">
            Gib{" "}
            <span className="font-semibold text-brand-blue dark:text-white">
              {SEASON_NAME}
            </span>{" "}
            ein, um zu bestätigen
          </Label>
          <Input
            id="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={SEASON_NAME}
            autoComplete="off"
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
            disabled={!matchesConfirmationPhrase(confirmation) || pending}
            onClick={submit}
          >
            {pending ? "Wird geöffnet…" : "Anmeldung öffnen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
