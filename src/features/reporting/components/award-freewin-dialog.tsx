"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { Identity } from "@/features/season/dashboard";
import { cn } from "@/lib/utils";
import { awardFreeWin } from "../staff-actions";

// Shared staff „award a free win" dialog — opened from the match page and from
// overdue rows on the dashboard. Picks a winner (player cards), takes a reason
// (shown to both players), and awards immediately.
export function AwardFreewinDialog({
  matchId,
  round,
  groupName,
  playerA,
  playerB,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "default",
}: {
  matchId: string;
  round: number;
  groupName: string;
  playerA: Identity;
  playerB: Identity;
  triggerLabel: string;
  triggerVariant?: "outline" | "default";
  triggerSize?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = winnerId !== "" && reason.trim() !== "";
  const winnerName =
    winnerId === playerA.userId
      ? playerA.name
      : winnerId === playerB.userId
        ? playerB.name
        : null;

  async function submit() {
    setPending(true);
    setError(null);
    const result = await awardFreeWin({ matchId, winnerId, reason });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setWinnerId("");
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Freewin vergeben</DialogTitle>
          <DialogDescription>
            {playerA.name} vs. {playerB.name} · Spieltag {round} · {groupName}.
            Wird sofort gewertet und überschreibt ein bestehendes Ergebnis.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Gewinner</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {[playerA, playerB].map((p) => (
                // biome-ignore lint/a11y/noStaticElementInteractions: pick card
                <button
                  key={p.userId}
                  type="button"
                  onClick={() => setWinnerId(p.userId)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg p-3 text-left",
                    winnerId === p.userId
                      ? "border-2 border-brand-orange"
                      : "border bg-background",
                  )}
                >
                  <Avatar className="size-[30px]">
                    {p.avatarUrl ? (
                      <AvatarImage src={p.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[11px]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate font-medium text-sm">
                    {p.name}
                  </span>
                  {winnerId === p.userId ? (
                    <span className="font-bold text-brand-orange">✓</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Begründung</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`z. B. ${playerB.name} hat auf keine Terminanfrage reagiert.`}
            />
            <p className="text-[12.5px] text-muted-foreground">
              Sichtbar für beide Spieler auf der Match-Seite.
            </p>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button type="button" disabled={!ready || pending} onClick={submit}>
            {pending
              ? "Wird vergeben…"
              : `Freewin an ${winnerName ?? "…"} vergeben`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
