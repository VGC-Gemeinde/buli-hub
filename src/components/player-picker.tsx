"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { hoverRow } from "@/lib/emphasis";
import { cn } from "@/lib/utils";

export type PickablePlayer = {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
};

// Long lists are searched, not scrolled: the picker shows this many matches.
const VISIBLE = 60;

// A searchable single-choice list of hub users (name or Discord name), for
// dialogs that pick one person out of everyone who ever signed in: the
// replacement offer and the Banliste. The list height is the caller's
// (`listClassName`), since the dialogs lay it out differently.
export function PlayerPicker({
  players,
  selectedId,
  onSelect,
  emptyText,
  listClassName,
}: {
  players: readonly PickablePlayer[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
  emptyText: string;
  listClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    const all = needle
      ? players.filter(
          (p) =>
            p.name.toLocaleLowerCase("de").includes(needle) ||
            (p.username ?? "").toLocaleLowerCase("de").includes(needle),
        )
      : players;
    return { shown: all.slice(0, VISIBLE), total: all.length };
  }, [players, query]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Spieler suchen"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name oder Discord-Name suchen"
            autoComplete="off"
            className="h-10 pl-9"
          />
        </div>
        <span className="shrink-0 text-[12.5px] text-muted-foreground tabular-nums">
          {matches.total === players.length
            ? `${players.length} verfügbar`
            : `${matches.total} von ${players.length}`}
        </span>
      </div>
      <div
        role="listbox"
        aria-label="Spieler"
        className={cn(
          "flex flex-col gap-1 overflow-y-auto rounded-lg border p-1.5",
          listClassName,
        )}
      >
        {matches.shown.length === 0 ? (
          <p className="m-auto max-w-[300px] px-3 text-center text-muted-foreground text-sm leading-relaxed">
            {emptyText}
          </p>
        ) : (
          matches.shown.map((player) => {
            const active = player.userId === selectedId;
            return (
              <button
                key={player.userId}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(player.userId)}
                className={cn(
                  "flex min-w-0 shrink-0 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  hoverRow,
                  active &&
                    "border-brand-orange bg-brand-orange/8 hover:bg-brand-orange/8",
                )}
              >
                <PlayerAvatar identity={player} size="size-8" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-[14.5px]">
                    {player.name}
                  </span>
                  {player.username && player.username !== player.name ? (
                    <span className="truncate text-[12.5px] text-muted-foreground">
                      @{player.username}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <span className="shrink-0 font-semibold text-[11px] text-brand-orange uppercase tracking-[0.1em]">
                    Gewählt
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
      {matches.total > matches.shown.length ? (
        <p className="text-[12.5px] text-muted-foreground">
          {matches.total - matches.shown.length} weitere. Such nach dem Namen,
          um sie zu finden.
        </p>
      ) : null}
    </div>
  );
}
