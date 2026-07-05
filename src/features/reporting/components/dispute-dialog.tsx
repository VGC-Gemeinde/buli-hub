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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { openDispute } from "../dispute-actions";

// A participant contests a recorded result. The result keeps counting until
// staff act — opening only flags it for review.
export function DisputeDialog({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await openDispute({ matchId, reason });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className="border-destructive/35 text-destructive"
        onClick={() => setOpen(true)}
      >
        Ergebnis anfechten
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ergebnis anfechten</DialogTitle>
          <DialogDescription>
            Ein Staff-Mitglied prüft die Meldung. Das Ergebnis zählt vorerst
            weiter, bis der Fall entschieden ist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Was stimmt nicht?</Label>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Beschreibe, was am gemeldeten Ergebnis falsch ist."
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={reason.trim() === "" || pending}
            onClick={submit}
          >
            {pending ? "Wird gesendet…" : "Anfechtung senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
