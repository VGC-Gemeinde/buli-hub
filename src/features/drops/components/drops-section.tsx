"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionHeader } from "@/components/section-header";
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
import { PlayerLink } from "@/features/player-profile/components/player-link";
import {
  OfferReplacementDialog,
  type ReplacementOfferOptions,
} from "@/features/replacements/components/offer-dialog";
import {
  ReplacementStatusLine,
  WithdrawOfferButton,
} from "@/features/replacements/components/replacement-status";
import type { ReplacementRow } from "@/features/replacements/queries";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { formatGermanDateTime } from "@/lib/german-time";
import { dropPlayer, undropPlayer } from "../actions";
import type { DropCandidate, DropRow } from "../queries";

function ddMM(date: Date): string {
  return formatGermanDateTime(date, {
    day: "2-digit",
    month: "2-digit",
  });
}

// The staff dashboard's Drops section: the list of dropped players (with
// un-drop) and the drop dialog. A drop never destroys data — it flips the
// counting override — but it changes every table immediately, hence the
// type-to-confirm.
// A dropped player can be un-dropped or replaced (docs/plans/player-
// replacement.md); `replacements` carries the season's offers and, while
// the season runs, the offer options.
export function DropsSection({
  drops,
  candidates,
  replacements = [],
  offerOptions = null,
  missedByReplaced = {},
}: {
  drops: DropRow[];
  candidates: DropCandidate[];
  replacements?: ReplacementRow[];
  offerOptions?: ReplacementOfferOptions | null;
  // Per dropped player: the losses a replacement would start with, per
  // offered entry round.
  missedByReplaced?: Record<string, Record<number, number>>;
}) {
  return (
    <section className="flex flex-col gap-4">
      {/* The dialog trigger rides in `meta` (like the membership list's
          refresh button) so the header keeps its full-width divider. */}
      <SectionHeader
        tickColor="navy"
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            Alle Matches zählen als Freewin für die Gegner
            <DropPlayerDialog candidates={candidates} />
          </span>
        }
      >
        Drops
      </SectionHeader>
      {drops.length === 0 ? (
        <p className="rounded-lg border px-4 py-4 text-center text-muted-foreground text-sm">
          Kein Spieler gedroppt.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {drops.map((drop) => (
            <DropListRow
              key={drop.identity.userId}
              drop={drop}
              replacement={
                replacements.find(
                  (r) => r.replaced.userId === drop.identity.userId,
                ) ?? null
              }
              offerOptions={offerOptions}
              missedByRound={missedByReplaced[drop.identity.userId]}
            />
          ))}
        </div>
      )}
    </section>
  );
}

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

function DropListRow({
  drop,
  replacement,
  offerOptions,
  missedByRound,
}: {
  drop: DropRow;
  replacement: ReplacementRow | null;
  offerOptions: ReplacementOfferOptions | null;
  missedByRound?: Record<number, number>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PlayerAvatar identity={drop.identity} size="size-[26px]" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">
            <PlayerLink
              userId={drop.identity.userId}
              name={drop.identity.name}
            />
            <span className="text-muted-foreground">
              {" "}
              · {drop.groupName} · seit {ddMM(drop.droppedAt)}
            </span>
          </span>
          {drop.reason ? (
            <span className="truncate text-[13px] text-muted-foreground">
              "{drop.reason}"
            </span>
          ) : null}
          {replacement ? (
            <ReplacementStatusLine
              replacement={replacement.replacement}
              entryRound={replacement.entryRound}
              acceptedAt={replacement.acceptedAt}
              offeredAt={replacement.offeredAt}
            />
          ) : null}
        </div>
      </div>
      <DropActions
        drop={drop}
        replacement={replacement}
        offerOptions={offerOptions}
        missedByRound={missedByRound}
      />
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
}: {
  candidates?: DropCandidate[];
  fixed?: DropCandidate;
  triggerSize?: "default" | "sm";
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
        variant="outline"
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        Spieler droppen
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
