"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TypeToConfirm } from "@/components/type-to-confirm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Identity } from "@/features/season/dashboard";
import { matchesConfirmationPhrase } from "@/lib/confirm";
import { lateDropPlayer, undoLateDrop } from "../actions";

// Drops on a tiebreaker, Relegation or playoff match page, for staff
// (docs/plans/relegation-and-playoffs.md): a player who stops playing loses
// every open match of theirs from here on; played ones and the regular table
// stay. Each player can be dropped (with a reason and their name typed), or
// a drop taken back.
export function LateDropPanel({
  players,
  lateDroppedIds,
  open,
}: {
  players: [Identity, Identity];
  lateDroppedIds: string[];
  // The match has no result yet: dropping decides it.
  open: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Identity | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(act: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const result = await act();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Fehler");
      return;
    }
    setSelected(null);
    setReason("");
    setConfirmation("");
    router.refresh();
  }

  const opponentOf = (player: Identity) =>
    players[0].userId === player.userId ? players[1] : players[0];

  return (
    <section className="mt-9 flex flex-col gap-3 rounded-xl border px-6 py-5">
      <span className="font-semibold text-[12px] text-muted-foreground uppercase tracking-[0.12em]">
        Drop
      </span>
      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const dropped = lateDroppedIds.includes(player.userId);
          return (
            <li
              key={player.userId}
              className="flex flex-wrap items-center gap-x-3 gap-y-2"
            >
              <span className="font-semibold text-[14px]">{player.name}</span>
              {dropped ? (
                <>
                  <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-semibold text-[11px] text-destructive uppercase tracking-[0.08em]">
                    Gedroppt
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="sm:ml-auto"
                    disabled={pending}
                    onClick={() =>
                      run(() => undoLateDrop({ userId: player.userId }))
                    }
                  >
                    Drop zurücknehmen
                  </Button>
                </>
              ) : open ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive sm:ml-auto"
                  disabled={pending}
                  onClick={() => {
                    setSelected(player);
                    setConfirmation("");
                    setError(null);
                  }}
                >
                  Droppen
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {selected ? (
        <div className="flex flex-col gap-3 rounded-lg bg-muted px-4 py-3">
          <p className="text-[13.5px]">
            {opponentOf(selected).name} gewinnt kampflos. Alle offenen Matches
            von {selected.name} in Tiebreaker, Relegation und Playoffs zählen
            für den Gegner. Gespielte Matches und die Tabelle bleiben.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="late-drop-reason">Begründung</Label>
            <Textarea
              id="late-drop-reason"
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <TypeToConfirm
            id="late-drop-confirmation"
            phrase={selected.name}
            value={confirmation}
            onChange={setConfirmation}
            error={null}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={
                pending ||
                reason.trim() === "" ||
                !matchesConfirmationPhrase(confirmation, selected.name)
              }
              onClick={() =>
                run(() => lateDropPlayer({ userId: selected.userId, reason }))
              }
            >
              Droppen
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelected(null)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </section>
  );
}
