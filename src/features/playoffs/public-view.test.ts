import { describe, expect, it } from "vitest";
import type { ResolvedMatch } from "./progression";
import {
  afterSeasonWeekToShow,
  bracketRounds,
  currentAfterSeasonWeek,
  divisionWeek,
  favoritesAfterSeasonWeek,
  type PublicCard,
  publicCards,
  publicChampion,
  type StoredResultView,
} from "./public-view";

const seat = (label: string, tieKey?: string) =>
  ({
    kind: "seat",
    seatLabel: label,
    holder: { kind: "player", userId: "x" },
    ...(tieKey ? { tieKey } : {}),
  }) as const;

function match(
  over: Partial<ResolvedMatch> & Pick<ResolvedMatch, "matchId">,
): ResolvedMatch {
  return {
    stage: "playoff",
    tier: 1,
    week: 1,
    position: 0,
    label: "HF 1",
    a: { kind: "player", userId: "a" },
    b: { kind: "player", userId: "b" },
    originA: seat("Division 1 · Platz 1"),
    originB: seat("Division 1 · Platz 4"),
    outcome: { kind: "none" },
    reported: false,
    ...over,
  };
}

// A two-round bracket: HF 1 (a vs b), HF 2 (c vs d), the final from both.
const hf1Won = match({
  matchId: "hf1",
  outcome: { kind: "won", winnerId: "a" },
  reported: true,
});
const hf2 = match({
  matchId: "hf2",
  position: 1,
  label: "HF 2",
  a: { kind: "player", userId: "c" },
  b: { kind: "player", userId: "d" },
});
const final = match({
  matchId: "final",
  week: 2,
  label: "Finale",
  a: { kind: "player", userId: "a" },
  b: { kind: "open" },
  originA: { kind: "winner", label: "Sieger HF 1", week: 1, position: 0 },
  originB: { kind: "winner", label: "Sieger HF 2", week: 1, position: 1 },
});

const results = new Map<string, StoredResultView>([
  [
    "hf1",
    {
      outcome: "normal",
      winnerId: "a",
      confirmedAt: null,
      games: [{ winnerId: "a" }, { winnerId: "b" }, { winnerId: "a" }],
    },
  ],
]);

function cards(options: {
  withheld?: string[];
  viewer?: { userId: string | null; isStaff: boolean };
  resolved?: ResolvedMatch[];
  results?: Map<string, StoredResultView>;
  tiebreakerOf?: Map<string, string>;
}): Map<string, PublicCard> {
  return new Map(
    publicCards({
      resolved: options.resolved ?? [hf1Won, hf2, final],
      results: options.results ?? results,
      withheld: new Set(options.withheld ?? []),
      tiebreakerOf: options.tiebreakerOf ?? new Map(),
      identities: new Map(
        ["a", "b", "c", "d"].map((id) => [
          id,
          { userId: id, name: id.toUpperCase(), avatarUrl: null },
        ]),
      ),
      viewer: options.viewer ?? { userId: null, isStaff: false },
    }).map((card) => [card.matchId, card]),
  );
}

