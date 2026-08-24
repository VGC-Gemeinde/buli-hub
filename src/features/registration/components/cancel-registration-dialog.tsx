"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TypeToConfirm } from "@/components/type-to-confirm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelRegistration } from "../staff-actions";

export type CancelCandidate = { userId: string; name: string };

// The staff cancel dialog, always for a given player — it opens from a
// membership-list row or the profile staff panel, so a picker would only
// duplicate the list around it. Unlike a drop, a cancel destroys the
// registration answers for good, hence type-to-confirm and no undo.
export function CancelRegistrationDialog({
  seasonName,
  player,
  triggerSize = "default",
}: {
  seasonName: string;
  player: CancelCandidate;
  triggerSize?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = confirmation === player.name;

  async function submit() {
    setPending(true);
    setError(null);
    const result = await cancelRegistration({ userId: player.userId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setConfirmation("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        Anmeldung stornieren
      </Button>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{player.name}: Anmeldung stornieren</DialogTitle>
          <DialogDescription>
            Die Anmeldung von {player.name} für {seasonName} wird endgültig
            gelöscht, ebenso die Regelwerk-Bestätigung und eine eventuelle
            Platzierung in der Einteilung. Das lässt sich nicht rückgängig
            machen. Erneut anmelden kann sich der Spieler nur, wenn die
            Anmeldung wieder geöffnet wird.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <TypeToConfirm
            id="cancel-registration-confirm"
            phrase={player.name}
            value={confirmation}
            onChange={setConfirmation}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div>
            <Button
              type="button"
              variant="destructive"
              disabled={!ready || pending}
              onClick={submit}
            >
              {pending ? "Wird storniert…" : "Endgültig stornieren"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
