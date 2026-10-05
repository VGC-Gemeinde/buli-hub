"use client";

import { Star } from "lucide-react";
import { PlayerLink } from "@/features/player-profile/components/player-link";
import { PlayerAvatar } from "@/features/season/components/player-avatar";
import { SpoilerPill } from "@/features/spoilers/components/spoiler-score";
import { cn } from "@/lib/utils";
import {
  currentWeekCell,
  type FavoritePlayer,
  type FormCell,
  formCellCovered,
} from "../favorites";

const COVER_TITLE =
  "Verdeckt, bis das Ergebnis dieses Spieltags offen ist. Antippen zum Aufdecken";

// "Deine Spieler": every favourite with place, record and form, in the
// standings table's anatomy (docs/plans/favorites.md). The running week's
// result is covered by the match row's own rule, and Platz and Bilanz with
// it, since both count that result; one reveal opens all of them and the
// row above. The star removes a favourite; the row stays, greyed out, until
// the next load, and a second click restores it.
export function FavoritesTable({
  players,
  removedIds,
  currentRound,
  meId,
  spoilersOff,
  revealed,
  onReveal,
  onToggle,
}: {
  players: FavoritePlayer[];
  removedIds: ReadonlySet<string>;
  currentRound: number | null;
  meId: string;
  spoilersOff: boolean;
  revealed: ReadonlySet<string>;
  onReveal: (matchId: string) => void;
  onToggle: (userId: string) => void;
}) {
  const context = { currentRound, meId, spoilersOff, revealed };
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-separate border-spacing-0 text-left [&_tr:last-child_td]:border-b-0">
        <thead>
          <tr className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
            <th className="w-10 border-b bg-muted/50 py-2.5 pl-2 sm:w-11 sm:pl-3">
              <span className="sr-only">Favorit</span>
            </th>
            <th className="border-b bg-muted/50 py-2.5 pr-3 pl-1 font-semibold">
              Spieler
            </th>
            <th className="hidden border-b bg-muted/50 px-3 py-2.5 font-semibold sm:table-cell">
              Gruppe
            </th>
            <th className="hidden border-b bg-muted/50 px-3 py-2.5 text-right font-semibold sm:table-cell">
              Pl.
            </th>
            <th className="border-b bg-muted/50 px-2 py-2.5 text-right font-semibold sm:px-3">
              Bilanz
            </th>
            <th className="border-b bg-muted/50 py-2.5 pr-3 pl-2 font-semibold sm:pl-4">
              Form
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const removed = removedIds.has(player.userId);
            const now = currentWeekCell(player, currentRound);
            const statsCovered = now !== null && formCellCovered(now, context);
            const dim = removed && "opacity-40";
            return (
              <tr key={player.userId}>
                <td className="border-b py-2 pl-2 sm:pl-3">
                  <button
                    type="button"
                    aria-pressed={!removed}
                    title={
                      removed
                        ? "Wieder als Favorit merken"
                        : "Aus Favoriten entfernen"
                    }
                    aria-label={
                      removed
                        ? `${player.name} wieder als Favorit merken`
                        : `${player.name} aus Favoriten entfernen`
                    }
                    onClick={() => onToggle(player.userId)}
                    className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Star
                      aria-hidden
                      className={cn(
                        "size-[17px]",
                        removed
                          ? "text-muted-foreground"
                          : "fill-brand-orange text-brand-orange",
                      )}
                    />
                  </button>
                </td>
                <td className={cn("border-b py-2 pr-3 pl-1", dim)}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="hidden sm:inline-flex">
                      <PlayerAvatar identity={player} size="size-[26px]" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <PlayerLink
                        userId={player.userId}
                        name={player.name}
                        className="truncate font-semibold text-[14.5px]"
                      />
                      {/* On a phone Gruppe and Platz fold into this line. */}
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground sm:hidden">
                        {player.groupName} · Platz{" "}
                        {statsCovered && now ? (
                          <SpoilerPill
                            title={COVER_TITLE}
                            ariaLabel="Platz aufdecken"
                            onReveal={() => onReveal(now.matchId)}
                            className="h-2.5 w-3.5"
                          />
                        ) : (
                          player.rank
                        )}
                      </span>
                    </span>
                    {player.dropped ? (
                      <span
                        title="Spieler wurde gedroppt, alle Matches zählen als Freewin für die Gegner"
                        className="shrink-0 rounded-full border border-destructive/40 bg-destructive/8 px-[7px] py-[2px] font-bold text-[10.5px] text-destructive uppercase tracking-[0.06em]"
                      >
                        Drop
                      </span>
                    ) : null}
                  </span>
                </td>
                <td
                  className={cn(
                    "hidden whitespace-nowrap border-b px-3 py-2 text-muted-foreground text-sm sm:table-cell",
                    dim,
                  )}
                >
                  {player.groupName}
                </td>
                <td
                  className={cn(
                    "hidden border-b px-3 py-2 text-right font-semibold text-muted-foreground text-sm tabular-nums sm:table-cell",
                    dim,
                  )}
                >
                  {statsCovered && now ? (
                    <SpoilerPill
                      title={COVER_TITLE}
                      ariaLabel="Platz aufdecken"
                      onReveal={() => onReveal(now.matchId)}
                      className="ml-auto block h-3 w-[18px]"
                    />
                  ) : (
                    `${player.rank}.`
                  )}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap border-b px-2 py-2 text-right font-semibold text-[14.5px] tabular-nums sm:px-3",
                    dim,
                  )}
                >
                  {statsCovered && now ? (
                    <SpoilerPill
                      title={COVER_TITLE}
                      ariaLabel="Bilanz aufdecken"
                      onReveal={() => onReveal(now.matchId)}
                      className="ml-auto block h-3 w-[30px]"
                    />
                  ) : (
                    `${player.wins} : ${player.losses}`
                  )}
                </td>
                <td className={cn("border-b py-2 pr-3 pl-2 sm:pl-4", dim)}>
                  <FormStrip
                    cells={player.form}
                    covered={(cell) => formCellCovered(cell, context)}
                    onReveal={onReveal}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const CELL =
  "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] font-bold text-[9px] sm:size-[19px] sm:rounded-[4px] sm:text-[10.5px]";

