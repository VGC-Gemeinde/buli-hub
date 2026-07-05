import { describe, expect, it } from "vitest";
import type { PublicDivision, PublicMatch } from "../public-league/queries";
import {
  findMotw,
  isYoutubeUrl,
  motwTodo,
  selectableRounds,
  youtubeUrlSchema,
} from "./motw";

describe("motwTodo", () => {
  const base = { currentRound: 3, totalRounds: 7 };

  it("is urgent when the current round has no pick", () => {
    expect(motwTodo({ ...base, selectedRounds: new Set() })).toEqual({
      round: 3,
      urgency: "urgent",
    });
  });

  it("surfaces only the urgent item while the current round is unpicked", () => {
    // Even a picked next week does not soften the current round's gap …
    expect(motwTodo({ ...base, selectedRounds: new Set([4]) })).toEqual({
      round: 3,
      urgency: "urgent",
    });
    // … and with both unpicked, the warning is replaced, not shown alongside.
    expect(motwTodo({ ...base, selectedRounds: new Set() })).toEqual({
      round: 3,
      urgency: "urgent",
    });
  });

  it("warns when only the next round has no pick", () => {
    expect(motwTodo({ ...base, selectedRounds: new Set([3]) })).toEqual({
      round: 4,
      urgency: "warning",
    });
  });

  it("is silent when current and next are picked", () => {
    expect(motwTodo({ ...base, selectedRounds: new Set([3, 4]) })).toBeNull();
  });

  it("does not warn past the last round", () => {
    expect(
      motwTodo({
        currentRound: 7,
        totalRounds: 7,
        selectedRounds: new Set([7]),
      }),
    ).toBeNull();
  });

  it("is silent outside a running round", () => {
    expect(
      motwTodo({
        currentRound: null,
        totalRounds: 7,
        selectedRounds: new Set(),
      }),
    ).toBeNull();
  });
});

describe("selectableRounds", () => {
  it("offers the current and next round", () => {
    expect(selectableRounds(3, 7)).toEqual(new Set([3, 4]));
  });
  it("offers only the last round at season end", () => {
    expect(selectableRounds(7, 7)).toEqual(new Set([7]));
  });
  it("is empty outside a running season", () => {
    expect(selectableRounds(null, 7)).toEqual(new Set());
  });
});

describe("youtubeUrlSchema", () => {
  it.each([
    "https://www.youtube.com/watch?v=abc123",
    "https://youtube.com/watch?v=abc123",
    "https://m.youtube.com/watch?v=abc123",
    "https://youtu.be/abc123",
    "https://www.youtube.com/live/abc123",
  ])("accepts %s", (url) => {
    expect(youtubeUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "http://www.youtube.com/watch?v=abc123", // not https
    "https://vimeo.com/12345", // wrong host
    "https://youtube.com.evil.example/watch", // host suffix trick
    "youtube.com/watch?v=abc123", // no scheme
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(youtubeUrlSchema.safeParse(url).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const parsed = youtubeUrlSchema.safeParse("  https://youtu.be/abc123  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe("https://youtu.be/abc123");
    }
  });

  it("isYoutubeUrl mirrors the schema", () => {
    expect(isYoutubeUrl("https://youtu.be/abc123")).toBe(true);
    expect(isYoutubeUrl("https://twitch.tv/vgc")).toBe(false);
  });
});

describe("findMotw", () => {
  const identity = (id: string) => ({ userId: id, name: id, avatarUrl: null });
  const standing = (userId: string, rank: number) => ({
    userId,
    name: userId,
    avatarUrl: null,
    wins: 0,
    losses: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    rank,
  });
  const match = (matchId: string, playerB: string | null): PublicMatch => ({
    matchId,
    round: 2,
    playerA: identity("a"),
    playerB: playerB ? identity(playerB) : null,
    reported: true,
    pending: false,
    scoreA: 2,
    scoreB: 0,
    winnerId: "a",
    isMotw: matchId === "m2",
  });
  const divisions: PublicDivision[] = [
    {
      tier: 1,
      name: "Division 1",
      mode: "sub_division",
      divisionStandings: null,
      divisionZones: null,
      divisionGroupLabels: null,
      groups: [
        {
          subDivisionId: "sd1",
          name: "Division 1a",
          shortName: "1a",
          standings: [standing("c", 1), standing("a", 4)],
          zones: null,
          matches: [match("m1", "b"), match("m2", "c")],
        },
      ],
    },
  ];

  it("finds the selected match with its group name and standings ranks", () => {
    const found = findMotw(divisions, {
      matchId: "m2",
      youtubeUrl: "https://youtu.be/x",
    });
    expect(found?.match.matchId).toBe("m2");
    expect(found?.groupName).toBe("Division 1a");
    expect(found?.youtubeUrl).toBe("https://youtu.be/x");
    expect(found?.rankA).toBe(4);
    expect(found?.rankB).toBe(1);
  });

  it("falls back to null ranks when a player is not in the table", () => {
    const found = findMotw(divisions, { matchId: "m1", youtubeUrl: null });
    expect(found?.rankA).toBe(4);
    expect(found?.rankB).toBeNull();
  });

  it("ranks from the Gesamttabelle in division mode", () => {
    const divisionMode: PublicDivision[] = [
      {
        ...divisions[0],
        mode: "division",
        divisionStandings: [standing("a", 7), standing("c", 2)],
      },
    ];
    const found = findMotw(divisionMode, { matchId: "m2", youtubeUrl: null });
    expect(found?.rankA).toBe(7);
    expect(found?.rankB).toBe(2);
  });

  it("returns null for an unknown match", () => {
    expect(
      findMotw(divisions, { matchId: "nope", youtubeUrl: null }),
    ).toBeNull();
  });

  it("returns null for a bye", () => {
    const withBye: PublicDivision[] = [
      {
        ...divisions[0],
        groups: [{ ...divisions[0].groups[0], matches: [match("m3", null)] }],
      },
    ];
    expect(findMotw(withBye, { matchId: "m3", youtubeUrl: null })).toBeNull();
  });
});
