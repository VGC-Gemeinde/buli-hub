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
  DialogTrigger,
} from "@/components/ui/dialog";
import { matchesConfirmationPhrase } from "@/lib/confirm";

// Type-to-confirm finalize. Trigger is the toolbar's gated button; the caller
// runs the finalize action and reports failure back.
export function FinalizeDialog({
  ready,
  gateHint,
  season,
  onConfirm,
}: {
  ready: boolean;
  gateHint: string;
  season: string;
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
            Finalisieren…
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einteilung finalisieren?</DialogTitle>
          <DialogDescription>
            Die Einteilung für{" "}
            <span className="font-semibold text-foreground">{season}</span> wird
            finalisiert und kann danach nicht mehr geändert werden.
          </DialogDescription>
        </DialogHeader>
        <TypeToConfirm
          id="finalize-confirmation"
          phrase={season}
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
              !matchesConfirmationPhrase(confirmation, season) || pending
            }
            onClick={submit}
          >
            {pending ? "Wird finalisiert…" : "Finalisieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
