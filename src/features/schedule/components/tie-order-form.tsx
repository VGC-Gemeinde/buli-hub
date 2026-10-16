"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Identity } from "@/features/season/dashboard";
import { setTieOrder } from "../actions";

// The order of a shared place of three or more players across a zone
// boundary, as the staff's off-hub tiebreaker tournament decided it
// (docs/plans/relegation-and-playoffs.md). Up/down buttons, a reason, save.
export function TieOrderForm({
  tieKey,
  players,
  placeLabels,
  initialReason,
}: {
  tieKey: string;
  // In the current order, best first.
  players: Identity[];
  // What each place means, best first ("Platz 1 · Relegation").
  placeLabels: string[];
  initialReason: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(players);
  const [reason, setReason] = useState(initialReason);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function move(index: number, delta: number) {
    const next = [...order];
    const target = index + delta;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function submit() {
    setPending(true);
    setError(null);
    const result = await setTieOrder({
      tieKey,
      order: order.map((player) => player.userId),
      reason,
    });
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y rounded-lg border">
        {order.map((player, index) => (
          <li
            key={player.userId}
            className="flex items-center gap-3 px-3 py-2 text-[14px]"
          >
            <span className="w-[150px] shrink-0 text-[12.5px] text-muted-foreground">
              {placeLabels[index]}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {player.name}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={`${player.name} nach oben`}
              disabled={index === 0 || pending}
              onClick={() => move(index, -1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={`${player.name} nach unten`}
              disabled={index === order.length - 1 || pending}
              onClick={() => move(index, 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`reason-${tieKey}`}>Begründung</Label>
        <Textarea
          id={`reason-${tieKey}`}
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={pending || reason.trim() === ""}
          onClick={submit}
        >
          {pending ? "Wird gespeichert…" : "Reihenfolge festlegen"}
        </Button>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    </div>
  );
}