// W solid navy, L muted, a double loss an outlined L, an overdue result a
// dashed outline. Not green/red on purpose: those are the zone colours and
// would read as zones.
const CELL_STYLE: Record<FormCell["result"], string> = {
  W: "bg-brand-blue text-white dark:bg-white dark:text-brand-blue",
  L: "bg-muted text-muted-foreground ring-1 ring-border ring-inset",
  double_loss: "text-muted-foreground ring-1 ring-border ring-inset",
  offen:
    "border border-dashed border-muted-foreground/40 text-muted-foreground",
};

const CELL_LABEL: Record<FormCell["result"], string> = {
  W: "Sieg",
  L: "Niederlage",
  double_loss: "Doppelniederlage",
  offen: "noch kein Ergebnis",
};

const CELL_TEXT: Record<FormCell["result"], string> = {
  W: "W",
  L: "L",
  double_loss: "L",
  offen: "–",
};

export function FormStrip({
  cells,
  covered,
  onReveal,
}: {
  cells: FormCell[];
  covered: (cell: FormCell) => boolean;
  onReveal: (matchId: string) => void;
}) {
  if (cells.length === 0) {
    return <span className="text-muted-foreground text-sm">–</span>;
  }
  return (
    <span className="flex items-center gap-0.5 sm:gap-[3px]">
      {cells.map((cell) =>
        covered(cell) ? (
          <SpoilerPill
            key={cell.matchId}
            title={COVER_TITLE}
            ariaLabel={`Ergebnis von Spieltag ${cell.round} aufdecken`}
            onReveal={() => onReveal(cell.matchId)}
            className="size-4 shrink-0 rounded-[3px] sm:size-[19px] sm:rounded-[4px]"
          />
        ) : (
          <span
            key={cell.matchId}
            title={`Spieltag ${cell.round}: ${CELL_LABEL[cell.result]}`}
            className={cn(CELL, CELL_STYLE[cell.result])}
          >
            {CELL_TEXT[cell.result]}
          </span>
        ),
      )}
    </span>
  );
}
