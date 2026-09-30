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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OfferReplacementDialog,
  type ReplacementOfferOptions,
} from "@/features/replacements/components/offer-dialog";
import { WithdrawOfferButton } from "@/features/replacements/components/replacement-status";
import type { ReplacementRow } from "@/features/replacements/queries";
import { dropPlayer, undropPlayer } from "../actions";
import type { DropCandidate, DropRow } from "../queries";

// The un-drop control, shared by the dashboard list and the profile staff
// panel. Nothing was destroyed by the drop, so no extra confirmation.
export function UndropButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function undrop() {
    setPending(true);
    setError(null);
    const result = await undropPlayer({ userId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={undrop}
      >
        {pending ? "Wird aufgehoben…" : "Drop aufheben"}
      </Button>
    </div>
  );
}

// What staff can still do about a drop: replace or un-drop it; with an open
// offer, withdraw that; once replaced, nothing (the slot is taken).
export function DropActions({
  drop,
  replacement,
  offerOptions,
  missedByRound,
}: {
  drop: Pick<DropRow, "identity" | "groupName">;
  replacement: ReplacementRow | null;
  offerOptions: ReplacementOfferOptions | null;
  missedByRound?: Record<number, number>;
}) {
  if (replacement?.acceptedAt) {
    return null;
  }
  if (replacement) {
    return <WithdrawOfferButton replacedUserId={drop.identity.userId} />;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {offerOptions ? (
        <OfferReplacementDialog
          replaced={drop.identity}
          groupName={drop.groupName}
          options={offerOptions}
          missedByRound={missedByRound}
        />
      ) : null}
      <UndropButton userId={drop.identity.userId} />
    </div>
  );
}

// The drop dialog: with `candidates` staff pick the player; with `fixed`
// (profile staff panel) the player is given and only reason + confirmation
// remain.
export function DropPlayerDialog({
  candidates = [],
  fixed,
  triggerSize = "default",
  quiet = false,
}: {
  candidates?: DropCandidate[];
  fixed?: DropCandidate;
  triggerSize?: "default" | "sm";
  // A ghost "Droppen" for long lists where every row carries it (the
  // Teilnehmer page); the full outline button elsewhere.
  quiet?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = fixed ?? candidates.find((c) => c.userId === userId) ?? null;
  const ready =
    selected !== null && reason.trim() !== "" && confirmation === selected.name;

  async function submit() {
    if (!selected) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await dropPlayer({ userId: selected.userId, reason });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setUserId("");
    setReason("");
    setConfirmation("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={quiet ? "ghost" : "outline"}
        size={triggerSize}
        className={quiet ? "text-muted-foreground" : undefined}
        onClick={() => setOpen(true)}
      >
        {quiet ? "Droppen" : "Spieler droppen"}
      </Button>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {fixed ? `${fixed.name} droppen` : "Spieler droppen"}
          </DialogTitle>
          <DialogDescription>
            {fixed ? `${fixed.name} (${fixed.groupName}): alle` : "Alle"}{" "}
            Matches des Spielers zählen ab sofort als Freewin (2:0) für die
            Gegner, auch bereits gespielte. Gespeicherte Ergebnisse und Replays
            bleiben als Historie erhalten; der Drop lässt sich aufheben.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {fixed ? null : (
            <div className="grid gap-2">
              <Label>Spieler</Label>
              <Select
                value={userId}
                onValueChange={(value) => {
                  setUserId(value);
                  setConfirmation("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Spieler wählen …" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.userId} value={candidate.userId}>
                      {candidate.name} · {candidate.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="drop-reason">
              Grund{" "}
              <span className="font-normal text-muted-foreground">
                (nur für den Staff sichtbar)
              </span>
            </Label>
            <Input
              id="drop-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              autoComplete="off"
            />
          </div>
          {selected ? (
            <TypeToConfirm
              id="drop-confirm"
              phrase={selected.name}
              value={confirmation}
              onChange={setConfirmation}
            />
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div>
            <Button
              type="button"
              variant="destructive"
              disabled={!ready || pending}
              onClick={submit}
            >
              {pending ? "Wird gedroppt…" : "Spieler droppen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
