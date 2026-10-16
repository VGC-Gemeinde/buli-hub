import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  type MatchInput,
  recordAfterSeason,
  streamNaming,
  toStreamMatch,
  toStreamMatchDetail,
} from "./to-stream-match";

const alice = "00000000-0000-0000-0000-00000000000a";
const bob = "00000000-0000-0000-0000-00000000000b";
const carol = "00000000-0000-0000-0000-00000000000c";

const base: MatchInput = {
  id: "m1",
  round: 3,
  stage: "regular",
  weekName: "Spieltag 3",
  roundLabel: "Spieltag 3",
  tier: 1,
  group: { name: "Division 1b", shortName: "1b" },
  playerAId: alice,
  playerBId: bob,
  playerA: {
    displayName: "Alice",
    username: "alice",
    streamPhotoPath: "alice/photo.webp",
  },
  playerB: { displayName: null, username: "bobby", streamPhotoPath: null },
  platform: "showdown",
  reportedAt: new Date("2026-07-03T18:00:00Z"),
  motw: true,
  recording: true,
  games: [
    { gameNumber: 2, winnerId: bob },
    { gameNumber: 1, winnerId: alice },
    { gameNumber: 3, winnerId: alice },
  ],
  sheets: [
    { playerId: bob, ots: "Whimsicott @ Occa Berry" },
    { playerId: alice, ots: "Garchomp @ Life Orb" },
  ],
};

// Without a base URL every photo maps to null, and the mapping below would
// assert nothing. CI sets the variable for the build only, so the test sets
// its own.
beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://sb.test");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("toStreamMatchDetail", () => {
  it("maps names, groups, games in order, sheets and records by side", () => {
    const match = toStreamMatchDetail(base, {
      a: { wins: 4, losses: 1 },
      b: { wins: 2, losses: 3 },
    });
    expect(match).toEqual({
      id: "m1",
      round: 3,
      stage: "regular",
      weekName: "Spieltag 3",
      roundLabel: "Spieltag 3",
      division: { tier: 1, name: "Division 1" },
      group: { name: "Division 1b", shortName: "1b" },
      playerA: {
        id: alice,
        name: "Alice",
        photoUrl:
          "https://sb.test/storage/v1/object/public/stream-photos/alice/photo.webp",
        // The Discord avatar is no longer part of the stream payload.
        avatarUrl: null,
        record: { wins: 4, losses: 1 },
      },
      playerB: {
        id: bob,
        name: "bobby",
        photoUrl: null,
        avatarUrl: null,
        record: { wins: 2, losses: 3 },
      },
      games: ["a", "b", "a"],
      platform: "showdown",
      motw: true,
      recording: true,
      reportedAt: "2026-07-03T18:00:00.000Z",
      sheets: { a: "Garchomp @ Life Orb", b: "Whimsicott @ Occa Berry" },
    });
  });

  it("falls back to the generic player name without a profile", () => {
    const match = toStreamMatchDetail({ ...base, playerA: null });
    expect(match?.playerA.name).toBe("Discord-Nutzer");
  });

  it("reads 0-0 for a player the caller has no standings row for", () => {
    const match = toStreamMatchDetail(base);
    expect(match?.playerA.record).toEqual({ wins: 0, losses: 0 });
    expect(match?.playerB.record).toEqual({ wins: 0, losses: 0 });
  });

  it("is null for a result without platform or games", () => {
    expect(toStreamMatchDetail({ ...base, platform: null })).toBeNull();
    expect(toStreamMatchDetail({ ...base, games: [] })).toBeNull();
  });

  it("is null when a game winner is neither participant", () => {
    expect(
      toStreamMatchDetail({
        ...base,
        games: [{ gameNumber: 1, winnerId: carol }],
      }),
    ).toBeNull();
  });

  it("is null when a sheet is missing", () => {
    expect(
      toStreamMatchDetail({ ...base, sheets: base.sheets.slice(0, 1) }),
    ).toBeNull();
  });
});

describe("toStreamMatch", () => {
  it("drops photos, records and sheets", () => {
    const match = toStreamMatch(base);
    expect(match).not.toBeNull();
    expect(match).not.toHaveProperty("sheets");
    expect(match?.playerA).toEqual({ id: alice, name: "Alice" });
    expect(match?.games).toEqual(["a", "b", "a"]);
  });

  it("is null whenever the detail is", () => {
    expect(toStreamMatch({ ...base, platform: null })).toBeNull();
  });
});

describe("streamNaming", () => {
  const shape = { regularRounds: 7, playoffRounds: [8, 9, 10] };

  it("names a regular match by its Spieltag and group", () => {
    expect(
      streamNaming({
        stage: "regular",
        round: 3,
        tier: 2,
        groupPosition: 0,
        ...shape,
      }),
    ).toEqual({
      weekName: "Spieltag 3",
      roundLabel: "Spieltag 3",
      group: { name: "Division 2a", shortName: "2a" },
    });
  });

  it("names the stages after the regular season by week and stage", () => {
    expect(
      streamNaming({
        stage: "relegation",
        round: 8,
        tier: 1,
        groupPosition: null,
        ...shape,
      }),
    ).toEqual({
      weekName: "Woche 1",
      roundLabel: "Relegation",
      group: { name: "Division 1 und 2", shortName: "1/2" },
    });
    expect(
      streamNaming({
        stage: "playoff",
        round: 9,
        tier: 1,
        groupPosition: null,
        ...shape,
      }),
    ).toEqual({
      weekName: "Woche 2",
      roundLabel: "Playoffs · Halbfinale",
      group: { name: "Playoffs", shortName: "PO" },
    });
    expect(
      streamNaming({
        stage: "tiebreaker",
        round: 8,
        tier: 4,
        groupPosition: null,
        ...shape,
      }),
    ).toEqual({
      weekName: "Woche 1",
      roundLabel: "Tiebreaker",
      group: { name: "Division 4", shortName: "4" },
    });
  });
});

describe("recordAfterSeason", () => {
  it("adds the earlier matches after the season, minus withheld ones", () => {
    expect(
      recordAfterSeason({
        userId: alice,
        regular: { wins: 5, losses: 2 },
        earlier: [
          {
            matchId: "rel",
            round: 8,
            playerAId: alice,
            playerBId: bob,
            winnerId: alice,
          },
          {
            matchId: "held",
            round: 8,
            playerAId: carol,
            playerBId: alice,
            winnerId: carol,
          },
          {
            matchId: "dl",
            round: 8,
            playerAId: alice,
            playerBId: carol,
            winnerId: null,
          },
          {
            matchId: "later",
            round: 9,
            playerAId: alice,
            playerBId: bob,
            winnerId: alice,
          },
        ],
        beforeRound: 9,
        excluded: new Set(["held"]),
      }),
    ).toEqual({ wins: 6, losses: 3 });
  });
});
