import { describe, expect, it } from "vitest";
import type { SeedingPlayer } from "./placement";
import { assembleSheetRows, playerMatchesFilter } from "./sheet";

let seq = 0;
function player(overrides: Partial<SeedingPlayer> = {}): SeedingPlayer {
  seq += 1;
  return {
    userId: `u${seq}`,
    displayName: `Player ${seq}`,
    username: `player${seq}`,
    avatarUrl: null,
    status: "new",
    platform: "showdown",
    participatedBefore: false,
    skillSelfRating: 5,
    prevSeason: null,
    prevName: null,
    prevDivision: null,
    prevPlacement: null,
    greatestAchievements: null,
    divisionId: null,
    subDivisionId: null,
    ...overrides,
  };
}

const noFilter = { query: "", status: "all" } as const;

describe("playerMatchesFilter", () => {
  it("matches by name substring, case-insensitive", () => {
    const p = player({ displayName: "Kuro VGC" });
    expect(playerMatchesFilter(p, { query: "kuro", status: "all" })).toBe(true);
    expect(playerMatchesFilter(p, { query: "xyz", status: "all" })).toBe(false);
  });

  it("filters by status", () => {
    const p = player({ status: "returning" });
    expect(playerMatchesFilter(p, { query: "", status: "returning" })).toBe(
      true,
    );
    expect(playerMatchesFilter(p, { query: "", status: "new" })).toBe(false);
  });
});

describe("assembleSheetRows", () => {
  it("is just the empty unplaced separator for an empty season", () => {
    const rows = assembleSheetRows({
      players: [],
      divisions: [],
      subDivisions: [],
      size: 8,
      filter: noFilter,
    });
    expect(rows).toEqual([{ kind: "unplaced", count: 0 }]);
  });

  it("lists unplaced players under the separator", () => {
    const rows = assembleSheetRows({
      players: [player(), player()],
      divisions: [],
      subDivisions: [],
      size: 8,
      filter: noFilter,
    });
    expect(rows[0]).toEqual({ kind: "unplaced", count: 2 });
    expect(rows.filter((r) => r.kind === "player")).toHaveLength(2);
  });

  it("shows an empty-division hint for a division with no players", () => {
    const rows = assembleSheetRows({
      players: [],
      divisions: [{ id: "d1", tier: 1 }],
      subDivisions: [],
      size: 8,
      filter: noFilter,
    });
    expect(rows.some((r) => r.kind === "empty-division")).toBe(true);
    const div = rows.find((r) => r.kind === "division");
    expect(div).toMatchObject({ hasGroups: false, count: 0 });
  });

  it("lists a division's players when it has no groups", () => {
    const rows = assembleSheetRows({
      players: [player({ divisionId: "d1" }), player({ divisionId: "d1" })],
      divisions: [{ id: "d1", tier: 1 }],
      subDivisions: [],
      size: 8,
      filter: noFilter,
    });
    const div = rows.find((r) => r.kind === "division");
    expect(div).toMatchObject({ count: 2, hasGroups: false, groupCount: 1 });
    expect(rows.filter((r) => r.kind === "player")).toHaveLength(2);
  });

  it("groups players under sub-division separators with platform counts", () => {
    const rows = assembleSheetRows({
      players: [
        player({ divisionId: "d1", subDivisionId: "s1", platform: "showdown" }),
        player({
          divisionId: "d1",
          subDivisionId: "s1",
          platform: "cartridge",
        }),
      ],
      divisions: [{ id: "d1", tier: 1 }],
      subDivisions: [{ id: "s1", divisionId: "d1", position: 0 }],
      size: 8,
      filter: noFilter,
    });
    const sub = rows.find((r) => r.kind === "subdivision");
    expect(sub).toMatchObject({ count: 2, showdown: 1, cartridge: 1 });
  });

  it("adds an ungrouped section for stragglers after generation", () => {
    const rows = assembleSheetRows({
      players: [
        player({ divisionId: "d1", subDivisionId: "s1" }),
        player({ divisionId: "d1", subDivisionId: null }),
      ],
      divisions: [{ id: "d1", tier: 1 }],
      subDivisions: [{ id: "s1", divisionId: "d1", position: 0 }],
      size: 8,
      filter: noFilter,
    });
    expect(rows.find((r) => r.kind === "ungrouped")).toMatchObject({
      count: 1,
    });
  });

  it("filters player rows but keeps separator counts", () => {
    const rows = assembleSheetRows({
      players: [
        player({ displayName: "Alice" }),
        player({ displayName: "Bob" }),
      ],
      divisions: [],
      subDivisions: [],
      size: 8,
      filter: { query: "alice", status: "all" },
    });
    expect(rows[0]).toEqual({ kind: "unplaced", count: 2 });
    expect(rows.filter((r) => r.kind === "player")).toHaveLength(1);
  });
});
