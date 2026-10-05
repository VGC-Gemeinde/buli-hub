import { describe, expect, it } from "vitest";
import { pickDemoFavorites } from "./favorites-persona";

describe("pickDemoFavorites", () => {
  const matches = [
    { groupId: "1a", playerAId: "a1", playerBId: null },
    { groupId: "1a", playerAId: "a2", playerBId: "a3" },
    { groupId: "1b", playerAId: "b1", playerBId: "b2" },
    { groupId: "2a", playerAId: "c1", playerBId: "c2" },
  ];

  it("starts with a duel, adds the dropped player, then one per group", () => {
    expect(pickDemoFavorites({ matches, droppedIds: ["d1"] })).toEqual([
      "a2",
      "a3",
      "d1",
      "b1",
      "c1",
    ]);
  });

  it("stops at the limit and never repeats a player", () => {
    expect(
      pickDemoFavorites({ matches, droppedIds: ["a2"], limit: 3 }),
    ).toEqual(["a2", "a3", "b1"]);
  });

  it("has nothing to pick without a running week", () => {
    expect(pickDemoFavorites({ matches: [], droppedIds: [] })).toEqual([]);
  });
});
