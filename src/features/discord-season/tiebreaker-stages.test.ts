import { describe, expect, it } from "vitest";
import {
  finalTable,
  type TableInput,
  type TieDecision,
} from "@/features/final-table/places";
import { tiebreakerStages } from "./tiebreaker-stages";

const NO_ZONES = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

// A group of the given players with competition ranks; equal ranks across a
// zone boundary become a tie.
function table(
  ids: string[],
  ranks: number[],
  counts: Partial<TableInput["counts"]>,
  decided: ReadonlyMap<string, TieDecision> = new Map(),
  subDivisionId = "g1",
) {
  return finalTable(
    {
      tier: 2,
      subDivisionId,
      groupPosition: 0,
      groupLot: 0.5,
      rows: ids.map((userId, i) => ({
        userId,
        rank: ranks[i],
        dropped: false,
        lot: i / 10,
      })),
      counts: { ...NO_ZONES, ...counts },
    },
    decided,
  );
}

const asObject = (map: Map<string, string[]>) => Object.fromEntries(map);

describe("tiebreakerStages", () => {
  it("puts a tie at the playoff boundary into the Playoffs room", () => {
    const t = table(["a", "b", "c", "d"], [1, 2, 2, 4], { champion: 2 });
    expect(asObject(tiebreakerStages([t]))).toEqual({
      b: ["playoff"],
      c: ["playoff"],
    });
  });

  it("puts a tie at the promotion relegation seat into the Relegation room", () => {
    const t = table(["a", "b", "c", "d"], [1, 2, 2, 4], {
      promotions: 1,
      promotionPlayoff: 1,
    });
    expect(asObject(tiebreakerStages([t]))).toEqual({
      b: ["relegation"],
      c: ["relegation"],
    });
  });

  it("counts a tie between direct promotion and the relegation seat", () => {
    const t = table(["a", "b", "c", "d"], [1, 1, 3, 4], {
      promotions: 1,
      promotionPlayoff: 1,
    });
    expect(asObject(tiebreakerStages([t]))).toEqual({
      a: ["relegation"],
      b: ["relegation"],
    });
  });

  it("puts a tie at the demotion relegation seat into the Relegation room", () => {
    const t = table(["a", "b", "c", "d"], [1, 2, 3, 3], {
      demotionPlayoff: 1,
      demotions: 1,
    });
    expect(asObject(tiebreakerStages([t]))).toEqual({
      c: ["relegation"],
      d: ["relegation"],
    });
  });

  it("gives no room for a tie between zones that are not played", () => {
    const t = table(["a", "b", "c"], [1, 1, 3], { promotions: 1 });
    expect(t.ties).toHaveLength(1);
    expect(tiebreakerStages([t]).size).toBe(0);
  });

  it("gives no room once the tie is decided", () => {
    const decided = new Map<string, TieDecision>([["group:g1:1", ["c", "b"]]]);
    const t = table(
      ["a", "b", "c", "d"],
      [1, 2, 2, 4],
      { champion: 2 },
      decided,
    );
    expect(tiebreakerStages([t]).size).toBe(0);
  });

  it("gives no room once both lost the tiebreaker", () => {
    const decided = new Map<string, TieDecision>([["group:g1:1", "vacant"]]);
    const t = table(
      ["a", "b", "c", "d"],
      [1, 2, 2, 4],
      { champion: 2 },
      decided,
    );
    expect(tiebreakerStages([t]).size).toBe(0);
  });

  it("counts a staff order (three or more) like a tiebreaker", () => {
    const t = table(["a", "b", "c", "d"], [1, 2, 2, 2], { champion: 2 });
    expect(t.ties[0]?.decision).toBe("staff_order");
    expect(asObject(tiebreakerStages([t]))).toEqual({
      b: ["playoff"],
      c: ["playoff"],
      d: ["playoff"],
    });
  });

  it("gives no room once the staff order is set", () => {
    const decided = new Map<string, TieDecision>([
      ["group:g1:1", ["d", "b", "c"]],
    ]);
    const t = table(
      ["a", "b", "c", "d"],
      [1, 2, 2, 2],
      { champion: 2 },
      decided,
    );
    expect(tiebreakerStages([t]).size).toBe(0);
  });

  it("collects the ties of every table", () => {
    const top = table(
      ["a", "b", "c"],
      [1, 2, 2],
      { champion: 2 },
      new Map(),
      "g1",
    );
    const low = table(
      ["d", "e", "f"],
      [1, 1, 3],
      { promotionPlayoff: 1 },
      new Map(),
      "g2",
    );
    expect(asObject(tiebreakerStages([top, low]))).toEqual({
      b: ["playoff"],
      c: ["playoff"],
      d: ["relegation"],
      e: ["relegation"],
    });
  });

  it("is empty without tables or ties", () => {
    expect(tiebreakerStages([]).size).toBe(0);
    const t = table(["a", "b"], [1, 2], { champion: 1 });
    expect(tiebreakerStages([t]).size).toBe(0);
  });
});
