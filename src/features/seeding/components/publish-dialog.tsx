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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  matchesConfirmationPhrase,
  SEASON_NAME,
} from "@/features/staff/registration-window";

// Type-to-confirm publish. Trigger is the toolbar's gated button; the caller
// runs the publish action and reports failure back.
export function PublishDialog({
  ready,
  gateHint,
  onConfirm,
}: {
  ready: boolean;
  gateHint: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function change(next: boolean) {
    if (!next) {
      setConfirmation("");
      setError(null);
    }
    setOpen(next);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await onConfirm();
    setPending(false);
    if (result.ok) {
      change(false);
    } else {
      setError(result.error ?? "Fehler");
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        <div title={gateHint}>
          <Button type="button" disabled={!ready}>
            Veröffentlichen
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einteilung veröffentlichen?</DialogTitle>
          <DialogDescription>
            Die Einteilung für{" "}
            <span className="font-semibold text-foreground">{SEASON_NAME}</span>{" "}
            wird veröffentlicht und kann danach nicht mehr geändert werden.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="publish-confirmation">
            Gib{" "}
            <span className="font-semibold text-brand-blue dark:text-white">
              {SEASON_NAME}
            </span>{" "}
            ein, um zu bestätigen
          </Label>
          <Input
            id="publish-confirmation"
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
            {pending ? "Wird veröffentlicht…" : "Veröffentlichen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
