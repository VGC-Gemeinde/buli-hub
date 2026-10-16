// The Division-1 Playoffs bracket (docs/plans/relegation-and-playoffs.md):
// single elimination, one round per week, padded to the next power of two
// with byes for the best seeds. Pure: seats in, seeds and bracket shape out.

import type { Seat } from "@/features/final-table/places";

// Rounds needed for `n` participants; none below two.
export function bracketRounds(n: number): number {
  return n < 2 ? 0 : Math.ceil(Math.log2(n));
}

export function bracketSize(n: number): number {
  return n < 2 ? 0 : 2 ** bracketRounds(n);
}

// The standard seed order of a bracket of `size` (a power of two), listed by
// first-round slot: [1, 8, 4, 5, 2, 7, 3, 6] for eight. Pairs are adjacent,
// every pair sums to size + 1, and 1 and 2 can only meet in the final.
export function seedOrder(size: number): number[] {
  let order = [1];
  let span = 1;
  while (span < size) {
    span *= 2;
    order = order.flatMap((seed) => [seed, span + 1 - seed]);
  }
  return order;
}

// Matches in a round of an `n`-player bracket, byes included.
export function roundSlots(n: number, round: number): number {
  return bracketSize(n) / 2 ** round;
}

// The two seeds of a first-round slot. A seed above `n` is a bye.
export function firstRoundSeeds(n: number, position: number): [number, number] {
  const order = seedOrder(bracketSize(n));
  return [order[2 * position], order[2 * position + 1]];
}

function isBye(n: number, position: number): boolean {
  const [a, b] = firstRoundSeeds(n, position);
  return a > n || b > n;
}

// Every match the bracket actually plays: all slots of every round except
// first-round byes, which are no match at all.
export function playoffMatches(
  n: number,
): { round: number; position: number }[] {
  const matches: { round: number; position: number }[] = [];
  for (let round = 1; round <= bracketRounds(n); round++) {
    for (let position = 0; position < roundSlots(n, round); position++) {
      if (round === 1 && isBye(n, position)) {
        continue;
      }
      matches.push({ round, position });
    }
  }
  return matches;
}

// Where one side of a match comes from: a seed (first round, or a bye passed
// straight through) or the winner of a played match one round earlier.
export type SideOrigin =
  | { kind: "seed"; seed: number }
  | { kind: "winner"; round: number; position: number };

export function sideOrigin(
  n: number,
  round: number,
  position: number,
  side: 0 | 1,
): SideOrigin {
  if (round === 1) {
    return { kind: "seed", seed: firstRoundSeeds(n, position)[side] };
  }
  const from = 2 * position + side;
  if (round === 2 && isBye(n, from)) {
    const [a, b] = firstRoundSeeds(n, from);
    return { kind: "seed", seed: a <= n ? a : b };
  }
  return { kind: "winner", round: round - 1, position: from };
}

// "Finale", "Halbfinale", "Viertelfinale", "Achtelfinale"; earlier rounds of
// a very large bracket by number.
export function roundName(totalRounds: number, round: number): string {
  const fromEnd = totalRounds - round;
  switch (fromEnd) {
    case 0:
      return "Finale";
    case 1:
      return "Halbfinale";
    case 2:
      return "Viertelfinale";
    case 3:
      return "Achtelfinale";
    default:
      return `Runde ${round}`;
  }
}

// The short label of a match: "Finale", "HF 1", "VF 3", "AF 2", "R1 4".
export function matchLabel(
  totalRounds: number,
  round: number,
  position: number,
): string {
  const fromEnd = totalRounds - round;
  const prefix = ["", "HF", "VF", "AF"][fromEnd] ?? `R${round}`;
  return fromEnd === 0 ? "Finale" : `${prefix} ${position + 1}`;
}

// Seeds by place: every band position before the next (all group winners
// before all runners-up), equally good seats of different groups by group
// lot. In group mode no first-round match may pair two seats of the same
// group; among equally good seats the draw departs from the lot order as
// little as needed (the first valid assignment in lot order). Null when no
// valid assignment exists.
export function seedPlayoffs(seats: readonly Seat[]): Seat[] | null {
  const n = seats.length;
  if (n === 0) {
    return [];
  }
  const levels = new Map<number, Seat[]>();
  for (const seat of seats) {
    const level = levels.get(seat.zoneIndex) ?? [];
    level.push(seat);
    levels.set(seat.zoneIndex, level);
  }
  // Each seed's level, in seed order, and its candidates in lot order.
  const ordered = [...levels.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, level]) =>
      [...level].sort(
        (a, b) =>
          a.groupLot - b.groupLot || a.tableKey.localeCompare(b.tableKey),
      ),
    );
  const levelOfSeed: Seat[][] = ordered.flatMap((level) =>
    level.map(() => level),
  );
  const separate = new Set(seats.map((seat) => seat.tableKey)).size > 1;
  const size = bracketSize(n) || 1;

  const seeds: Seat[] = [];
  const used = new Set<Seat>();
  const assign = (index: number): boolean => {
    if (index === n) {
      return true;
    }
    const seedNumber = index + 1;
    const opponent = size + 1 - seedNumber;
    for (const candidate of levelOfSeed[index]) {
      if (used.has(candidate)) {
        continue;
      }
      if (
        separate &&
        opponent < seedNumber &&
        seeds[opponent - 1].tableKey === candidate.tableKey
      ) {
        continue;
      }
      used.add(candidate);
      seeds.push(candidate);
      if (assign(index + 1)) {
        return true;
      }
      seeds.pop();
      used.delete(candidate);
    }
    return false;
  };
  return assign(0) ? seeds : null;
}
