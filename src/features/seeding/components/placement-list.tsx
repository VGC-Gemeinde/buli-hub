"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_LABELS } from "@/features/registration/registration";
import { assignToDivision } from "../actions";
import { type SeedingPlayer, seedingCaveats } from "../placement";
import { divisionName } from "../seeding";

const NONE = "__none__";

function signalLine(player: SeedingPlayer): string {
  const parts = [PLATFORM_LABELS[player.platform]];
  if (player.status === "new" && player.skillSelfRating !== null) {
    parts.push(`Selbsteinschätzung ${player.skillSelfRating}/10`);
  }
  if (player.status === "returning" && player.prevDivision) {
    parts.push(
      `zuletzt ${player.prevDivision}, ${player.prevPlacement ?? "?"} (${player.prevSeason ?? "?"})`,
    );
  }
  return parts.join(" · ");
}

export function PlacementList({
  players,
  divisions,
}: {
  players: SeedingPlayer[];
  divisions: { id: string; tier: number }[];
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    Object.fromEntries(players.map((p) => [p.userId, p.divisionId])),
  );
  const [error, setError] = useState<string | null>(null);

  async function change(userId: string, value: string) {
    const divisionId = value === NONE ? null : value;
    const previous = assignments[userId] ?? null;
    setAssignments((prev) => ({ ...prev, [userId]: divisionId }));
    setError(null);
    const result = await assignToDivision({ userId, divisionId });
    if (!result.ok) {
      setAssignments((prev) => ({ ...prev, [userId]: previous }));
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const assigned = Object.values(assignments).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {assigned} von {players.length} zugeordnet
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const name = player.displayName ?? player.username ?? "Unbekannt";
          const caveats = seedingCaveats(player);
          return (
            <li
              key={player.userId}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <Avatar className="size-8 shrink-0">
                {player.avatarUrl ? (
                  <AvatarImage src={player.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="text-xs">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-sm">{name}</span>
                  <Badge variant="secondary">
                    {player.status === "returning" ? "Rückkehrer" : "Neu"}
                  </Badge>
                  {caveats.map((caveat) => (
                    <Badge key={caveat.kind} variant="outline">
                      {caveat.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {signalLine(player)}
                </p>
              </div>
              <Select
                value={assignments[player.userId] ?? NONE}
                onValueChange={(value) => change(player.userId, value)}
              >
                <SelectTrigger className="w-[150px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Keine Division</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {divisionName(division.tier)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
