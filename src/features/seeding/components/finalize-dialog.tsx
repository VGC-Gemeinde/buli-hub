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

// Type-to-confirm finalize. Controlled: the step bar's gated "Finalisieren"
// button opens it; the caller runs the finalize action and reports failure
// back (the server re-checks readiness regardless).
export function FinalizeDialog({
  season,
  onConfirm,
  open,
  onOpenChange,
}: {
  season: string;
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function change(next: boolean) {
    if (!next) {
      setConfirmation("");
      setError(null);
    }
    onOpenChange(next);
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
