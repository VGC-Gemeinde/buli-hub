"use client";

import { ChevronDown } from "lucide-react";
import { Tick } from "@/components/tick";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Platform } from "@/features/registration/registration";
import { playerName } from "@/lib/player-name";
import { cn } from "@/lib/utils";
import { type SeedingPlayer, seedingCaveats } from "../placement";
import { divisionName, subDivisionShortName } from "../seeding";
import type { DivisionRef, SubDivisionRef } from "../sheet";

// Shared column template — header and player rows must line up.
//
// Division is sized so the widest option, "Nicht platziert", fits the select
// without clipping; the 22px it needed came out of Spieler, which had room to
// spare. Spieler's minimum shrank by the same amount, so the sheet's minimum
// scroll width is unchanged, and its flex share dropped so the extra width goes
// to Erfolge rather than back to the name column.
export const SHEET_GRID =
  "grid-cols-[36px_minmax(168px,1.15fr)_100px_110px_170px_150px_130px_minmax(170px,1fr)_172px_110px]";

const UNPLACED = "__unplaced__";

// The column labels, shared so the header and the no-data marker cannot drift:
// `Dash` sizes itself to its column's label, and a renamed heading has to move
// the dash with it.
const HEADINGS = {
  player: "Spieler",
  status: "Status",
  platform: "Plattform",
  prevSeason: "Letzte Saison",
  caveat: "Hinweis",
  rating: "Einschätzung",
  achievements: "Erfolge",
  division: "Division",
  group: "Gruppe",
} as const;

// The header's own typography. `Dash` reuses it on an invisible copy of the
// label so the measured width matches what the header actually renders.
const HEADING_TYPE = "font-semibold text-[11px] uppercase tracking-[0.08em]";

const PLATFORM_SHORT: Record<Platform, { label: string; dot: string }> = {
  showdown: { label: "Showdown", dot: "bg-chart-3" },
  cartridge: { label: "Cartridge", dot: "bg-brand-orange/80" },
};

export function SheetColumnHeader() {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 grid h-[34px] items-center border-b bg-background pr-7 pl-5 text-muted-foreground",
        HEADING_TYPE,
        SHEET_GRID,
      )}
    >
      <span />
      <span>{HEADINGS.player}</span>
      <span>{HEADINGS.status}</span>
      <span>{HEADINGS.platform}</span>
      <span>{HEADINGS.prevSeason}</span>
      <span>{HEADINGS.caveat}</span>
      <span>{HEADINGS.rating}</span>
      <span>{HEADINGS.achievements}</span>
      <span>{HEADINGS.division}</span>
      <span>{HEADINGS.group}</span>
    </div>
  );
}

export function UnplacedSeparator({
  count,
  collapsed,
  onToggle,
}: {
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex h-10 items-center gap-3 border-b bg-muted/40 pr-7 pl-5">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={onToggle}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <Tick size="m" />
        <span className="font-heading font-bold text-brand-blue text-lg uppercase tracking-[0.04em] dark:text-white">
          Nicht platziert
        </span>
        <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
          {count} Spieler · Die meisten Rückkehrer werden voreingeteilt. Die
          übrigen landen hier, danach die neuen Spieler sortiert nach
          Selbsteinschätzung.
        </span>
      </button>
    </div>
  );
}

export function DivisionSeparator({
  division,
  count,
  groupCount,
  hasGroups,
  size,
  collapsed,
  readOnly,
  pending,
  onToggleCollapse,
  onGenerate,
}: {
  division: DivisionRef;
  count: number;
  groupCount: number;
  hasGroups: boolean;
  size: number;
  collapsed: boolean;
  readOnly: boolean;
  pending: boolean;
  onToggleCollapse: (id: string) => void;
  onGenerate: (divisionId: string) => void;
}) {
  const meta = hasGroups
    ? `${count} Spieler · ${groupCount} Gruppen`
    : `${count} Spieler · → ${groupCount} Gruppen bei Größe ${size}`;
  return (
    <div className="flex h-10 items-center gap-3 bg-brand-blue pr-7 pl-5 dark:bg-[oklch(0.26_0.06_265)]">
      {/* The whole title area toggles; the generate button stays outside so
          the two never fight for the click. */}
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => onToggleCollapse(division.id)}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-white/70 transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <Tick size="m" />
        <span className="font-heading font-bold text-lg text-white uppercase tracking-[0.04em]">
          {divisionName(division.tier)}
        </span>
        <span className="text-[12.5px] text-white/60">{meta}</span>
      </button>
      <div className="flex-1" />
      {!readOnly && count > 0 ? (
        <Button
          size="sm"
          variant={hasGroups ? "outline" : "default"}
          disabled={pending}
          onClick={() => onGenerate(division.id)}
          className={
            hasGroups
              ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
              : undefined
          }
        >
          {pending
            ? "Wird generiert…"
            : hasGroups
              ? "Neu generieren"
              : "Gruppen generieren"}
        </Button>
      ) : null}
    </div>
  );
}

