import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// A compact grid of players — avatar chip plus name, sorted alphabetically.
// Shared by the staff dashboard's Anmeldungen section and the player
// dashboard's Teilnehmerfeld, so the empty state is supplied by the caller.
export type RegisteredPlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export function PlayerGrid({
  players,
  empty,
}: {
  players: RegisteredPlayer[];
  empty: ReactNode;
}) {
  if (players.length === 0) {
    return empty;
  }

  const sorted = players.toSorted((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
      {sorted.map((player) => (
        <div
          key={player.id}
          className="flex h-9 min-w-0 items-center gap-2 rounded-lg border pr-2.5 pl-1"
        >
          <Avatar className="size-6">
            {player.avatarUrl ? (
              <AvatarImage src={player.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="font-semibold text-[10px] text-foreground">
              {player.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium text-sm">{player.name}</span>
        </div>
      ))}
    </div>
  );
}
