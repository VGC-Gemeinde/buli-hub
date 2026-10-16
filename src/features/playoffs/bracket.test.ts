import { describe, expect, it } from "vitest";
import type { Seat } from "@/features/final-table/places";
import {
  bracketRounds,
  bracketSize,
  firstRoundSeeds,
  matchLabel,
  playoffMatches,
  roundName,
  seedOrder,
  seedPlayoffs,
  sideOrigin,
} from "./bracket";

function seat(group: string, zoneIndex: number, groupLot: number): Seat {
  return {
    tableKey: `group:${group}`,
    tier: 1,
    subDivisionId: group,
    groupPosition: 0,
    groupLot,
    zone: "champion",
    zoneIndex,
    index: zoneIndex,
    holder: { kind: "player", userId: `${group}${zoneIndex + 1}` },
    tieKey: null,
  };
}

// `groups` x `perGroup` champion seats; group lots in the given order.
function seats(groups: string[], perGroup: number, lots?: number[]): Seat[] {
  return groups.flatMap((group, g) =>
    Array.from({ length: perGroup }, (_, k) =>
      seat(group, k, lots?.[g] ?? g / 10),
    ),
  );
}

const ids = (list: Seat[] | null) =>
  list?.map((s) => (s.holder.kind === "player" ? s.holder.userId : "?"));

// Every first-round match of a seeded bracket pairs two different groups.
function separated(seeded: Seat[]): boolean {
  const n = seeded.length;
  for (const { round, position } of playoffMatches(n)) {
    if (round !== 1) continue;
    const [a, b] = firstRoundSeeds(n, position);
    if (seeded[a - 1].tableKey === seeded[b - 1].tableKey) return false;
  }
  return true;
}

describe("bracket shape", () => {
  it.each([
    [0, 0, 0],
    [1, 0, 0],
    [2, 1, 2],
    [3, 2, 4],
    [4, 2, 4],
    [5, 3, 8],
    [6, 3, 8],
    [8, 3, 8],
    [12, 4, 16],
  ])("%i players: %i rounds, size %i", (n, rounds, size) => {
    expect(bracketRounds(n)).toBe(rounds);
    expect(bracketSize(n)).toBe(size);
  });

  it("orders seeds so 1 and 2 meet in the final at the earliest", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("plays no first-round match for a bye", () => {
    // 6 players in a bracket of 8: seeds 1 and 2 have a bye.
    expect(playoffMatches(6)).toEqual([
      { round: 1, position: 1 },
      { round: 1, position: 3 },
      { round: 2, position: 0 },
      { round: 2, position: 1 },
      { round: 3, position: 0 },
    ]);
  });

  it.each([2, 3, 4, 5, 6, 8, 12])("%i players play n - 1 matches", (n) => {
    expect(playoffMatches(n)).toHaveLength(n - 1);
  });

  it("passes a bye's seed straight into the second round", () => {
    expect(sideOrigin(6, 2, 0, 0)).toEqual({ kind: "seed", seed: 1 });
    expect(sideOrigin(6, 2, 0, 1)).toEqual({
      kind: "winner",
      round: 1,
      position: 1,
    });
    expect(sideOrigin(8, 3, 0, 1)).toEqual({
      kind: "winner",
      round: 2,
      position: 1,
    });
  });

  it("names rounds from the final backwards", () => {
    expect(roundName(3, 3)).toBe("Finale");
    expect(roundName(3, 2)).toBe("Halbfinale");
    expect(roundName(3, 1)).toBe("Viertelfinale");
    expect(roundName(4, 1)).toBe("Achtelfinale");
    expect(roundName(5, 1)).toBe("Runde 1");
    expect(matchLabel(3, 1, 2)).toBe("VF 3");
    expect(matchLabel(3, 2, 0)).toBe("HF 1");
    expect(matchLabel(3, 3, 0)).toBe("Finale");
  });
});

describe("seedPlayoffs", () => {
  it("seeds all group winners before all runners-up, by group lot", () => {
    const seeded = seedPlayoffs(seats(["a", "b"], 2, [0.7, 0.2]));
    // b's lot is lower: b1 is seed 1. Runners-up follow the same order where
    // separation allows: 1 b1 - 4 ?, 2 a1 - 3 ?.
    expect(ids(seeded)).toEqual(["b1", "a1", "b2", "a2"]);
    expect(separated(seeded ?? [])).toBe(true);
  });

  it("departs from the lot order only as far as separation needs", () => {
    // Two groups of four, lots a < b: the plain lot order already separates.
    const seeded = seedPlayoffs(seats(["a", "b"], 4, [0.1, 0.2]));
    expect(ids(seeded)).toEqual([
      "a1",
      "b1",
      "a2",
      "b2",
      "a3",
      "b3",
      "a4",
      "b4",
    ]);
    expect(separated(seeded ?? [])).toBe(true);
  });

  it("separates three groups of two (with byes)", () => {
    const seeded = seedPlayoffs(seats(["a", "b", "c"], 2));
    expect(seeded).not.toBeNull();
    expect(separated(seeded ?? [])).toBe(true);
    // Winners keep the best seeds.
    expect(ids(seeded)?.slice(0, 3).sort()).toEqual(["a1", "b1", "c1"]);
  });

  it.each([
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ])("%i groups x %i places can always be separated", (groups, perGroup) => {
    const names = ["a", "b", "c", "d"].slice(0, groups);
    for (let shift = 0; shift < groups; shift++) {
      const lots = names.map((_, i) => ((i + shift) % groups) / 10);
      const seeded = seedPlayoffs(seats(names, perGroup, lots));
      expect(seeded).not.toBeNull();
      expect(separated(seeded ?? [])).toBe(true);
    }
  });

  it("does not separate a single division table", () => {
    const single = Array.from({ length: 4 }, (_, k) => ({
      ...seat("x", k, 0),
      tableKey: "division:1",
      subDivisionId: null,
    }));
    expect(ids(seedPlayoffs(single))).toEqual(["x1", "x2", "x3", "x4"]);
  });

  it("reports when no separated assignment exists", () => {
    // One group holds three of four seats: some first-round pair is same-group.
    const lopsided = [
      seat("a", 0, 0),
      seat("a", 1, 0),
      seat("a", 2, 0),
      seat("b", 0, 1),
    ];
    expect(seedPlayoffs(lopsided)).toBeNull();
  });
});