describe("publicCards", () => {
  it("shows a played match with its score and winner", () => {
    const hf1 = cards({}).get("hf1");
    expect(hf1).toMatchObject({
      state: "played",
      scoreA: 2,
      scoreB: 1,
      winner: "a",
      label: "HF 1",
    });
  });

  it("marks the open and the waiting match", () => {
    const view = cards({});
    expect(view.get("hf2")?.state).toBe("open");
    expect(view.get("final")?.state).toBe("waiting");
    expect(view.get("final")?.b).toEqual({
      kind: "placeholder",
      label: "Sieger HF 2",
      candidates: [],
    });
    expect(view.get("final")?.fromA).toBe("hf1");
  });

  it("withholds a result and who won it from the public", () => {
    const view = cards({ withheld: ["hf1"] });
    expect(view.get("hf1")).toMatchObject({
      state: "withheld",
      scoreA: null,
      winner: null,
    });
    expect(view.get("final")?.a).toEqual({
      kind: "placeholder",
      label: "Sieger HF 1",
      candidates: [],
    });
  });

  it("shows both to the players and to staff", () => {
    const player = cards({
      withheld: ["hf1"],
      viewer: { userId: "a", isStaff: false },
    });
    expect(player.get("hf1")?.state).toBe("played");
    expect(player.get("final")?.a).toMatchObject({ kind: "player" });
    const staff = cards({
      withheld: ["hf1"],
      viewer: { userId: "s", isStaff: true },
    });
    expect(staff.get("final")?.a).toMatchObject({ kind: "player" });
  });

  it("masks a seat that a withheld tiebreaker decided", () => {
    const relegation = match({
      matchId: "rel",
      stage: "relegation",
      label: "1",
      originB: seat("Division 2a · Platz 1", "group:g:0"),
    });
    const view = cards({
      resolved: [relegation],
      results: new Map(),
      withheld: ["tb"],
      tiebreakerOf: new Map([["group:g:0", "tb"]]),
    });
    expect(view.get("rel")?.b).toEqual({
      kind: "placeholder",
      label: "Division 2a · Platz 1",
      candidates: [],
    });
  });

  it("does not show a pending free win to the public", () => {
    const view = cards({
      results: new Map([
        [
          "hf2",
          {
            outcome: "free_win",
            winnerId: "c",
            confirmedAt: null,
            games: [],
          },
        ],
      ]),
    });
    expect(view.get("hf2")?.state).toBe("open");
  });

  it("shows a match decided without playing", () => {
    const vacant = match({
      matchId: "v",
      b: { kind: "vacant" },
      outcome: { kind: "won", winnerId: "a" },
    });
    const card = cards({ resolved: [vacant], results: new Map() }).get("v");
    expect(card).toMatchObject({
      state: "decided",
      winner: "a",
      b: { kind: "vacant" },
    });
  });
});

describe("bracketRounds and publicChampion", () => {
  it("names the rounds and finds no champion before the final", () => {
    const view = [...cards({}).values()];
    expect(bracketRounds(view).map((round) => round.name)).toEqual([
      "Halbfinale",
      "Finale",
    ]);
    expect(publicChampion(view)).toBeNull();
  });

  it("crowns the final's winner, or nobody after a double loss", () => {
    const decided = match({
      matchId: "final",
      week: 2,
      label: "Finale",
      outcome: { kind: "won", winnerId: "b" },
      reported: true,
    });
    const won = publicCards({
      resolved: [decided],
      results: new Map([
        [
          "final",
          {
            outcome: "free_win",
            winnerId: "b",
            confirmedAt: new Date(),
            games: [],
          },
        ],
      ]),
      withheld: new Set(),
      tiebreakerOf: new Map(),
      identities: new Map(),
      viewer: { userId: null, isStaff: false },
    });
    expect(publicChampion(won)).toMatchObject({
      identity: { userId: "b" },
    });
    const none = publicCards({
      resolved: [{ ...decided, outcome: { kind: "double_loss" } }],
      results: new Map([
        [
          "final",
          {
            outcome: "double_loss",
            winnerId: null,
            confirmedAt: null,
            games: [],
          },
        ],
      ]),
      withheld: new Set(),
      tiebreakerOf: new Map(),
      identities: new Map(),
      viewer: { userId: null, isStaff: false },
    });
    expect(publicChampion(none)).toBe("none");
  });
});

