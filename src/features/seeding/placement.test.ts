import { describe, expect, it } from "vitest";
import { orderForPlacement, seedingCaveats } from "./placement";

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
