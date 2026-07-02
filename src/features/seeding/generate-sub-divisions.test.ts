import { describe, expect, it } from "vitest";
import type { Platform } from "@/features/registration/registration";
import {
  computeGroupSizes,
  generateSubDivisions,
} from "./generate-sub-divisions";

describe("computeGroupSizes", () => {
  it("is empty for no players", () => {
    expect(computeGroupSizes(0, 8)).toEqual([]);
  });

  it("is one group when fewer players than the size", () => {
    expect(computeGroupSizes(5, 8)).toEqual([5]);
  });

  it("splits exact multiples evenly", () => {
    expect(computeGroupSizes(16, 8)).toEqual([8, 8]);
    expect(computeGroupSizes(24, 8)).toEqual([8, 8, 8]);
  });

  it("spreads remainders evenly, larger groups first", () => {
    expect(computeGroupSizes(20, 8)).toEqual([7, 7, 6]);
    expect(computeGroupSizes(7, 3)).toEqual([3, 2, 2]);
    expect(computeGroupSizes(10, 4)).toEqual([4, 3, 3]);
  });

  it("never creates a group larger than the size", () => {
    for (let n = 1; n <= 100; n++) {
      const sizes = computeGroupSizes(n, 8);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(8);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });
});

function players(platforms: Platform[]): { id: number; platform: Platform }[] {
  return platforms.map((platform, id) => ({ id, platform }));
}

describe("generateSubDivisions", () => {
  it("returns no groups for no players", () => {
    expect(generateSubDivisions([], 8)).toEqual([]);
  });

  it("produces balanced group sizes matching computeGroupSizes", () => {
    const groups = generateSubDivisions(players(Array(20).fill("showdown")), 8);
    expect(groups.map((g) => g.length)).toEqual([7, 7, 6]);
  });

  it("keeps a single platform fully together", () => {
    const groups = generateSubDivisions(
      players(Array(16).fill("cartridge")),
      8,
    );
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.every((p) => p.platform === "cartridge")).toBe(true);
    }
  });

  it("keeps platforms pure when counts align to group sizes", () => {
    // 8 showdown + 8 cartridge, size 8 → two pure groups.
    const groups = generateSubDivisions(
      players([...Array(8).fill("showdown"), ...Array(8).fill("cartridge")]),
      8,
    );
    expect(groups).toHaveLength(2);
    const platformsPerGroup = groups.map(
      (g) => new Set(g.map((p) => p.platform)).size,
    );
    expect(platformsPerGroup).toEqual([1, 1]);
  });

  it("mixes only at the boundary when platforms do not align", () => {
    // 12 showdown + 8 cartridge, size 8 → [7,7,6]; at most one mixed group.
    const groups = generateSubDivisions(
      players([...Array(12).fill("showdown"), ...Array(8).fill("cartridge")]),
      8,
    );
    const mixed = groups.filter(
      (g) => new Set(g.map((p) => p.platform)).size > 1,
    );
    expect(mixed.length).toBeLessThanOrEqual(1);
  });

  it("places every player exactly once", () => {
    const input = players([
      ...Array(9).fill("showdown"),
      ...Array(5).fill("cartridge"),
    ]);
    const groups = generateSubDivisions(input, 4);
    const ids = groups
      .flat()
      .map((p) => p.id)
      .sort((a, b) => a - b);
    expect(ids).toEqual(input.map((p) => p.id));
  });
});
