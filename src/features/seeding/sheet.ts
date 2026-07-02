import { orderForPlacement, type SeedingPlayer } from "./placement";

export type SheetFilter = {
  query: string;
  status: "all" | "returning" | "new";
};

// An exact target placement — where a drag drop puts the dragged player(s).
export type Placement = {
  divisionId: string | null;
  subDivisionId: string | null;
};

export type DivisionRef = { id: string; tier: number };
export type SubDivisionRef = {
  id: string;
  divisionId: string;
  position: number;
};

export type SheetRow =
  | { kind: "unplaced"; count: number }
  | {
      kind: "division";
      division: DivisionRef;
      count: number;
      groupCount: number;
      hasGroups: boolean;
      size: number;
    }
  | {
      kind: "subdivision";
      tier: number;
      position: number;
      subDivisionId: string;
      count: number;
      showdown: number;
      cartridge: number;
    }
  | { kind: "ungrouped"; divisionId: string; count: number }
  | { kind: "empty-division"; divisionId: string }
  | { kind: "player"; player: SeedingPlayer };

export function playerMatchesFilter(
  player: SeedingPlayer,
  filter: SheetFilter,
): boolean {
  if (filter.status !== "all" && player.status !== filter.status) {
    return false;
  }
  const query = filter.query.trim().toLowerCase();
  if (query === "") {
    return true;
  }
  const name = (player.displayName ?? player.username ?? "").toLowerCase();
  return name.includes(query);
}

function byName(a: SeedingPlayer, b: SeedingPlayer): number {
  const an = a.displayName ?? a.username ?? "";
  const bn = b.displayName ?? b.username ?? "";
  return an.localeCompare(bn, "de", { sensitivity: "base" });
}

/**
 * Assembles the flat, ordered row list for the seeding sheet: a „Nicht
 * platziert" section, then each division with either its generated groups
 * (plus an „Ohne Gruppe" section for stragglers) or its ungrouped players (or
 * an empty hint). Separator counts always reflect the full data; the filter
 * only removes player rows.
 */
export function assembleSheetRows(params: {
  players: SeedingPlayer[];
  divisions: DivisionRef[];
  subDivisions: SubDivisionRef[];
  size: number;
  filter: SheetFilter;
}): SheetRow[] {
  const { players, divisions, subDivisions, size, filter } = params;
  const rows: SheetRow[] = [];
  const shown = (list: SeedingPlayer[]) =>
    list.filter((p) => playerMatchesFilter(p, filter));

  const unplaced = players.filter((p) => p.divisionId === null);
  rows.push({ kind: "unplaced", count: unplaced.length });
  for (const player of shown(orderForPlacement(unplaced))) {
    rows.push({ kind: "player", player });
  }

  for (const division of divisions) {
    const divisionPlayers = players.filter((p) => p.divisionId === division.id);
    const subs = subDivisions
      .filter((sd) => sd.divisionId === division.id)
      .sort((a, b) => a.position - b.position);
    const hasGroups = subs.length > 0;

    rows.push({
      kind: "division",
      division,
      count: divisionPlayers.length,
      groupCount: hasGroups
        ? subs.length
        : Math.ceil(divisionPlayers.length / size),
      hasGroups,
      size,
    });

    if (hasGroups) {
      for (const sub of subs) {
        const groupPlayers = divisionPlayers.filter(
          (p) => p.subDivisionId === sub.id,
        );
        rows.push({
          kind: "subdivision",
          tier: division.tier,
          position: sub.position,
          subDivisionId: sub.id,
          count: groupPlayers.length,
          showdown: groupPlayers.filter((p) => p.platform === "showdown")
            .length,
          cartridge: groupPlayers.filter((p) => p.platform === "cartridge")
            .length,
        });
        for (const player of shown([...groupPlayers].sort(byName))) {
          rows.push({ kind: "player", player });
        }
      }
      const ungrouped = divisionPlayers.filter((p) => p.subDivisionId === null);
      if (ungrouped.length > 0) {
        rows.push({
          kind: "ungrouped",
          divisionId: division.id,
          count: ungrouped.length,
        });
        for (const player of shown(orderForPlacement(ungrouped))) {
          rows.push({ kind: "player", player });
        }
      }
    } else if (divisionPlayers.length > 0) {
      for (const player of shown(orderForPlacement(divisionPlayers))) {
        rows.push({ kind: "player", player });
      }
    } else {
      rows.push({ kind: "empty-division", divisionId: division.id });
    }
  }

  return rows;
}
