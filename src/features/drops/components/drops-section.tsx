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
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { dropPlayer, undropPlayer } from "../actions";
import type { DropCandidate, DropRow } from "../queries";

function ddMM(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

// The staff dashboard's Drops section: the list of dropped players (with
// un-drop) and the drop dialog. A drop never destroys data — it flips the
// counting override — but it changes every table immediately, hence the
// type-to-confirm.
export function DropsSection({
  drops,
  candidates,
}: {
  drops: DropRow[];
  candidates: DropCandidate[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader
          tickColor="navy"
          meta="Alle Matches zählen als Freewin für die Gegner"
        >
          Drops
        </SectionHeader>
        <DropPlayerDialog candidates={candidates} />
      </div>
      {drops.length === 0 ? (
        <p className="rounded-lg border px-4 py-4 text-center text-muted-foreground text-sm">
          Kein Spieler gedroppt.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {drops.map((drop) => (
            <DropListRow key={drop.identity.userId} drop={drop} />
          ))}
        </div>
      )}
    </section>
  );
}

function DropListRow({ drop }: { drop: DropRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function undrop() {
    setPending(true);
    setError(null);
    const result = await undropPlayer({ userId: drop.identity.userId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PlayerAvatar identity={drop.identity} size="size-[26px]" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">
            {drop.identity.name}
            <span className="text-muted-foreground">
              {" "}
              · {drop.groupName} · seit {ddMM(drop.droppedAt)}
            </span>
          </span>
          {drop.reason ? (
            <span className="truncate text-[13px] text-muted-foreground">
              „{drop.reason}"
            </span>
          ) : null}
        </div>
      </div>
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
    </div>
  );
}

function DropPlayerDialog({ candidates }: { candidates: DropCandidate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = candidates.find((c) => c.userId === userId) ?? null;
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
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Spieler droppen
      </Button>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Spieler droppen</DialogTitle>
          <DialogDescription>
            Alle Matches des Spielers zählen ab sofort als Freewin (2:0) für die
            Gegner — auch bereits gespielte. Gespeicherte Ergebnisse und Replays
            bleiben als Historie erhalten; der Drop lässt sich aufheben.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
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
                    {candidate.name} — {candidate.groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
