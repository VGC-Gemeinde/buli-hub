"use client";

import { useState } from "react";
import type { StandingsRow } from "@/features/reporting/standings";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./player-avatar";

// Game differential with an explicit sign, e.g. "+11", "0", "−3".
function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${-diff}`;
  return "0";
}

// The standings table itself — dumb, view-only. Shared by the group and the
// division view. The current player's row is tinted; the Platz + Spieler columns
// stay frozen (sticky) on the left as the score columns scroll on narrow screens,
// so frozen cells carry an opaque base + a `before` tint to keep the highlight
// consistent and stop scrolled columns bleeding through.
export function StandingsTable({
  standings,
  meId,
}: {
  standings: StandingsRow[];
  meId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[400px] border-separate border-spacing-0 text-left [&_tr:last-child_td]:border-b-0">
        <thead>
          <tr className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
            <th className="sticky left-0 z-20 w-[44px] border-b bg-background py-2.5 pr-1 pl-4 font-semibold before:absolute before:inset-0 before:bg-muted/50">
              <span className="relative">Pl.</span>
            </th>
            <th className="sticky left-[44px] z-10 border-r border-b bg-background py-2.5 pr-3 pl-2 font-semibold before:absolute before:inset-0 before:bg-muted/50">
              <span className="relative">Spieler</span>
            </th>
            <th className="border-b bg-muted/50 py-2.5 pr-3 pl-5 text-right font-semibold">
              Bilanz
            </th>
            <th className="border-b bg-muted/50 px-3 py-2.5 text-right font-semibold">
              Diff.
            </th>
            <th className="border-b bg-muted/50 px-3 py-2.5 text-right font-semibold">
              Punkte
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const me = row.userId === meId;
            const tint = me
              ? "before:absolute before:inset-0 before:bg-brand-orange/6"
              : "";
            return (
              <tr key={row.userId} className={cn(me && "bg-brand-orange/6")}>
                <td
                  className={cn(
                    "sticky left-0 z-20 border-b bg-background py-2.5 pr-1 pl-4 font-semibold text-muted-foreground text-sm tabular-nums",
                    tint,
                  )}
                >
                  <span className="relative">{row.rank}</span>
                </td>
                <td
                  className={cn(
                    "sticky left-[44px] z-10 border-r border-b bg-background py-2.5 pr-3 pl-2",
                    tint,
                  )}
                >
                  <span className="relative flex min-w-0 items-center gap-2">
                    <PlayerAvatar
                      identity={row}
                      size="size-[26px]"
                      filled={me}
                    />
                    <span
                      className={cn(
                        "truncate text-[14.5px]",
                        me ? "font-semibold" : "font-medium",
                      )}
                    >
                      {row.name}
                    </span>
                    {me ? (
                      <span className="font-bold text-[10px] text-brand-orange uppercase tracking-[0.1em]">
                        Du
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="border-b py-2.5 pr-3 pl-5 text-right text-muted-foreground text-sm tabular-nums">
                  {row.wins} : {row.losses}
                </td>
                <td className="border-b px-3 py-2.5 text-right font-semibold text-[14.5px] tabular-nums">
                  {formatDiff(row.gamesWon - row.gamesLost)}
                </td>
                <td className="border-b px-3 py-2.5 text-right font-semibold text-[14.5px] tabular-nums">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// The Tabelle section body: the group table, plus a switch to the division-wide
// table when one is available (all groups equal size, ≥2 groups). Without a
// division table, it is just the group table — today's behaviour.
export function StandingsPanel({
  groupName,
  groupStandings,
  divisionName,
  divisionStandings,
  meId,
}: {
  groupName: string;
  groupStandings: StandingsRow[];
  divisionName: string;
  divisionStandings: StandingsRow[] | null;
  meId: string;
}) {
  const [scope, setScope] = useState<"group" | "division">("group");

  if (divisionStandings === null) {
    return <StandingsTable standings={groupStandings} meId={meId} />;
  }

  const active = scope === "division" ? divisionStandings : groupStandings;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 self-start rounded-lg border bg-muted/40 p-1">
        <Segment
          active={scope === "group"}
          onClick={() => setScope("group")}
          label={groupName}
        />
        <Segment
          active={scope === "division"}
          onClick={() => setScope("division")}
          label={divisionName}
        />
      </div>
      <StandingsTable standings={active} meId={meId} />
    </div>
  );
}

function Segment({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-3 py-1.5 font-semibold text-[13px] uppercase tracking-[0.08em] transition-colors",
        active
          ? "bg-brand-orange text-white"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