export function SubDivisionSeparator({
  tier,
  position,
  subDivisionId,
  count,
  showdown,
  cartridge,
  collapsed,
  onToggleCollapse,
}: {
  tier: number;
  position: number;
  subDivisionId: string;
  count: number;
  showdown: number;
  cartridge: number;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
}) {
  return (
    <div className="flex h-8 items-center gap-2.5 border-b bg-muted/60 pr-7 pl-9">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => onToggleCollapse(subDivisionId)}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <span className="font-bold text-[14.5px] text-brand-blue uppercase dark:text-white">
          {subDivisionShortName(tier, position)}
        </span>
        <span className="text-muted-foreground text-xs">
          {count} Spieler · {showdown} Showdown / {cartridge} Cartridge
        </span>
      </button>
    </div>
  );
}

export function UngroupedSeparator({ count }: { count: number }) {
  return (
    <div className="flex h-8 items-center gap-2.5 border-b bg-brand-orange/5 pr-7 pl-9">
      <span className="font-bold text-[14.5px] text-[oklch(0.55_0.13_50)] uppercase">
        Ohne Gruppe
      </span>
      <span className="text-muted-foreground text-xs">
        {count} Spieler · per Gruppen-Spalte zuordnen
      </span>
    </div>
  );
}

export function EmptyDivisionHint() {
  return (
    <div className="flex h-9 items-center border-b pl-13 text-[13px] text-muted-foreground/70">
      Keine Spieler · über die Division-Spalte zuordnen
    </div>
  );
}

// No-data marker for empty cells, centered on the column *heading* rather than
// on the column. The headings are left-aligned, so a dash centered in a 170px
// column sits far to the right of the word it belongs to, and a column of them
// reads as misaligned. Centered under the label instead, the marker lands where
// the eye already is.
//
// The width comes from an invisible copy of the heading rendered in the
// header's own typography — there is no way to measure the header from here,
// and hardcoded offsets would break the moment a label changes. Both children
// share one grid cell, so the copy sizes the box and the dash centers in it.
function Dash({ heading }: { heading: string }) {
  return (
    <span className="grid justify-self-start place-items-center">
      <span
        aria-hidden
        className={cn(
          "invisible col-start-1 row-start-1 whitespace-nowrap",
          HEADING_TYPE,
        )}
      >
        {heading}
      </span>
      <span className="col-start-1 row-start-1 text-muted-foreground/50">
        —
      </span>
    </span>
  );
}

function CaveatChip({ player }: { player: SeedingPlayer }) {
  const caveats = seedingCaveats(player);
  const caveat = caveats[0];
  if (!caveat) {
    return <Dash heading={HEADINGS.caveat} />;
  }
  return (
    <span className="whitespace-nowrap rounded-md border-[1.5px] border-dashed px-1.5 py-px font-semibold text-[11.5px] text-muted-foreground">
      {caveat.label}
    </span>
  );
}

