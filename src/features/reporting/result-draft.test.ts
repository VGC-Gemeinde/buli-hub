import { describe, expect, it } from "vitest";
import {
  draftToReport,
  emptyDraft,
  gameIndexes,
  isDraftComplete,
  type ResultDraft,
  setWinner,
} from "./result-draft";

const alice = "alice";
const bob = "bob";

const initial = {
  platform: "showdown" as const,
  games: [
    { winnerId: alice, replayUrl: "https://replay/1" },
    { winnerId: bob, replayUrl: "https://replay/2" },
    { winnerId: alice, replayUrl: "https://replay/3" },
  ],
  playerATeamUrl: "https://pokepast.es/a",
  playerBTeamUrl: "https://pokepast.es/b",
  videoUrl: null,
};

// A complete cartridge draft, the base for the completeness cases.
const cartridge: ResultDraft = {
  platform: "cartridge",
  winners: [alice, alice, ""],
  replays: ["", "", ""],
  teamA: "https://pokepast.es/a",
  teamB: "https://pokepast.es/b",
  video: "",
};

describe("emptyDraft", () => {
  it("starts blank without a prefill", () => {
    expect(emptyDraft()).toEqual({
      platform: "",
      winners: ["", "", ""],
      replays: ["", "", ""],
      teamA: "",
      teamB: "",
      video: "",
    });
    expect(emptyDraft(null)).toEqual(emptyDraft());
  });

  it("mirrors a stored result, padding the missing third game", () => {
    expect(emptyDraft(initial).winners).toEqual([alice, bob, alice]);
    expect(
      emptyDraft({ ...initial, games: initial.games.slice(0, 2) }),
    ).toEqual({
      platform: "showdown",
      winners: [alice, bob, ""],
      replays: ["https://replay/1", "https://replay/2", ""],
      teamA: "https://pokepast.es/a",
      teamB: "https://pokepast.es/b",
      video: "",
    });
  });
});

describe("gameIndexes", () => {
  it("asks for a third game only once the series is split", () => {
    expect(gameIndexes(emptyDraft())).toEqual([0, 1]);
    expect(gameIndexes({ ...cartridge, winners: [alice, alice, ""] })).toEqual([
      0, 1,
    ]);
    expect(gameIndexes({ ...cartridge, winners: [alice, bob, ""] })).toEqual([
      0, 1, 2,
    ]);
    // A half-filled series is not split yet.
    expect(gameIndexes({ ...cartridge, winners: [alice, "", ""] })).toEqual([
      0, 1,
    ]);
  });
});

describe("setWinner", () => {
  it("drops a no longer needed third game when the series stops being split", () => {
    const split: ResultDraft = { ...cartridge, winners: [alice, bob, alice] };
    expect(setWinner(split, 1, alice).winners).toEqual([alice, alice, ""]);
  });

  it("keeps the third game while the series stays split", () => {
    const split: ResultDraft = { ...cartridge, winners: [alice, bob, alice] };
    expect(setWinner(split, 2, bob).winners).toEqual([alice, bob, bob]);
  });

  it("does not mutate the draft it is given", () => {
    const draft: ResultDraft = { ...cartridge, winners: [alice, bob, alice] };
    setWinner(draft, 1, alice);
    expect(draft.winners).toEqual([alice, bob, alice]);
  });
});

describe("isDraftComplete", () => {
  it("needs a platform, the games it asks for and both team sheets", () => {
    expect(isDraftComplete(cartridge)).toBe(true);
    expect(isDraftComplete({ ...cartridge, platform: "" })).toBe(false);
    expect(isDraftComplete({ ...cartridge, teamA: "" })).toBe(false);
    expect(isDraftComplete({ ...cartridge, teamB: "  " })).toBe(false);
    expect(isDraftComplete({ ...cartridge, winners: [alice, "", ""] })).toBe(
      false,
    );
  });

  it("needs the deciding game of a split series", () => {
    const split: ResultDraft = { ...cartridge, winners: [alice, bob, ""] };
    expect(isDraftComplete(split)).toBe(false);
    expect(isDraftComplete(setWinner(split, 2, bob))).toBe(true);
  });

  it("needs a replay per game on Showdown, none on cartridge", () => {
    const showdown: ResultDraft = { ...cartridge, platform: "showdown" };
    expect(isDraftComplete(showdown)).toBe(false);
    expect(
      isDraftComplete({ ...showdown, replays: ["https://r/1", " ", ""] }),
    ).toBe(false);
    expect(
      isDraftComplete({
        ...showdown,
        replays: ["https://r/1", "https://r/2", ""],
      }),
    ).toBe(true);
  });
});

describe("draftToReport", () => {
  it("sends only the games that count, with replays on Showdown", () => {
    const draft: ResultDraft = {
      ...cartridge,
      platform: "showdown",
      winners: [alice, bob, alice],
      replays: ["https://r/1", "https://r/2", "https://r/3"],
    };
    expect(draftToReport(draft)).toEqual({
      outcome: "normal",
      platform: "showdown",
      games: [
        { winnerId: alice, replayUrl: "https://r/1" },
        { winnerId: bob, replayUrl: "https://r/2" },
        { winnerId: alice, replayUrl: "https://r/3" },
      ],
      playerATeamUrl: "https://pokepast.es/a",
      playerBTeamUrl: "https://pokepast.es/b",
    });
  });

  it("drops replays and the unplayed third game on cartridge", () => {
    expect(
      draftToReport({
        ...cartridge,
        replays: ["https://r/1", "https://r/2", ""],
      }),
    ).toEqual({
      outcome: "normal",
      platform: "cartridge",
      games: [{ winnerId: alice }, { winnerId: alice }],
      playerATeamUrl: "https://pokepast.es/a",
      playerBTeamUrl: "https://pokepast.es/b",
    });
  });

  it("carries a cartridge video only when one was entered", () => {
    expect(draftToReport({ ...cartridge, video: "  " })).not.toHaveProperty(
      "videoUrl",
    );
    expect(
      draftToReport({ ...cartridge, video: "https://youtu.be/x" }),
    ).toHaveProperty("videoUrl", "https://youtu.be/x");
    // Showdown never sends a video, even if one is left in the draft.
    expect(
      draftToReport({
        ...cartridge,
        platform: "showdown",
        replays: ["https://r/1", "https://r/2", ""],
        video: "https://youtu.be/x",
      }),
    ).not.toHaveProperty("videoUrl");
  });
});
