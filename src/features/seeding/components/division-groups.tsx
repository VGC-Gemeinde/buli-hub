"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import { generateGroups, moveToSubDivision } from "../actions";
import type { SeedingPlayer } from "../placement";
import { divisionName, subDivisionName } from "../seeding";

type SubDivision = { id: string; position: number };

function PlayerRow({
  player,
  tier,
  subDivisions,
  onMove,
}: {
  player: SeedingPlayer;
  tier: number;
  subDivisions: SubDivision[];
  onMove: (userId: string, subDivisionId: string) => void;
}) {
  const name = player.displayName ?? player.username ?? "Unbekannt";
  return (
    <li className="flex items-center gap-2">
      <Avatar className="size-6 shrink-0">
        {player.avatarUrl ? (
          <AvatarImage src={player.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      <Select
        value={player.subDivisionId ?? undefined}
        onValueChange={(value) => onMove(player.userId, value)}
      >
        <SelectTrigger size="sm" className="w-[110px] shrink-0">
          <SelectValue placeholder="Gruppe" />
        </SelectTrigger>
        <SelectContent>
          {subDivisions.map((sd) => (
            <SelectItem key={sd.id} value={sd.id}>
              {subDivisionName(tier, sd.position)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </li>
  );
}

export function DivisionGroups({
  division,
  players,
  subDivisions,
}: {
  division: { id: string; tier: number };
  players: SeedingPlayer[];
  subDivisions: SubDivision[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    const result = await generateGroups({ divisionId: division.id });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function move(userId: string, subDivisionId: string) {
    setError(null);
    const result = await moveToSubDivision({ userId, subDivisionId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const hasGroups = subDivisions.length > 0;
  const ungrouped = players.filter((p) => !p.subDivisionId);

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-heading font-bold text-brand-blue text-xl uppercase tracking-[0.02em] dark:text-white">
            {divisionName(division.tier)}
          </span>
          <span className="text-muted-foreground text-sm">
            {players.length} Spieler
          </span>
        </div>
        <Button
          type="button"
          variant={hasGroups ? "outline" : "default"}
          size="sm"
          disabled={pending || players.length === 0}
          onClick={generate}
        >
          {pending
            ? "Wird generiert…"
            : hasGroups
              ? "Neu generieren"
              : "Gruppen generieren"}
        </Button>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {hasGroups ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {subDivisions.map((sd) => {
            const groupPlayers = players.filter(
              (p) => p.subDivisionId === sd.id,
            );
            return (
              <div
                key={sd.id}
                className="flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-sm">
                    {subDivisionName(division.tier, sd.position)}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {groupPlayers.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {groupPlayers.map((player) => (
                    <PlayerRow
                      key={player.userId}
                      player={player}
                      tier={division.tier}
                      subDivisions={subDivisions}
                      onMove={move}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasGroups && ungrouped.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <span className="text-[13px] text-muted-foreground">
            Nicht in einer Gruppe
          </span>
          <ul className="flex flex-col gap-1.5">
            {ungrouped.map((player) => (
              <PlayerRow
                key={player.userId}
                player={player}
                tier={division.tier}
                subDivisions={subDivisions}
                onMove={move}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
