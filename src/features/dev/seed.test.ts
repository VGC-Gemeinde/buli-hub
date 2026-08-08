import { describe, expect, it } from "vitest";
import { buildSeedRegistrations } from "./seed";

// Deterministic rng cycling through a few values.
function fakeRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("buildSeedRegistrations", () => {
  it("builds the requested count", () => {
    expect(buildSeedRegistrations(100)).toHaveLength(100);
    expect(buildSeedRegistrations(0)).toHaveLength(0);
  });

  it("produces valid registration shapes", () => {
    for (const spec of buildSeedRegistrations(200)) {
      expect(["showdown", "cartridge"]).toContain(spec.platform);
      expect(["new", "returning"]).toContain(spec.status);
      if (spec.status === "new") {
        expect(spec.skillSelfRating).toBeGreaterThanOrEqual(0);
        expect(spec.skillSelfRating).toBeLessThanOrEqual(10);
        expect(spec.prevSeason).toBeNull();
      } else {
        expect(spec.skillSelfRating).toBeNull();
        expect(spec.participatedBefore).toBe(true);
        expect(spec.prevDivision).toBeTruthy();
        // The veteran branch of the form never asks for achievements.
        expect(spec.greatestAchievements).toBeNull();
      }
    }
  });

  // The Erfolge column of the seeding sheet is only worth looking at if the
  // seed actually fills it — an all-dashes column hid layout problems.
  it("gives most new players an achievement, but not all", () => {
    const newPlayers = buildSeedRegistrations(400).filter(
      (spec) => spec.status === "new",
    );
    const filled = newPlayers.filter((spec) => spec.greatestAchievements);
    expect(filled.length).toBeGreaterThan(newPlayers.length / 2);
    expect(filled.length).toBeLessThan(newPlayers.length);
  });

  it("is deterministic given a fixed rng", () => {
    const a = buildSeedRegistrations(5, fakeRng([0.1, 0.5, 0.9, 0.2]));
    const b = buildSeedRegistrations(5, fakeRng([0.1, 0.5, 0.9, 0.2]));
    expect(a).toEqual(b);
  });
});
