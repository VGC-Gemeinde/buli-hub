import { describe, expect, it } from "vitest";
import { moveCard, moveType } from "./move-card";

describe("moveCard", () => {
  it("gives Champions values where Champions changed them", () => {
    expect(moveCard("Apple Acid")).toMatchObject({
      type: "Grass",
      basePower: 90,
      accuracy: 100,
    });
  });

  it("applies the overrides for values newer than the release", () => {
    expect(moveCard("Meteor Assault")?.basePower).toBe(170);
    expect(moveCard("Slash")?.basePower).toBe(80);
  });

  it("carries the short description and accuracy true for never-miss moves", () => {
    expect(moveCard("Fake Out")).toEqual({
      name: "Fake Out",
      type: "Normal",
      basePower: 40,
      accuracy: 100,
      shortDesc: "Hits first. First turn out only. 100% flinch chance.",
    });
    expect(moveCard("Kowtow Cleave")?.accuracy).toBe(true);
    expect(moveCard("Protect")?.basePower).toBe(0);
  });

  it("finds a move by any spelling and is null for an unknown one", () => {
    expect(moveCard("fake out")?.name).toBe("Fake Out");
    expect(moveCard("Unknown Move")).toBeNull();
    expect(moveType("Unknown Move")).toBeNull();
    expect(moveType("Heat Wave")).toBe("Fire");
  });
});
