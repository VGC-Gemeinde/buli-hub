import { describe, expect, it } from "vitest";
import {
  autoDivisionPlacements,
  orderForPlacement,
  seedingCaveats,
  seedingReadiness,
  suggestedDivisionCount,
} from "./placement";

describe("seedingCaveats", () => {
  it("flags self-reported veteran history", () => {
    expect(
      seedingCaveats({ status: "returning", participatedBefore: true }),
    ).toEqual([{ kind: "self_reported", label: "Selbst angegeben" }]);
  });

  it("does not flag a detected returner (participatedBefore null)", () => {
    expect(
      seedingCaveats({ status: "returning", participatedBefore: null }),
    ).toEqual([]);
  });

  it("does not flag new players", () => {
    expect(
      seedingCaveats({ status: "new", participatedBefore: false }),
    ).toEqual([]);
  });
});

describe("seedingReadiness", () => {
  it("is not ready with no players", () => {
    expect(seedingReadiness([])).toEqual({
      total: 0,
      grouped: 0,
      ready: false,
    });
  });

  it("is not ready while some players are ungrouped", () => {
    expect(
      seedingReadiness([{ subDivisionId: "a" }, { subDivisionId: null }]),
    ).toEqual({ total: 2, grouped: 1, ready: false });
  });

  it("is ready when every player is in a group", () => {
    expect(
      seedingReadiness([{ subDivisionId: "a" }, { subDivisionId: "b" }]),
    ).toEqual({ total: 2, grouped: 2, ready: true });
  });
});

describe("suggestedDivisionCount", () => {
  it("is 0 when nobody reported a previous division", () => {
    expect(
      suggestedDivisionCount([{ prevDivision: null }, { prevDivision: null }]),
    ).toBe(0);
  });

  it("returns the largest reported previous division", () => {
    expect(
      suggestedDivisionCount([
        { prevDivision: 2 },
        { prevDivision: null },
        { prevDivision: 5 },
        { prevDivision: 3 },
      ]),
    ).toBe(5);
  });
});

describe("autoDivisionPlacements", () => {
  it("places returning players into their previous division", () => {
    expect(
      autoDivisionPlacements(
        [
          { userId: "a", prevDivision: 1 },
          { userId: "b", prevDivision: 3 },
        ],
        3,
      ),
    ).toEqual([
      { userId: "a", tier: 1 },
      { userId: "b", tier: 3 },
    ]);
  });

  it("skips players without a previous division (new players)", () => {
    expect(
      autoDivisionPlacements(
        [
          { userId: "a", prevDivision: null },
          { userId: "b", prevDivision: 2 },
        ],
        3,
      ),
    ).toEqual([{ userId: "b", tier: 2 }]);
  });

  it("skips previous divisions outside 1..divisionCount", () => {
    expect(
      autoDivisionPlacements(
        [
          { userId: "a", prevDivision: 4 },
          { userId: "b", prevDivision: 0 },
          { userId: "c", prevDivision: 2 },
        ],
        3,
      ),
    ).toEqual([{ userId: "c", tier: 2 }]);
  });
});

describe("orderForPlacement", () => {
  it("puts returning players before new players", () => {
    const ordered = orderForPlacement([
      { status: "new", skillSelfRating: 9 },
      { status: "returning", skillSelfRating: null },
    ]);
    expect(ordered.map((p) => p.status)).toEqual(["returning", "new"]);
  });

  it("sorts new players by self-rating descending", () => {
    const ordered = orderForPlacement([
      { status: "new", skillSelfRating: 3 },
      { status: "new", skillSelfRating: 8 },
      { status: "new", skillSelfRating: 5 },
    ]);
    expect(ordered.map((p) => p.skillSelfRating)).toEqual([8, 5, 3]);
  });

  it("keeps returning players stable among themselves", () => {
    const ordered = orderForPlacement([
      { status: "returning", skillSelfRating: null, id: "a" },
      { status: "returning", skillSelfRating: null, id: "b" },
    ]);
    expect(ordered.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const input = [
      { status: "new" as const, skillSelfRating: 1 },
      { status: "new" as const, skillSelfRating: 9 },
    ];
    orderForPlacement(input);
    expect(input.map((p) => p.skillSelfRating)).toEqual([1, 9]);
  });
});
