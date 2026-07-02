"use client";

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
import { cn } from "@/lib/utils";
import { type SeedingPlayer, seedingCaveats } from "../placement";
import { divisionName, subDivisionShortName } from "../seeding";
import type { DivisionRef, SubDivisionRef } from "../sheet";

// Shared column template — header and player rows must line up.
export const SHEET_GRID =
  "grid-cols-[36px_minmax(190px,1.3fr)_100px_110px_170px_150px_130px_minmax(170px,1fr)_150px_110px]";

const UNPLACED = "__unplaced__";

const PLATFORM_SHORT: Record<Platform, { label: string; dot: string }> = {
  showdown: { label: "Showdown", dot: "bg-chart-3" },
  cartridge: { label: "Cartridge", dot: "bg-brand-orange/80" },
};

export function SheetColumnHeader() {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 grid h-[34px] items-center border-b bg-background pr-7 pl-5 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.08em]",
        SHEET_GRID,
      )}
    >
      <span />
      <span>Spieler</span>
      <span>Status</span>
      <span>Plattform</span>
      <span>Letzte Saison</span>
      <span>Hinweis</span>
      <span>Einschätzung</span>
      <span>Erfolge</span>
      <span>Division</span>
      <span>Gruppe</span>
    </div>
  );
}

export function UnplacedSeparator({ count }: { count: number }) {
  return (
    <div className="flex h-10 items-center gap-3 border-b bg-muted/40 pr-7 pl-5">
      <div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-orange" />
      <span className="font-heading font-bold text-brand-blue text-lg uppercase tracking-[0.04em] dark:text-white">
        Nicht platziert
      </span>
      <span className="text-[12.5px] text-muted-foreground">
        {count} Spieler · Rückkehrer zuerst, dann nach Selbsteinschätzung
      </span>
    </div>
  );
}

export function DivisionSeparator({
  division,
  count,
  groupCount,
  hasGroups,
  size,
  readOnly,
  pending,
  onGenerate,
}: {
  division: DivisionRef;
  count: number;
  groupCount: number;
  hasGroups: boolean;
  size: number;
  readOnly: boolean;
  pending: boolean;
  onGenerate: (divisionId: string) => void;
}) {
  const meta = hasGroups
    ? `${count} Spieler · ${groupCount} Gruppen`
    : `${count} Spieler · → ${groupCount} Gruppen bei Größe ${size}`;
  return (
    <div className="flex h-10 items-center gap-3 bg-brand-blue pr-7 pl-5 dark:bg-[oklch(0.26_0.06_265)]">
      <div className="h-2.5 w-5 -skew-x-[18deg] bg-brand-orange" />
      <span className="font-heading font-bold text-lg text-white uppercase tracking-[0.04em]">
        {divisionName(division.tier)}
      </span>
      <span className="text-[12.5px] text-white/60">{meta}</span>
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
  count,
  showdown,
  cartridge,
}: {
  tier: number;
  position: number;
  count: number;
  showdown: number;
  cartridge: number;
}) {
  return (
    <div className="flex h-8 items-center gap-2.5 border-b bg-muted/60 pr-7 pl-9">
      <span className="font-bold text-[14.5px] text-brand-blue uppercase dark:text-white">
        {subDivisionShortName(tier, position)}
      </span>
      <span className="text-muted-foreground text-xs">
        {count} Spieler · {showdown} Showdown / {cartridge} Cartridge
      </span>
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
        {count} Spieler — per Gruppen-Spalte zuordnen
      </span>
    </div>
  );
}

export function EmptyDivisionHint() {
  return (
    <div className="flex h-9 items-center border-b pl-13 text-[13px] text-muted-foreground/70">
      Keine Spieler — über die Division-Spalte zuordnen.
    </div>
  );
}

// Centered no-data marker for empty cells.
function Dash() {
  return (
    <span className="justify-self-center text-muted-foreground/50">—</span>
  );
}

function CaveatChip({ player }: { player: SeedingPlayer }) {
  const caveats = seedingCaveats(player);
  const caveat = caveats[0];
  if (!caveat) {
    return <Dash />;
  }
  return (
    <span className="whitespace-nowrap rounded-md border-[1.5px] border-dashed px-1.5 py-px font-semibold text-[11.5px] text-muted-foreground">
      {caveat.label}
    </span>
  );
}

export function PlayerRow({
  player,
  divisions,
  subDivisions,
  selected,
  readOnly,
  onToggleSelect,
  onAssignDivision,
  onMoveGroup,
}: {
  player: SeedingPlayer;
  divisions: DivisionRef[];
  subDivisions: SubDivisionRef[];
  selected: boolean;
  readOnly: boolean;
  onToggleSelect: (userId: string) => void;
  onAssignDivision: (userId: string, divisionId: string | null) => void;
  onMoveGroup: (userId: string, subDivisionId: string) => void;
}) {
  const name = player.displayName ?? player.username ?? "Unbekannt";
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
        <Dash />
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
        <Dash />
      )}

      {player.greatestAchievements ? (
        <span
          className="truncate pr-3.5 text-[13px]"
          title={player.greatestAchievements}
        >
          {player.greatestAchievements}
        </span>
      ) : (
        <Dash />
      )}

      {readOnly ? (
        player.divisionId && divisionTier ? (
          <span className="text-[13px]">{divisionName(divisionTier)}</span>
        ) : (
          <Dash />
        )
      ) : (
        <Select
          value={player.divisionId ?? UNPLACED}
          onValueChange={(value) =>
            onAssignDivision(player.userId, value === UNPLACED ? null : value)
          }
        >
          <SelectTrigger size="sm" className="h-7 w-[136px]">
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

      {readOnly ? (
        player.subDivisionId && divisionTier !== undefined ? (
          <span className="text-[13px]">
            {subDivisionShortName(
              divisionTier,
              divisionSubs.find((s) => s.id === player.subDivisionId)
                ?.position ?? 0,
            )}
          </span>
        ) : (
          <Dash />
        )
      ) : (
        <Select
          value={player.subDivisionId ?? undefined}
          disabled={divisionSubs.length === 0}
          onValueChange={(value) => onMoveGroup(player.userId, value)}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-7 w-[96px]",
              divisionSubs.length === 0 && "opacity-55",
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
