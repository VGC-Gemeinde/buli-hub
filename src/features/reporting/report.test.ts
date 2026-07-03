import { describe, expect, it } from "vitest";
import {
  deriveSeries,
  isPokepasteUrl,
  type ReportInput,
  reportSchema,
  toResultRows,
} from "./report";

const ctx = {
  participants: { playerAId: "a", playerBId: "b" },
  isStaffOrAdmin: (id: string) => id === "staff1" || id === "admin1",
};
const parse = (input: unknown) => reportSchema(ctx).safeParse(input);
const PASTE_A = "https://pokepast.es/aaaa";
const PASTE_B = "https://pokepast.es/bbbb";
const REPLAY = "https://replay.pokemonshowdown.com/gen9-1";

function normal(overrides: Record<string, unknown> = {}) {
  return {
    outcome: "normal",
    platform: "showdown",
    games: [
      { won: true, replayUrl: REPLAY },
      { won: true, replayUrl: REPLAY },
    ],
    playerATeamUrl: PASTE_A,
    playerBTeamUrl: PASTE_B,
    ...overrides,
  };
}

describe("deriveSeries", () => {
  it("2–0 and 0–2 are decisive in two games", () => {
    expect(deriveSeries([true, true])).toEqual({
      ok: true,
      winner: "reporter",
      gamesPlayed: 2,
    });
    expect(deriveSeries([false, false])).toEqual({
      ok: true,
      winner: "opponent",
      gamesPlayed: 2,
    });
  });
  it("2–1 and 1–2 are decisive in three games", () => {
    expect(deriveSeries([true, false, true])).toMatchObject({
      ok: true,
      winner: "reporter",
      gamesPlayed: 3,
    });
    expect(deriveSeries([false, true, false])).toMatchObject({
      ok: true,
      winner: "opponent",
    });
  });
  it("rejects too few / too many", () => {
    expect(deriveSeries([true])).toEqual({ ok: false, reason: "too_few" });
    expect(deriveSeries([])).toEqual({ ok: false, reason: "too_few" });
    expect(deriveSeries([true, false, true, false])).toEqual({
      ok: false,
      reason: "too_many",
    });
  });
  it("rejects 1–1 without a decider", () => {
    expect(deriveSeries([true, false])).toEqual({
      ok: false,
      reason: "not_decisive",
    });
  });
  it("rejects a game played after the series was decided", () => {
    expect(deriveSeries([true, true, false])).toEqual({
      ok: false,
      reason: "extra_game",
    });
    expect(deriveSeries([false, false, true])).toEqual({
      ok: false,
      reason: "extra_game",
    });
    expect(deriveSeries([true, true, true])).toEqual({
      ok: false,
      reason: "extra_game",
    });
  });
});

describe("isPokepasteUrl", () => {
  it("accepts https pokepast.es links", () => {
    expect(isPokepasteUrl("https://pokepast.es/abc123")).toBe(true);
    expect(isPokepasteUrl("https://www.pokepast.es/abc")).toBe(true);
  });
  it("rejects non-https, other hosts, and junk", () => {
    expect(isPokepasteUrl("http://pokepast.es/abc")).toBe(false);
    expect(isPokepasteUrl("https://example.com/abc")).toBe(false);
    expect(isPokepasteUrl("not a url")).toBe(false);
  });
});

describe("reportSchema — normal", () => {
  it("accepts a valid showdown 2–0", () => {
    expect(parse(normal()).success).toBe(true);
  });
  it("accepts a valid cartridge 2–1 with optional video", () => {
    const input = normal({
      platform: "cartridge",
      games: [{ won: true }, { won: false }, { won: true }],
      videoUrl: "https://youtu.be/x",
    });
    expect(parse(input).success).toBe(true);
  });
  it("accepts cartridge without a video", () => {
    const input = normal({
      platform: "cartridge",
      games: [{ won: true }, { won: true }],
    });
    expect(parse(input).success).toBe(true);
  });
  it("rejects a showdown game missing its replay", () => {
    const input = normal({
      games: [{ won: true, replayUrl: REPLAY }, { won: true }],
    });
    expect(parse(input).success).toBe(false);
  });
  it("rejects a video on showdown", () => {
    expect(parse(normal({ videoUrl: "https://youtu.be/x" })).success).toBe(
      false,
    );
  });
  it("rejects a missing or non-pokepaste team sheet", () => {
    expect(parse(normal({ playerBTeamUrl: "" })).success).toBe(false);
    expect(
      parse(normal({ playerBTeamUrl: "https://example.com/x" })).success,
    ).toBe(false);
  });
  it("rejects an illegal best-of-3 (game 3 after 2–0)", () => {
    const input = normal({
      games: [
        { won: true, replayUrl: REPLAY },
        { won: true, replayUrl: REPLAY },
        { won: false, replayUrl: REPLAY },
      ],
    });
    expect(parse(input).success).toBe(false);
  });
});

describe("reportSchema — free win", () => {
  const freeWin = (overrides: Record<string, unknown> = {}) => ({
    outcome: "free_win",
    winnerId: "a",
    freeWinReason: "Gegner nicht erschienen",
    discussedWithId: "staff1",
    ...overrides,
  });

  it("accepts a valid free win", () => {
    expect(parse(freeWin()).success).toBe(true);
  });
  it("rejects a non-participant winner", () => {
    expect(parse(freeWin({ winnerId: "c" })).success).toBe(false);
  });
  it("rejects an empty reason", () => {
    expect(parse(freeWin({ freeWinReason: "   " })).success).toBe(false);
  });
  it("rejects a discussed-with who is not staff/admin", () => {
    expect(parse(freeWin({ discussedWithId: "player9" })).success).toBe(false);
  });
});

describe("toResultRows", () => {
  const rowCtx = { reporterId: "a", opponentId: "b" };

  it("maps a reporter 2–0 to absolute winner + game rows", () => {
    const input = parse(normal()).data as ReportInput;
    const { result, games } = toResultRows(input, rowCtx);
    expect(result.outcome).toBe("normal");
    expect(result.winnerId).toBe("a");
    expect(result.videoUrl).toBeNull();
    expect(games).toEqual([
      { gameNumber: 1, winnerId: "a", replayUrl: REPLAY },
      { gameNumber: 2, winnerId: "a", replayUrl: REPLAY },
    ]);
  });

  it("resolves the opponent as winner when the reporter loses", () => {
    const input = parse(
      normal({
        games: [
          { won: false, replayUrl: REPLAY },
          { won: false, replayUrl: REPLAY },
        ],
      }),
    ).data as ReportInput;
    const { result, games } = toResultRows(input, rowCtx);
    expect(result.winnerId).toBe("b");
    expect(games.every((g) => g.winnerId === "b")).toBe(true);
  });

  it("keeps the cartridge video, drops replays", () => {
    const input = parse(
      normal({
        platform: "cartridge",
        games: [{ won: true }, { won: true }],
        videoUrl: "https://youtu.be/x",
      }),
    ).data as ReportInput;
    const { result, games } = toResultRows(input, rowCtx);
    expect(result.videoUrl).toBe("https://youtu.be/x");
    expect(games.every((g) => g.replayUrl === null)).toBe(true);
  });

  it("maps a free win with no games", () => {
    const input = {
      outcome: "free_win" as const,
      winnerId: "b",
      freeWinReason: "no show",
      discussedWithId: "staff1",
    };
    const { result, games } = toResultRows(input, rowCtx);
    expect(result).toMatchObject({
      outcome: "free_win",
      winnerId: "b",
      discussedWithId: "staff1",
      platform: null,
    });
    expect(games).toEqual([]);
  });
});
