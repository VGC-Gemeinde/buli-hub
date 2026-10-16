// The final places of a decisive standings table and the seats Relegation
// und Playoffs are played from (docs/plans/relegation-and-playoffs.md). Pure:
// the caller hands in the computed standings, the drop flags, the lots and the
// division's zone counts.
//
// A seat is a place in a zone that is played (the playoffs, the promotion or
// demotion relegation), identified by its table and its index in that zone.
// Pairings are drawn between seats, never between players; who holds a seat
// is what the table says, or, at a shared place across a zone boundary, what
// the tiebreaker (two players) or the staff order (three or more) decides.

import { assignZones, type Zone } from "@/features/seeding/post-season";

// Zones that are played after the regular season. The direct zones and
// "none" decide a player's season by their place alone.
export type SeatZone = "champion" | "promotion_playoff" | "demotion_playoff";

export function isSeatZone(zone: Zone): zone is SeatZone {
  return (
    zone === "champion" ||
    zone === "promotion_playoff" ||
    zone === "demotion_playoff"
  );
}

// A row of the decisive table as standings computed it, in standings order.
export type TableRow = {
  userId: string;
  // Competition rank from `computeStandings`: equal means genuinely tied.
  rank: number;
  // Dropped in the regular season: placed behind everyone else.
  dropped: boolean;
  // `placements.lot_number`.
  lot: number;
};

// One decisive table: a group in group mode, the whole division in division
// mode (`subDivisionId` null).
export type TableInput = {
  tier: number;
  subDivisionId: string | null;
  // Group position (0 = "a") for labels; null in division mode.
  groupPosition: number | null;
  // `sub_divisions.lot_number`; null in division mode, where there is only
  // one table.
  groupLot: number | null;
  rows: readonly TableRow[];
  // The division's zone counts, per table (`assignZones`).
  counts: {
    champion: number;
    promotions: number;
    promotionPlayoff: number;
    demotionPlayoff: number;
    demotions: number;
  };
};

// Who holds a place: a player, the candidates of a shared place across a
// zone boundary until it is decided, or nobody: a tiebreaker lost by both
// leaves every place it decides empty, and whoever plays against an empty
// seat wins without a match.
export type Holder =
  | { kind: "player"; userId: string }
  | { kind: "tie"; tieKey: string; candidates: string[] }
  | { kind: "vacant"; tieKey: string };

// How a boundary tie was decided: the tied players best first (tiebreaker
// result, staff order), or "vacant" (a tiebreaker lost by both).
export type TieDecision = readonly string[] | "vacant";

// A shared place across a zone boundary. Two players play a tiebreaker; three
// or more are ordered by staff.
export type BoundaryTie = {
  // Stable identity: the table and the first place the tie covers.
  key: string;
  tableKey: string;
  tier: number;
  subDivisionId: string | null;
  groupPosition: number | null;
  // 0-based places the tie covers, consecutive, best first.
  indexes: number[];
  // The zone of each covered place, in the same order.
  zones: Zone[];
  // The tied players in standings order.
  userIds: string[];
  decision: "tiebreaker" | "staff_order";
};

export type Place = {
  index: number;
  zone: Zone;
  // Index of this place within its zone band, 0 = the band's best place.
  zoneIndex: number;
  holder: Holder;
};

export type FinalTable = {
  key: string;
  tier: number;
  subDivisionId: string | null;
  groupPosition: number | null;
  groupLot: number | null;
  places: Place[];
  ties: BoundaryTie[];
};

export function tableKey(table: {
  tier: number;
  subDivisionId: string | null;
}): string {
  return table.subDivisionId === null
    ? `division:${table.tier}`
    : `group:${table.subDivisionId}`;
}

// Lower lot first. The lot is a uniform random number, so "lower wins" is as
// fair as any other fixed direction.
function byLot<T extends { lot: number; userId: string }>(a: T, b: T): number {
  return a.lot - b.lot || a.userId.localeCompare(b.userId);
}

