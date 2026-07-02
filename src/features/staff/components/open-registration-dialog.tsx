"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openRegistration } from "../actions";
import {
  matchesConfirmationPhrase,
  OPEN_CONFIRMATION_PHRASE,
} from "../registration-window";

export function OpenRegistrationDialog() {
  const [open, setOpen] = useState(false);
  const [closesAt, setClosesAt] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const canSubmit =
    closesAt !== "" && matchesConfirmationPhrase(confirmation) && !pending;

  async function submit() {
    setPending(true);
    setError(null);
    // datetime-local yields wall-clock without a zone; treat it as local.
    const result = await openRegistration({
      closesAt: new Date(closesAt).toISOString(),
      confirmation,
    });
    setPending(false);
    if (result.ok) {
      setOpen(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Anmeldung öffnen</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anmeldung öffnen</DialogTitle>
          <DialogDescription>
            Sobald geöffnet, ist die Anmeldung bis zum Enddatum aktiv und kann
            nicht wieder geschlossen werden. Die Anmeldung schließt automatisch
            zum gesetzten Zeitpunkt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="closes-at">Enddatum</Label>
            <Input
              id="closes-at"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmation">
              Tippe{" "}
              <span className="font-semibold">{OPEN_CONFIRMATION_PHRASE}</span>{" "}
              zur Bestätigung
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" disabled={!canSubmit} onClick={submit}>
            {pending ? "Wird geöffnet…" : "Anmeldung öffnen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