// Two read-only flavors: an observer (someone else drives) still sees the
// selects, just disabled; a finalized seeding is a terminal record and
// renders plain text instead.
export function PlayerRow({
  player,
  divisions,
  subDivisions,
  selected,
  readOnly,
  finalized,
  onToggleSelect,
  onAssignDivision,
  onMoveGroup,
}: {
  player: SeedingPlayer;
  divisions: DivisionRef[];
  subDivisions: SubDivisionRef[];
  selected: boolean;
  readOnly: boolean;
  finalized: boolean;
  onToggleSelect: (userId: string) => void;
  onAssignDivision: (userId: string, divisionId: string | null) => void;
  onMoveGroup: (userId: string, subDivisionId: string) => void;
}) {
  const name = playerName(player.displayName, player.username);
  const platform = PLATFORM_SHORT[player.platform];
  const divisionSubs = subDivisions.filter(
    (sd) => sd.divisionId === player.divisionId,
  );
  const divisionTier = divisions.find((d) => d.id === player.divisionId)?.tier;

  return (
    <div
      className={cn(
        "grid h-[38px] items-center border-b border-border/60 pr-7 pl-5 hover:bg-muted/40",
        SHEET_GRID,
        selected && "bg-brand-orange/5",
      )}
    >
      {readOnly ? (
        <span />
      ) : (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(player.userId)}
          className="size-[15px]"
        />
      )}

      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="size-6 shrink-0">
          {player.avatarUrl ? (
            <AvatarImage src={player.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-[10px] font-semibold">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-medium text-[13.5px]">{name}</span>
      </div>

      <Badge
        variant={player.status === "returning" ? "secondary" : "outline"}
        className="text-[11.5px]"
      >
        {player.status === "returning" ? "Rückkehrer" : "Neu"}
      </Badge>

      <div className="flex items-center gap-1.5 text-[13px]">
        <span className={cn("size-[7px] rounded-full", platform.dot)} />
        {platform.label}
      </div>

      {player.status === "returning" && player.prevDivision ? (
        <span
          className="truncate text-[13px]"
          title={`Division ${player.prevDivision} · ${player.prevPlacement ?? "?"}. Platz`}
        >
          Division {player.prevDivision} · {player.prevPlacement ?? "?"}. Platz
        </span>
      ) : (
        <Dash heading={HEADINGS.prevSeason} />
      )}

      <CaveatChip player={player} />

      {player.status === "new" && player.skillSelfRating !== null ? (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[12.5px]">
            {player.skillSelfRating}/10
          </span>
          <div className="h-1 w-[52px] rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-brand-orange"
              style={{ width: `${player.skillSelfRating * 10}%` }}
            />
          </div>
        </div>
      ) : (
        <Dash heading={HEADINGS.rating} />
      )}

      {player.greatestAchievements ? (
        <span
          className="truncate pr-3.5 text-[13px]"
          title={player.greatestAchievements}
        >
          {player.greatestAchievements}
        </span>
      ) : (
        <Dash heading={HEADINGS.achievements} />
      )}

      {finalized ? (
        player.divisionId && divisionTier ? (
          <span className="text-[13px]">{divisionName(divisionTier)}</span>
        ) : (
          <Dash heading={HEADINGS.division} />
        )
      ) : (
        <Select
          value={player.divisionId ?? UNPLACED}
          disabled={readOnly}
          onValueChange={(value) =>
            onAssignDivision(player.userId, value === UNPLACED ? null : value)
          }
        >
          <SelectTrigger
            size="sm"
            className={cn("h-7 w-[158px]", readOnly && "opacity-60")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNPLACED}>Nicht platziert</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {divisionName(d.tier)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {finalized ? (
        player.subDivisionId && divisionTier !== undefined ? (
          <span className="text-[13px]">
            {subDivisionShortName(
              divisionTier,
              divisionSubs.find((s) => s.id === player.subDivisionId)
                ?.position ?? 0,
            )}
          </span>
        ) : (
          <Dash heading={HEADINGS.group} />
        )
      ) : (
        <Select
          value={player.subDivisionId ?? undefined}
          disabled={readOnly || divisionSubs.length === 0}
          onValueChange={(value) => onMoveGroup(player.userId, value)}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-7 w-[96px]",
              readOnly && "opacity-60",
              !readOnly && divisionSubs.length === 0 && "opacity-55",
            )}
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {divisionSubs.map((sd) => (
              <SelectItem key={sd.id} value={sd.id}>
                {divisionTier !== undefined
                  ? subDivisionShortName(divisionTier, sd.position)
                  : sd.position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
