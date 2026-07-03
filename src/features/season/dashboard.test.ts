import { describe, expect, it } from "vitest";
import {
  buildPlayerMatches,
  currentMatchday,
  dashboardState,
  daysUntil,
  type Identity,
  type MatchdayLite,
  opponentOf,
  type PlayerMatch,
  splitPlayerMatches,
} from "./dashboard";

describe("dashboardState", () => {
  const base = {
    phase: "not_started",
    registration: "not_started",
    hasRegistration: false,
    isPlaced: false,
  } as const;

  it("regular season: placed → in_season, else not_placed", () => {
    expect(
      dashboardState({ ...base, phase: "regular_season", isPlaced: true }),
    ).toBe("in_season");
    expect(
      dashboardState({ ...base, phase: "regular_season", isPlaced: false }),
    ).toBe("not_placed");
  });

  it("regular season ignores registration state", () => {
    expect(
      dashboardState({
        phase: "regular_season",
        registration: "open",
        hasRegistration: false,
        isPlaced: true,
      }),
    ).toBe("in_season");
  });

  it("no window → coming_soon", () => {
    expect(dashboardState({ ...base, registration: "not_started" })).toBe(
      "coming_soon",
    );
  });

  it("registration open branches on whether registered", () => {
    expect(
      dashboardState({
        ...base,
        phase: "registration_open",
        registration: "open",
        hasRegistration: false,
      }),
    ).toBe("register_cta");
    expect(
      dashboardState({
        ...base,
        phase: "registration_open",
        registration: "open",
        hasRegistration: true,
      }),
    ).toBe("registered_open");
  });

  it("registration closed branches on whether registered (seeded phase too)", () => {
    expect(
      dashboardState({
        ...base,
        phase: "registration_closed",
        registration: "closed",
        hasRegistration: true,
      }),
    ).toBe("registered_closed");
    expect(
      dashboardState({
        ...base,
        phase: "seeded",
        registration: "closed",
        hasRegistration: true,
      }),
    ).toBe("registered_closed");
    expect(
      dashboardState({
        ...base,
        phase: "registration_closed",
        registration: "closed",
        hasRegistration: false,
      }),
    ).toBe("not_registered_closed");
  });
});

describe("opponentOf", () => {
  it("returns the other player", () => {
    expect(opponentOf({ playerAId: "a", playerBId: "b" }, "a")).toBe("b");
    expect(opponentOf({ playerAId: "a", playerBId: "b" }, "b")).toBe("a");
  });
  it("returns null for a bye", () => {
    expect(opponentOf({ playerAId: "a", playerBId: null }, "a")).toBeNull();
  });
});

describe("currentMatchday", () => {
  const days: MatchdayLite[] = [
    { round: 1, startsOn: "2026-07-01", endsOn: "2026-07-07" },
    { round: 2, startsOn: "2026-07-08", endsOn: "2026-07-14" },
    { round: 3, startsOn: "2026-07-15", endsOn: "2026-07-21" },
  ];

  it("finds the active week", () => {
    expect(currentMatchday(days, "2026-07-10")?.round).toBe(2);
  });
  it("includes the window boundaries", () => {
    expect(currentMatchday(days, "2026-07-08")?.round).toBe(2);
    expect(currentMatchday(days, "2026-07-14")?.round).toBe(2);
  });
  it("before the season → first week", () => {
    expect(currentMatchday(days, "2026-06-30")?.round).toBe(1);
  });
  it("in a gap between weeks → next week", () => {
    const gapped: MatchdayLite[] = [
      { round: 1, startsOn: "2026-07-01", endsOn: "2026-07-05" },
      { round: 2, startsOn: "2026-07-10", endsOn: "2026-07-14" },
    ];
    expect(currentMatchday(gapped, "2026-07-07")?.round).toBe(2);
  });
  it("after the last week → null", () => {
    expect(currentMatchday(days, "2026-08-01")).toBeNull();
  });
  it("unordered input still works", () => {
    expect(currentMatchday([...days].reverse(), "2026-07-03")?.round).toBe(1);
  });
});

describe("splitPlayerMatches", () => {
  const m = (round: number, startsOn: string, endsOn: string): PlayerMatch => ({
    round,
    startsOn,
    endsOn,
    opponent: null,
  });
  const matches = [
    m(1, "2026-07-01", "2026-07-07"),
    m(2, "2026-07-08", "2026-07-14"),
    m(3, "2026-07-15", "2026-07-21"),
  ];

  it("next is the current week, rest upcoming", () => {
    const { next, upcoming, past } = splitPlayerMatches(matches, "2026-07-10");
    expect(next?.round).toBe(2);
    expect(upcoming.map((x) => x.round)).toEqual([3]);
    expect(past.map((x) => x.round)).toEqual([1]);
  });
  it("before the season, next is week 1", () => {
    const { next, past } = splitPlayerMatches(matches, "2026-06-01");
    expect(next?.round).toBe(1);
    expect(past).toHaveLength(0);
  });
  it("after the last week, no next", () => {
    const { next, upcoming, past } = splitPlayerMatches(matches, "2026-09-01");
    expect(next).toBeNull();
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(3);
  });
  it("sorts unordered input by round", () => {
    const { next } = splitPlayerMatches([...matches].reverse(), "2026-06-01");
    expect(next?.round).toBe(1);
  });
});

describe("daysUntil", () => {
  it("counts whole days, 0 today, negative overdue", () => {
    expect(daysUntil("2026-07-10", "2026-07-07")).toBe(3);
    expect(daysUntil("2026-07-07", "2026-07-07")).toBe(0);
    expect(daysUntil("2026-07-05", "2026-07-07")).toBe(-2);
  });
});

describe("buildPlayerMatches", () => {
  const roster = new Map<string, Identity>([
    ["me", { userId: "me", name: "Me", avatarUrl: null }],
    ["opp1", { userId: "opp1", name: "Opp One", avatarUrl: null }],
    ["opp2", { userId: "opp2", name: "Opp Two", avatarUrl: null }],
  ]);
  const matchdaysByRound = new Map([
    [1, { startsOn: "2026-07-01", endsOn: "2026-07-07" }],
    [2, { startsOn: "2026-07-08", endsOn: "2026-07-14" }],
    [3, { startsOn: "2026-07-15", endsOn: "2026-07-21" }],
  ]);

  it("keeps only the player's matches, resolves opponent + dates, sorts by round", () => {
    const result = buildPlayerMatches({
      matches: [
        { round: 2, playerAId: "opp2", playerBId: "me" },
        { round: 1, playerAId: "me", playerBId: "opp1" },
        { round: 1, playerAId: "opp1", playerBId: "opp2" }, // not mine
        { round: 3, playerAId: "me", playerBId: null }, // bye
      ],
      matchdaysByRound,
      rosterById: roster,
      userId: "me",
    });
    expect(result.map((r) => r.round)).toEqual([1, 2, 3]);
    expect(result[0].opponent?.userId).toBe("opp1");
    expect(result[0].endsOn).toBe("2026-07-07");
    expect(result[1].opponent?.userId).toBe("opp2");
    expect(result[2].opponent).toBeNull(); // bye
  });

  it("skips matches whose round has no matchday", () => {
    const result = buildPlayerMatches({
      matches: [{ round: 9, playerAId: "me", playerBId: "opp1" }],
      matchdaysByRound,
      rosterById: roster,
      userId: "me",
    });
    expect(result).toHaveLength(0);
  });
});
