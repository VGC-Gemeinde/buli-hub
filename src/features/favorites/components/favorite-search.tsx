"use client";

import { Search, Star } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { PickablePlayer } from "@/components/player-picker";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { cn } from "@/lib/utils";

// Long lists are searched, not scrolled.
const VISIBLE = 8;

// "Spieler hinzufügen": a search over the season's players that opens its
// results below the field (docs/plans/favorites.md). Favourites already on
// the list are shown with their star and cannot be picked again. Keyboard:
// arrows move, Enter adds, Escape closes.
export function FavoriteSearch({
  label,
  candidates,
  favoriteIds,
  onAdd,
  disabled = false,
}: {
  label: string;
  candidates: readonly PickablePlayer[];
  favoriteIds: ReadonlySet<string>;
  onAdd: (userId: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const shown = useMemo(() => {
    const needle = query.trim().replace(/^@/, "").toLocaleLowerCase("de");
    const hits = needle
      ? candidates.filter(
          (p) =>
            p.name.toLocaleLowerCase("de").includes(needle) ||
            (p.username ?? "").toLocaleLowerCase("de").includes(needle),
        )
      : candidates;
    // Not-yet favourites first: they are what the search is for.
    return [...hits]
      .sort(
        (a, b) =>
          Number(favoriteIds.has(a.userId)) - Number(favoriteIds.has(b.userId)),
      )
      .slice(0, VISIBLE);
  }, [candidates, favoriteIds, query]);
  const pickable = shown.filter((p) => !favoriteIds.has(p.userId));

  function add(userId: string) {
    onAdd(userId);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  return (
    <div className="relative w-full max-w-[420px]">
      <label htmlFor={inputId} className="mb-1.5 block font-semibold text-sm">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Name oder @handle"
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, pickable.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const pick = pickable[active];
              if (open && pick) {
                add(pick.userId);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-10 pl-9"
        />
      </div>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Spieler der Saison"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-20 flex max-h-[300px] flex-col gap-0.5 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
        >
          {shown.length === 0 ? (
            <p className="px-3 py-2.5 text-muted-foreground text-sm">
              Kein Spieler der laufenden Saison heißt so.
            </p>
          ) : (
            shown.map((player) => {
              const already = favoriteIds.has(player.userId);
              const highlighted = !already && pickable[active] === player;
              return (
                <button
                  key={player.userId}
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  disabled={already}
                  // Before the input's blur closes the list.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(player.userId)}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    already ? "cursor-default opacity-60" : "hover:bg-muted",
                    highlighted && "bg-muted",
                  )}
                >
                  <PlayerAvatar identity={player} size="size-[26px]" />
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate font-semibold text-sm">
                      {player.name}
                    </span>
                    {player.username && player.username !== player.name ? (
                      <span className="truncate text-[12.5px] text-muted-foreground">
                        @{player.username}
                      </span>
                    ) : null}
                  </span>
                  {already ? (
                    <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
                      <Star
                        aria-hidden
                        className="size-3 fill-brand-orange text-brand-orange"
                      />
                      Favorit
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
