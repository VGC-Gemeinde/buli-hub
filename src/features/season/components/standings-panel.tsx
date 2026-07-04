"use client";

import { useState } from "react";
import type { StandingsRow } from "@/features/reporting/standings";
import type { Zone } from "@/features/seeding/post-season";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./player-avatar";

// Game differential with an explicit sign, e.g. "+11", "0", "−3".
function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${-diff}`;
  return "0";
}

// Post-season zone tints. Guaranteed spots are green (promotion) / red
// (demotion); both playoff bands share amber — their position (top vs bottom)
// tells them apart, and the legend spells it out. Functional colours pending a
// design pass.
// Static class strings (Tailwind can't see dynamically built ones): the row
// background and the matching `before` overlay for the frozen sticky cells.
const ZONE_TINT: Record<Zone, string> = {
  promote: "bg-emerald-500/12",
  promotion_playoff: "bg-amber-500/12",
  demotion_playoff: "bg-amber-500/12",
  demote: "bg-destructive/10",
  none: "",
};
const ZONE_OVERLAY: Record<Zone, string> = {
  promote: "before:absolute before:inset-0 before:bg-emerald-500/12",
  promotion_playoff: "before:absolute before:inset-0 before:bg-amber-500/12",
  demotion_playoff: "before:absolute before:inset-0 before:bg-amber-500/12",
  demote: "before:absolute before:inset-0 before:bg-destructive/10",
  none: "",
};
const ME_TINT = "bg-brand-orange/6";
const ME_OVERLAY = "before:absolute before:inset-0 before:bg-brand-orange/6";

export type ZoneMap = Map<string, Zone>;

// The standings table itself — dumb, view-only. Shared by the group and the
// division view. Rows can be tinted by post-season zone; the current player is
// always marked (bold + „Du" + a left accent) even inside a zone. The Platz +
// Spieler columns stay frozen (sticky) on the left as the score columns scroll on
// narrow screens, so frozen cells carry an opaque base + a `before` tint to keep
// the highlight consistent and stop scrolled columns bleeding through.
export function StandingsTable({
  standings,
  meId,
  zones,
}: {
  standings: StandingsRow[];
  meId: string;
  zones?: ZoneMap;
}) {
  return (
    <div className="flex flex-col gap-2">
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
              const zone = zones?.get(row.userId) ?? "none";
              // Zone tint takes precedence over the plain „me" highlight; the
              // current player stays marked by the tint + bold name + „Du" badge.
              const rowTint =
                zone !== "none" ? ZONE_TINT[zone] : me ? ME_TINT : "";
              // Sticky cells need an opaque base, so the tint rides on top via a
              // `before` overlay to stay consistent across frozen + scrolling cells.
              const overlay =
                zone !== "none" ? ZONE_OVERLAY[zone] : me ? ME_OVERLAY : "";
              return (
                <tr key={row.userId} className={cn(rowTint)}>
                  <td
                    className={cn(
                      "sticky left-0 z-20 border-b bg-background py-2.5 pr-1 pl-4 font-semibold text-muted-foreground text-sm tabular-nums",
                      overlay,
                    )}
                  >
                    <span className="relative">{row.rank}</span>
                  </td>
                  <td
                    className={cn(
                      "sticky left-[44px] z-10 border-r border-b bg-background py-2.5 pr-3 pl-2",
                      overlay,
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
      <ZoneLegend zones={zones} />
    </div>
  );
}

// Legend for whichever zones actually appear in the shown table.
function ZoneLegend({ zones }: { zones?: ZoneMap }) {
  if (!zones) return null;
  const present = new Set(zones.values());
  const items: { show: boolean; dot: string; label: string }[] = [
    { show: present.has("promote"), dot: "bg-emerald-500", label: "Aufstieg" },
    {
      show: present.has("promotion_playoff") || present.has("demotion_playoff"),
      dot: "bg-amber-500",
      label: "Playoff",
    },
    { show: present.has("demote"), dot: "bg-destructive", label: "Abstieg" },
  ].filter((i) => i.show);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", item.dot)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// The Tabelle section body. Post-season zones are shown on the division's
// *relevant* table only: in `division` mode the division table carries them and
// is the default view; in `sub_division` mode the group table carries them and no
// division tab is shown. `divisionStandings === null` means sub-division mode.
export function StandingsPanel({
  groupName,
  groupStandings,
  groupZones,
  divisionName,
  divisionStandings,
  divisionZones,
  defaultScope,
  meId,
}: {
  groupName: string;
  groupStandings: StandingsRow[];
  groupZones?: ZoneMap;
  divisionName: string;
  divisionStandings: StandingsRow[] | null;
  divisionZones?: ZoneMap;
  defaultScope: "group" | "division";
  meId: string;
}) {
  const [scope, setScope] = useState<"group" | "division">(defaultScope);

  if (divisionStandings === null) {
    return (
      <StandingsTable
        standings={groupStandings}
        meId={meId}
        zones={groupZones}
      />
    );
  }

  const showDivision = scope === "division";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 self-start rounded-lg border bg-muted/40 p-1">
        <Segment
          active={!showDivision}
          onClick={() => setScope("group")}
          label={groupName}
        />
        <Segment
          active={showDivision}
          onClick={() => setScope("division")}
          label={divisionName}
        />
      </div>
      <StandingsTable
        standings={showDivision ? divisionStandings : groupStandings}
        meId={meId}
        zones={showDivision ? divisionZones : groupZones}
      />
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