describe("the weeks after the regular season on the Liga-Übersicht", () => {
  const weeks = [
    { startsOn: "2026-11-02", endsOn: "2026-11-08" },
    { startsOn: "2026-11-16", endsOn: "2026-11-22" },
  ];

  it("opens on the running week, the last one begun, or the first", () => {
    expect(currentAfterSeasonWeek(weeks, "2026-11-17")).toBe(2);
    expect(currentAfterSeasonWeek(weeks, "2026-11-10")).toBeNull();
    expect(afterSeasonWeekToShow(weeks, "2026-11-10")).toBe(1);
    expect(afterSeasonWeekToShow(weeks, "2026-11-30")).toBe(2);
    expect(afterSeasonWeekToShow(weeks, "2026-10-30")).toBe(1);
  });

  const card = (over: Partial<PublicCard>): PublicCard => ({
    matchId: "x",
    stage: "relegation",
    tier: 1,
    week: 1,
    position: 0,
    label: "1",
    a: { kind: "vacant" },
    b: { kind: "vacant" },
    state: "open",
    scoreA: null,
    scoreB: null,
    winner: null,
    doubleLoss: false,
    mine: false,
    fromA: null,
    fromB: null,
    ...over,
  });
  const all = [
    card({ matchId: "r12", tier: 1 }),
    card({ matchId: "r23", tier: 2 }),
    card({ matchId: "hf", stage: "playoff", label: "HF 1" }),
    card({ matchId: "f", stage: "playoff", week: 2, label: "Finale" }),
  ];
  const tiebreaker = {
    matchId: "tb",
    tableName: "Division 2a",
    placeLabel: "Platz 2",
    a: { userId: "a", name: "A", avatarUrl: null },
    b: { userId: "b", name: "B", avatarUrl: null },
    state: "open" as const,
    scoreA: null,
    scoreB: null,
    winner: null,
    doubleLoss: false,
    mine: false,
  };
  const week = (tier: number, w: number) =>
    divisionWeek({
      cards: all,
      tiebreakers: [tiebreaker],
      tiebreakerTiers: new Map([["tb", 2]]),
      tier,
      week: w,
    }).map((section) => [
      section.label,
      section.kind === "tiebreaker"
        ? section.tiebreakers.map((t) => t.matchId)
        : section.cards.map((c) => c.matchId),
    ]);

  it("gives a middle division its tiebreakers and both boundaries", () => {
    expect(week(2, 1)).toEqual([
      ["Tiebreaker", ["tb"]],
      ["Relegation · Division 1 und 2", ["r12"]],
      ["Relegation · Division 2 und 3", ["r23"]],
    ]);
  });

  it("gives Division 1 its boundary and the Playoff round of the week", () => {
    expect(week(1, 1)).toEqual([
      ["Relegation · Division 1 und 2", ["r12"]],
      ["Playoffs · Halbfinale", ["hf"]],
    ]);
    expect(week(1, 2)).toEqual([["Playoffs · Finale", ["f"]]]);
    expect(week(3, 2)).toEqual([]);
  });
});

describe("favoritesAfterSeasonWeek", () => {
  const player = (userId: string) =>
    ({
      kind: "player",
      identity: { userId, name: userId, avatarUrl: null },
      note: null,
    }) as const;
  const base = {
    stage: "relegation" as const,
    tier: 2,
    week: 1,
    position: 0,
    label: "1",
    state: "open" as const,
    scoreA: null,
    scoreB: null,
    winner: null,
    doubleLoss: false,
    mine: false,
    fromA: null,
    fromB: null,
  };
  const cards: PublicCard[] = [
    { ...base, matchId: "r1", a: player("fav"), b: player("x") },
    { ...base, matchId: "r2", position: 1, a: player("y"), b: player("z") },
    {
      ...base,
      matchId: "hf",
      stage: "playoff",
      tier: 1,
      label: "HF 1",
      a: player("w"),
      b: player("fav2"),
    },
  ];

  it("keeps only the matches a favourite plays, under their labels", () => {
    expect(
      favoritesAfterSeasonWeek({
        cards,
        tiebreakers: [],
        favoriteIds: new Set(["fav", "fav2"]),
        week: 1,
      }).map((section) => [
        section.label,
        section.kind === "tiebreaker"
          ? []
          : section.cards.map((card) => card.matchId),
      ]),
    ).toEqual([
      ["Relegation · Division 2 und 3", ["r1"]],
      // One playoff round: the final.
      ["Playoffs · Finale", ["hf"]],
    ]);
  });

  it("is empty when no favourite plays that week", () => {
    expect(
      favoritesAfterSeasonWeek({
        cards,
        tiebreakers: [],
        favoriteIds: new Set(["nobody"]),
        week: 1,
      }),
    ).toEqual([]);
  });
});
