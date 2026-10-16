import { describe, expect, it } from "vitest";
import { finalTable, seatsOf, type TableInput, type TableRow } from "./places";

const NO_ZONES = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

// Rows in standings order; `ranks` are the competition ranks, lots default
// to the row's position so "lower lot wins" is easy to steer.
function rows(
  ids: string[],
  ranks: number[] = ids.map((_, i) => i + 1),
  extra: Partial<Record<string, Partial<TableRow>>> = {},
): TableRow[] {
  return ids.map((userId, i) => ({
    userId,
    rank: ranks[i],
    dropped: false,
    lot: i / 10,
    ...extra[userId],
  }));
}

function table(over: Partial<TableInput>): TableInput {
  return {
    tier: 2,
    subDivisionId: "g1",
    groupPosition: 0,
    groupLot: 0.5,
    rows: [],
    counts: NO_ZONES,
    ...over,
  };
}

function holders(t: ReturnType<typeof finalTable>) {
  return t.places.map((place) =>
    place.holder.kind === "player"
      ? place.holder.userId
      : place.holder.kind === "vacant"
        ? "vacant"
        : `tie(${place.holder.candidates.join("|")})`,
  );
}

describe("finalTable", () => {
  it("keeps the standings order and assigns zones positionally", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c", "d"]),
        counts: { ...NO_ZONES, promotions: 1, demotionPlayoff: 1 },
      }),
    );
    expect(holders(t)).toEqual(["a", "b", "c", "d"]);
    expect(t.places.map((p) => p.zone)).toEqual([
      "promote",
      "none",
      "none",
      "demotion_playoff",
    ]);
    expect(t.ties).toEqual([]);
  });

  it("numbers places within their zone band", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c", "d", "e"]),
        counts: { ...NO_ZONES, demotionPlayoff: 2, demotions: 1 },
      }),
    );
    expect(t.places.map((p) => [p.zone, p.zoneIndex])).toEqual([
      ["none", 0],
      ["none", 1],
      ["demotion_playoff", 0],
      ["demotion_playoff", 1],
      ["demote", 0],
    ]);
  });

  it("moves dropped players behind everyone, ordered by lot", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "x", "b", "y"], [1, 2, 3, 4], {
          x: { dropped: true, lot: 0.9 },
          y: { dropped: true, lot: 0.1 },
        }),
      }),
    );
    expect(holders(t)).toEqual(["a", "b", "y", "x"]);
  });

  it("orders a tie inside one zone by lot, without a tiebreaker", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c", "d"], [1, 2, 2, 4], {
          b: { lot: 0.8 },
          c: { lot: 0.2 },
        }),
        counts: { ...NO_ZONES, promotions: 1 },
      }),
    );
    expect(holders(t)).toEqual(["a", "c", "b", "d"]);
    expect(t.ties).toEqual([]);
  });

  it("turns a two-player tie across a boundary into a tiebreaker", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c", "d"], [1, 2, 2, 4]),
        counts: { ...NO_ZONES, promotions: 1, promotionPlayoff: 1 },
      }),
    );
    expect(holders(t)).toEqual(["a", "tie(b|c)", "tie(b|c)", "d"]);
    expect(t.ties).toEqual([
      expect.objectContaining({
        key: "group:g1:1",
        indexes: [1, 2],
        zones: ["promotion_playoff", "none"],
        userIds: ["b", "c"],
        decision: "tiebreaker",
      }),
    ]);
  });

  it("asks staff for an order when three or more tie across a boundary", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c", "d", "e"], [1, 1, 1, 4, 5]),
        counts: { ...NO_ZONES, champion: 2 },
      }),
    );
    expect(t.ties).toHaveLength(1);
    expect(t.ties[0]).toMatchObject({
      indexes: [0, 1, 2],
      zones: ["champion", "champion", "none"],
      decision: "staff_order",
    });
  });

  it("detects a tie at the demotion end", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c", "d"], [1, 2, 3, 3]),
        counts: { ...NO_ZONES, demotionPlayoff: 1, demotions: 1 },
      }),
    );
    expect(t.ties[0]).toMatchObject({
      indexes: [2, 3],
      zones: ["demotion_playoff", "demote"],
    });
  });

  it("never ties dropped players, even at equal rank", () => {
    const t = finalTable(
      table({
        rows: rows(["a", "b", "c"], [1, 2, 2], {
          b: { dropped: true, lot: 0.7 },
          c: { dropped: true, lot: 0.3 },
        }),
        counts: { ...NO_ZONES, demotionPlayoff: 1, demotions: 1 },
      }),
    );
    expect(t.ties).toEqual([]);
    expect(holders(t)).toEqual(["a", "c", "b"]);
  });

  it("seats a decided tie in its decided order", () => {
    const input = table({
      rows: rows(["a", "b", "c", "d"], [1, 2, 2, 4]),
      counts: { ...NO_ZONES, promotions: 1, promotionPlayoff: 1 },
    });
    const t = finalTable(input, new Map([["group:g1:1", ["c", "b"]]]));
    expect(holders(t)).toEqual(["a", "c", "b", "d"]);
    // The tie is still reported: it existed, it is just decided.
    expect(t.ties).toHaveLength(1);
  });

  it("leaves every place of a tie lost by both empty", () => {
    const input = table({
      rows: rows(["a", "b", "c", "d"], [1, 2, 2, 4]),
      counts: { ...NO_ZONES, promotions: 1, promotionPlayoff: 1 },
    });
    const t = finalTable(input, new Map([["group:g1:1", "vacant"]]));
    expect(holders(t)).toEqual(["a", "vacant", "vacant", "d"]);
  });

  it("ignores a decision that does not name exactly the tied players", () => {
    const input = table({
      rows: rows(["a", "b", "c", "d"], [1, 2, 2, 4]),
      counts: { ...NO_ZONES, promotions: 1, promotionPlayoff: 1 },
    });
    const t = finalTable(input, new Map([["group:g1:1", ["c", "d"]]]));
    expect(holders(t)).toEqual(["a", "tie(b|c)", "tie(b|c)", "d"]);
  });

  it("keys a division-mode table by its tier", () => {
    const t = finalTable(
      table({ subDivisionId: null, groupPosition: null, groupLot: null }),
    );
    expect(t.key).toBe("division:2");
  });
});

describe("seatsOf", () => {
  it("collects one zone's seats across tables with their group lot", () => {
    const tables = [
      finalTable(
        table({
          subDivisionId: "g1",
          groupLot: 0.3,
          rows: rows(["a", "b", "c"]),
          counts: { ...NO_ZONES, demotionPlayoff: 1 },
        }),
      ),
      finalTable(
        table({
          subDivisionId: "g2",
          groupPosition: 1,
          groupLot: 0.6,
          rows: rows(["d", "e", "f"]),
          counts: { ...NO_ZONES, demotionPlayoff: 1 },
        }),
      ),
    ];
    expect(
      seatsOf(tables, "demotion_playoff").map((seat) => [
        seat.tableKey,
        seat.index,
        seat.groupLot,
      ]),
    ).toEqual([
      ["group:g1", 2, 0.3],
      ["group:g2", 2, 0.6],
    ]);
  });
});
