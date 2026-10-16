// The Relegation pairings (docs/plans/relegation-and-playoffs.md). At every
// boundary between division t and t+1, the demotion seats of t meet the
// promotion seats of t+1, one Bo3 each: the best promotion seat against the
// worst demotion seat, and so on. Equally good seats of different groups are
// ordered by their group's lot. Pure: seats in, pairings out.

import type { FinalTable, Seat } from "@/features/final-table/places";
import { seatsOf } from "@/features/final-table/places";

export type RelegationPairing = {
  // Index of the pairing at its boundary; the match's `position`.
  position: number;
  upper: Seat;
  lower: Seat;
};

export type RelegationBoundary = {
  upperTier: number;
  lowerTier: number;
  pairings: RelegationPairing[];
};

// Upper pot: the demotion seats, worst first. A seat further down its zone
// band is worse; across groups the band index compares like for like even
// when the groups differ in size.
function upperPot(tables: readonly FinalTable[]): Seat[] {
  return seatsOf(tables, "demotion_playoff").sort(
    (a, b) =>
      b.zoneIndex - a.zoneIndex ||
      a.groupLot - b.groupLot ||
      a.tableKey.localeCompare(b.tableKey),
  );
}

// Lower pot: the promotion seats, best first.
function lowerPot(tables: readonly FinalTable[]): Seat[] {
  return seatsOf(tables, "promotion_playoff").sort(
    (a, b) =>
      a.zoneIndex - b.zoneIndex ||
      a.groupLot - b.groupLot ||
      a.tableKey.localeCompare(b.tableKey),
  );
}

// Every boundary that has relegation seats, top to bottom. `tablesByTier`
// holds each division's decisive tables. Pots of unequal size cannot be
// played (finalizing the seeding rejects that); only the matched part is
// paired.
export function relegationBoundaries(
  tablesByTier: ReadonlyMap<number, readonly FinalTable[]>,
): RelegationBoundary[] {
  const tiers = [...tablesByTier.keys()].sort((a, b) => a - b);
  const boundaries: RelegationBoundary[] = [];
  for (let i = 0; i < tiers.length - 1; i++) {
    const upper = upperPot(tablesByTier.get(tiers[i]) ?? []);
    const lower = lowerPot(tablesByTier.get(tiers[i + 1]) ?? []);
    const count = Math.min(upper.length, lower.length);
    if (count === 0) {
      continue;
    }
    boundaries.push({
      upperTier: tiers[i],
      lowerTier: tiers[i + 1],
      pairings: Array.from({ length: count }, (_, position) => ({
        position,
        upper: upper[position],
        lower: lower[position],
      })),
    });
  }
  return boundaries;
}

// "Division 1 und 2".
export function boundaryName(upperTier: number, lowerTier: number): string {
  return `Division ${upperTier} und ${lowerTier}`;
}
