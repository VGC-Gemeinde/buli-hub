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
      { winnerId: "a", replayUrl: REPLAY },
      { winnerId: "a", replayUrl: REPLAY },
    ],
    playerATeamUrl: PASTE_A,
    playerBTeamUrl: PASTE_B,
    ...overrides,
  };
}

describe("deriveSeries", () => {
  const s = (winners: string[]) => deriveSeries(winners, "a", "b");
  it("2–0 and 0–2 are decisive in two games", () => {
    expect(s(["a", "a"])).toEqual({ ok: true, winnerId: "a", gamesPlayed: 2 });
    expect(s(["b", "b"])).toEqual({ ok: true, winnerId: "b", gamesPlayed: 2 });
  });
  it("2–1 and 1–2 are decisive in three games", () => {
    expect(s(["a", "b", "a"])).toMatchObject({
      ok: true,
      winnerId: "a",
      gamesPlayed: 3,
    });
    expect(s(["b", "a", "b"])).toMatchObject({ ok: true, winnerId: "b" });
  });
  it("rejects too few / too many", () => {
    expect(s(["a"])).toEqual({ ok: false, reason: "too_few" });
    expect(s([])).toEqual({ ok: false, reason: "too_few" });
    expect(s(["a", "b", "a", "b"])).toEqual({ ok: false, reason: "too_many" });
  });
  it("rejects 1–1 without a decider", () => {
    expect(s(["a", "b"])).toEqual({ ok: false, reason: "not_decisive" });
  });
  it("rejects a game played after the series was decided", () => {
    expect(s(["a", "a", "b"])).toEqual({ ok: false, reason: "extra_game" });
    expect(s(["b", "b", "a"])).toEqual({ ok: false, reason: "extra_game" });
    expect(s(["a", "a", "a"])).toEqual({ ok: false, reason: "extra_game" });
  });
  it("rejects an unknown winner", () => {
    expect(s(["a", "c"])).toEqual({ ok: false, reason: "unknown_player" });
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
      games: [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }],
      videoUrl: "https://youtu.be/x",
    });
    expect(parse(input).success).toBe(true);
  });
  it("accepts cartridge without a video", () => {
    const input = normal({
      platform: "cartridge",
      games: [{ winnerId: "a" }, { winnerId: "a" }],
    });
    expect(parse(input).success).toBe(true);
  });
  it("rejects a showdown game missing its replay", () => {
    const input = normal({
      games: [{ winnerId: "a", replayUrl: REPLAY }, { winnerId: "a" }],
    });
    expect(parse(input).success).toBe(false);
  });
  it("rejects a game won by a non-participant", () => {
    expect(
      parse(
        normal({
          games: [
            { winnerId: "a", replayUrl: REPLAY },
            { winnerId: "c", replayUrl: REPLAY },
          ],
        }),
      ).success,
    ).toBe(false);
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
        { winnerId: "a", replayUrl: REPLAY },
        { winnerId: "a", replayUrl: REPLAY },
        { winnerId: "b", replayUrl: REPLAY },
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
  it("maps a 2–0 to the match winner + game rows", () => {
    const input = parse(normal()).data as ReportInput;
    const { result, games } = toResultRows(input);
    expect(result.outcome).toBe("normal");
    expect(result.winnerId).toBe("a");
    expect(result.videoUrl).toBeNull();
    expect(games).toEqual([
      { gameNumber: 1, winnerId: "a", replayUrl: REPLAY },
      { gameNumber: 2, winnerId: "a", replayUrl: REPLAY },
    ]);
  });

  it("takes the match winner from the game tally", () => {
    const input = parse(
      normal({
        games: [
          { winnerId: "b", replayUrl: REPLAY },
          { winnerId: "b", replayUrl: REPLAY },
        ],
      }),
    ).data as ReportInput;
    const { result, games } = toResultRows(input);
    expect(result.winnerId).toBe("b");
    expect(games.every((g) => g.winnerId === "b")).toBe(true);
  });

  it("keeps the cartridge video, drops replays", () => {
    const input = parse(
      normal({
        platform: "cartridge",
        games: [{ winnerId: "a" }, { winnerId: "a" }],
        videoUrl: "https://youtu.be/x",
      }),
    ).data as ReportInput;
    const { result, games } = toResultRows(input);
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
    const { result, games } = toResultRows(input);
    expect(result).toMatchObject({
      outcome: "free_win",
      winnerId: "b",
      discussedWithId: "staff1",
      platform: null,
    });
    expect(games).toEqual([]);
  });
});