// The places of one decisive table. Dropped players move behind everyone
// else and are ordered among themselves by lot; equally ranked players inside
// one zone are ordered by lot; equally ranked players across a zone boundary
// become a `BoundaryTie` and hold their places jointly until it is decided.
//
// `decided` maps a tie's key to its decision. An order that does not name
// exactly the tied players is ignored, so a stale decision can never seat
// the wrong player.
export function finalTable(
  table: TableInput,
  decided: ReadonlyMap<string, TieDecision> = new Map(),
): FinalTable {
  const key = tableKey(table);
  const active = table.rows.filter((row) => !row.dropped);
  const dropped = table.rows.filter((row) => row.dropped).sort(byLot);
  const ordered = [...active, ...dropped];
  const zones = assignZones({ rowCount: ordered.length, ...table.counts });

  const zoneIndexes: number[] = [];
  const seen = new Map<Zone, number>();
  for (const zone of zones) {
    const next = seen.get(zone) ?? 0;
    zoneIndexes.push(next);
    seen.set(zone, next + 1);
  }

  const holders: Holder[] = [];
  const ties: BoundaryTie[] = [];
  // Rank blocks among the active rows; dropped rows never tie.
  let start = 0;
  while (start < active.length) {
    let end = start + 1;
    while (end < active.length && active[end].rank === active[start].rank) {
      end++;
    }
    const block = active.slice(start, end);
    const indexes = block.map((_, i) => start + i);
    const blockZones = indexes.map((index) => zones[index]);
    const acrossBoundary = blockZones.some((zone) => zone !== blockZones[0]);
    if (!acrossBoundary) {
      for (const row of [...block].sort(byLot)) {
        holders.push({ kind: "player", userId: row.userId });
      }
    } else {
      const tie: BoundaryTie = {
        key: `${key}:${start}`,
        tableKey: key,
        tier: table.tier,
        subDivisionId: table.subDivisionId,
        groupPosition: table.groupPosition,
        indexes,
        zones: blockZones,
        userIds: block.map((row) => row.userId),
        decision: block.length === 2 ? "tiebreaker" : "staff_order",
      };
      ties.push(tie);
      const decision = decided.get(tie.key);
      const order =
        decision !== undefined &&
        decision !== "vacant" &&
        decision.length === tie.userIds.length &&
        tie.userIds.every((id) => decision.includes(id))
          ? decision
          : null;
      for (let i = 0; i < block.length; i++) {
        holders.push(
          decision === "vacant"
            ? { kind: "vacant", tieKey: tie.key }
            : order
              ? { kind: "player", userId: order[i] }
              : { kind: "tie", tieKey: tie.key, candidates: tie.userIds },
        );
      }
    }
    start = end;
  }
  for (const row of dropped) {
    holders.push({ kind: "player", userId: row.userId });
  }

  return {
    key,
    tier: table.tier,
    subDivisionId: table.subDivisionId,
    groupPosition: table.groupPosition,
    groupLot: table.groupLot,
    places: ordered.map((_, index) => ({
      index,
      zone: zones[index],
      zoneIndex: zoneIndexes[index],
      holder: holders[index],
    })),
    ties,
  };
}

// A seat: a played place with everything pairing and labelling need.
export type Seat = {
  tableKey: string;
  tier: number;
  subDivisionId: string | null;
  groupPosition: number | null;
  groupLot: number;
  zone: SeatZone;
  zoneIndex: number;
  // 0-based place in the table ("Platz {index + 1}").
  index: number;
  holder: Holder;
  // The boundary tie this place is part of, decided or not; null otherwise.
  tieKey: string | null;
};

// The seats of one zone across a division's decisive tables.
export function seatsOf(tables: readonly FinalTable[], zone: SeatZone): Seat[] {
  return tables.flatMap((table) =>
    table.places
      .filter((place) => place.zone === zone)
      .map((place) => ({
        tableKey: table.key,
        tier: table.tier,
        subDivisionId: table.subDivisionId,
        groupPosition: table.groupPosition,
        groupLot: table.groupLot ?? 0,
        zone,
        zoneIndex: place.zoneIndex,
        index: place.index,
        holder: place.holder,
        tieKey:
          table.ties.find((tie) => tie.indexes.includes(place.index))?.key ??
          null,
      })),
  );
}
