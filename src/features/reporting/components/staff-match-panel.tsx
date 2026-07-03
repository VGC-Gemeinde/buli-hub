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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Identity } from "@/features/season/dashboard";
import {
  awardDoubleLoss,
  awardFreeWin,
  confirmFreeWin,
  reopenMatch,
} from "../staff-actions";

// Role-gated staff controls on a match: confirm a pending free win, award a
// free win / double loss, or reopen a reported match. Staff do not enter normal
// results — players report those.
export function StaffMatchPanel({
  matchId,
  playerA,
  playerB,
  hasResult,
  isPendingFreeWin,
}: {
  matchId: string;
  playerA: Identity;
  playerB: Identity;
  hasResult: boolean;
  isPendingFreeWin: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Fehler");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <section className="mt-10 flex flex-col gap-4 rounded-xl border border-brand-blue/25 bg-brand-blue/[0.03] px-6 py-5">
      <div className="flex items-center gap-2.5">
        <div className="h-[9px] w-[18px] -skew-x-[18deg] bg-brand-blue dark:bg-white" />
        <h2 className="font-bold font-heading text-brand-blue text-lg uppercase tracking-[0.03em] dark:text-white">
          Staff-Aktionen
        </h2>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {isPendingFreeWin ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => confirmFreeWin(matchId))}
          >
            Freigewinn bestätigen
          </Button>
        ) : null}
        <AwardFreeWinDialog
          playerA={playerA}
          playerB={playerB}
          pending={pending}
          onAward={(winnerId, reason) =>
            run(() => awardFreeWin({ matchId, winnerId, reason }))
          }
        />
        <ConfirmDialog
          trigger="Doppelniederlage"
          title="Doppelniederlage vergeben?"
          body="Beide Spieler erhalten eine Niederlage, niemand einen Sieg. Ein bestehendes Ergebnis wird überschrieben."
          confirmLabel="Doppelniederlage vergeben"
          pending={pending}
          onConfirm={() => run(() => awardDoubleLoss({ matchId }))}
        />
        {hasResult ? (
          <ConfirmDialog
            trigger="Ergebnis zurücksetzen"
            title="Ergebnis zurücksetzen?"
            body="Das gemeldete Ergebnis wird gelöscht und das Match kann neu gemeldet werden."
            confirmLabel="Zurücksetzen"
            variant="destructive"
            pending={pending}
            onConfirm={() => run(() => reopenMatch(matchId))}
          />
        ) : null}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </section>
  );
}

function AwardFreeWinDialog({
  playerA,
  playerB,
  pending,
  onAward,
}: {
  playerA: Identity;
  playerB: Identity;
  pending: boolean;
  onAward: (winnerId: string, reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [reason, setReason] = useState("");
  const ready = winnerId !== "" && reason.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Freigewinn vergeben
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Freigewinn vergeben</DialogTitle>
          <DialogDescription>
            Wird sofort gewertet und überschreibt ein bestehendes Ergebnis.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Gewinner</Label>
            <Select value={winnerId} onValueChange={setWinnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Spieler wählen" />
              </SelectTrigger>
              <SelectContent>
                {[playerA, playerB].map((p) => (
                  <SelectItem key={p.userId} value={p.userId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Begründung</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Warum gibt es einen Freigewinn?"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!ready || pending}
            onClick={async () => {
              if (await onAward(winnerId, reason)) {
                setOpen(false);
              }
            }}
          >
            Vergeben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  variant,
  pending,
  onConfirm,
}: {
  trigger: string;
  title: string;
  body: string;
  confirmLabel: string;
  variant?: "destructive";
  pending: boolean;
  onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={async () => {
              if (await onConfirm()) {
                setOpen(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
