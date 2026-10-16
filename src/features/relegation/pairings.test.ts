import { describe, expect, it } from "vitest";
import { type FinalTable, finalTable } from "@/features/final-table/places";
import { boundaryName, relegationBoundaries } from "./pairings";

const NONE = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

// A group table whose players are named `${prefix}${place}`.
function group(input: {
  tier: number;
  id: string;
  position?: number;
  lot: number;
  size: number;
  counts: Partial<typeof NONE>;
}): FinalTable {
  return finalTable({
    tier: input.tier,
    subDivisionId: input.id,
    groupPosition: input.position ?? 0,
    groupLot: input.lot,
    rows: Array.from({ length: input.size }, (_, i) => ({
      userId: `${input.id}${i + 1}`,
      rank: i + 1,
      dropped: false,
      lot: 0,
    })),
    counts: { ...NONE, ...input.counts },
  });
}

function names(boundary: ReturnType<typeof relegationBoundaries>[number]) {
  return boundary.pairings.map((pairing) => {
    const holder = (seat: typeof pairing.upper) =>
      seat.holder.kind === "player" ? seat.holder.userId : "tie";
    return `${holder(pairing.upper)}-${holder(pairing.lower)}`;
  });
}

describe("relegationBoundaries", () => {
  it("pairs the best promotion seat with the worst demotion seat", () => {
    const tables = new Map([
      [
        1,
        [
          group({
            tier: 1,
            id: "A",
            lot: 0,
            size: 6,
            counts: { demotionPlayoff: 2 },
          }),
        ],
      ],
      [
        2,
        [
          group({
            tier: 2,
            id: "B",
            lot: 0,
            size: 6,
            counts: { promotionPlayoff: 2 },
          }),
        ],
      ],
    ]);
    const [boundary] = relegationBoundaries(tables);
    expect(boundary.upperTier).toBe(1);
    expect(boundary.lowerTier).toBe(2);
    expect(names(boundary)).toEqual(["A6-B1", "A5-B2"]);
  });

  it("orders equally good seats of different groups by group lot", () => {
    const tables = new Map([
      [
        1,
        [
          group({
            tier: 1,
            id: "P",
            lot: 0.9,
            size: 4,
            counts: { demotionPlayoff: 1 },
          }),
          group({
            tier: 1,
            id: "Q",
            position: 1,
            lot: 0.1,
            size: 4,
            counts: { demotionPlayoff: 1 },
          }),
        ],
      ],
      [
        2,
        [
          group({
            tier: 2,
            id: "R",
            lot: 0.4,
            size: 4,
            counts: { promotionPlayoff: 1 },
          }),
          group({
            tier: 2,
            id: "S",
            position: 1,
            lot: 0.2,
            size: 4,
            counts: { promotionPlayoff: 1 },
          }),
        ],
      ],
    ]);
    const [boundary] = relegationBoundaries(tables);
    // Upper: Q (lot 0.1) before P; lower: S (lot 0.2) before R.
    expect(names(boundary)).toEqual(["Q4-S1", "P4-R1"]);
  });

  it("compares band positions across groups of different size", () => {
    const tables = new Map([
      [
        1,
        [
          group({
            tier: 1,
            id: "P",
            lot: 0.1,
            size: 5,
            counts: { demotionPlayoff: 2 },
          }),
          group({
            tier: 1,
            id: "Q",
            position: 1,
            lot: 0.2,
            size: 4,
            counts: { demotionPlayoff: 2 },
          }),
        ],
      ],
      [
        2,
        [
          group({
            tier: 2,
            id: "R",
            lot: 0,
            size: 8,
            counts: { promotionPlayoff: 4 },
          }),
        ],
      ],
    ]);
    const [boundary] = relegationBoundaries(tables);
    // Worst first: both groups' last band seat (P5, Q4), then the better ones.
    expect(names(boundary)).toEqual(["P5-R1", "Q4-R2", "P4-R3", "Q3-R4"]);
  });

  it("covers every boundary that has seats, top to bottom", () => {
    const tables = new Map([
      [
        1,
        [
          group({
            tier: 1,
            id: "A",
            lot: 0,
            size: 4,
            counts: { demotionPlayoff: 1 },
          }),
        ],
      ],
      [
        2,
        [
          group({
            tier: 2,
            id: "B",
            lot: 0,
            size: 4,
            counts: { promotionPlayoff: 1, demotionPlayoff: 1 },
          }),
        ],
      ],
      [
        3,
        [
          group({
            tier: 3,
            id: "C",
            lot: 0,
            size: 4,
            counts: { promotionPlayoff: 1 },
          }),
        ],
      ],
    ]);
    const boundaries = relegationBoundaries(tables);
    expect(boundaries.map((b) => [b.upperTier, b.lowerTier])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(names(boundaries[1])).toEqual(["B4-C1"]);
  });

  it("skips a boundary without relegation seats", () => {
    const tables = new Map([
      [
        1,
        [
          group({
            tier: 1,
            id: "A",
            lot: 0,
            size: 4,
            counts: { demotions: 1 },
          }),
        ],
      ],
      [
        2,
        [
          group({
            tier: 2,
            id: "B",
            lot: 0,
            size: 4,
            counts: { promotions: 1 },
          }),
        ],
      ],
    ]);
    expect(relegationBoundaries(tables)).toEqual([]);
  });

  it("keeps a seat with an open tie in its place", () => {
    const tables = new Map([
      [
        1,
        [
          group({
            tier: 1,
            id: "A",
            lot: 0,
            size: 4,
            counts: { demotionPlayoff: 1 },
          }),
        ],
      ],
      [
        2,
        [
          finalTable({
            tier: 2,
            subDivisionId: "B",
            groupPosition: 0,
            groupLot: 0,
            rows: [
              { userId: "B1", rank: 1, dropped: false, lot: 0 },
              { userId: "B2", rank: 1, dropped: false, lot: 0 },
              { userId: "B3", rank: 3, dropped: false, lot: 0 },
            ],
            counts: { ...NONE, promotions: 1, promotionPlayoff: 1 },
          }),
        ],
      ],
    ]);
    const [boundary] = relegationBoundaries(tables);
    expect(boundary.pairings[0].lower.index).toBe(1);
    expect(boundary.pairings[0].lower.holder).toEqual({
      kind: "tie",
      tieKey: "group:B:0",
      candidates: ["B1", "B2"],
    });
  });
});

describe("boundaryName", () => {
  it("names both divisions", () => {
    expect(boundaryName(1, 2)).toBe("Division 1 und 2");
  });
});
