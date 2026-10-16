import { describe, expect, it } from "vitest";
import { afterSeasonSchedule, dashboardHero } from "./dashboard";
import type { PublicCard, PublicTiebreaker } from "./public-view";

const me = { userId: "me", name: "Ich", avatarUrl: null };
const other = { userId: "o", name: "Olli", avatarUrl: null };

function card(over: Partial<PublicCard>): PublicCard {
  return {
    matchId: "m",
    stage: "relegation",
    tier: 2,
    week: 1,
    position: 0,
    label: "1",
    a: { kind: "player", identity: me, note: null },
    b: { kind: "player", identity: other, note: null },
    state: "open",
    scoreA: null,
    scoreB: null,
    winner: null,
    doubleLoss: false,
    mine: true,
    fromA: null,
    fromB: null,
    ...over,
  };
}

describe("dashboardHero", () => {
  it("shows the upper player's relegation with its stakes", () => {
    expect(
      dashboardHero({
        meId: "me",
        tier: 2,
        cards: [card({})],
        tiebreakers: [],
        outcome: null,
      }),
    ).toEqual({
      kind: "match",
      matchId: "m",
      stage: "Relegation",
      opponent: { kind: "player", identity: other },
      stakes: {
        win: "Klassenerhalt in Division 2",
        loss: "Abstieg in Division 3",
      },
    });
  });

  it("names the stakes from below and an opponent not known yet", () => {
    const hero = dashboardHero({
      meId: "me",
      tier: 3,
      cards: [
        card({
          a: {
            kind: "placeholder",
            label: "Division 2a · Platz 8",
            candidates: [],
          },
          b: { kind: "player", identity: me, note: null },
          state: "waiting",
        }),
      ],
      tiebreakers: [],
      outcome: null,
    });
    expect(hero).toMatchObject({
      opponent: { kind: "open", label: "Division 2a · Platz 8" },
      stakes: {
        win: "Aufstieg in Division 2",
        loss: "Klassenerhalt in Division 3",
      },
    });
  });

  it("names the next round for a playoff match and the title for the final", () => {
    const semi = card({ stage: "playoff", tier: 1, week: 1, matchId: "hf" });
    const final = card({
      stage: "playoff",
      tier: 1,
      week: 2,
      matchId: "f",
      state: "waiting",
      mine: false,
    });
    expect(
      dashboardHero({
        meId: "me",
        tier: 1,
        cards: [semi, final],
        tiebreakers: [],
        outcome: null,
      }),
    ).toMatchObject({
      stage: "Playoffs · Halbfinale",
      stakes: { win: "Finale", loss: "Ausgeschieden" },
    });
  });

  it("shows the season outcome once nothing is left to play", () => {
    expect(
      dashboardHero({
        meId: "me",
        tier: 3,
        cards: [card({ state: "played" })],
        tiebreakers: [],
        outcome: { outcome: "promoted", champion: false },
      }),
    ).toEqual({
      kind: "outcome",
      outcome: "promoted",
      champion: false,
      nextTier: 2,
    });
  });
});

const weeks = [
  { startsOn: "2026-11-02", endsOn: "2026-11-08" },
  { startsOn: "2026-11-09", endsOn: "2026-11-15" },
];

function tiebreaker(over: Partial<PublicTiebreaker>): PublicTiebreaker {
  return {
    matchId: "tb",
    tableName: "Division 1",
    placeLabel: "Platz 4",
    a: other,
    b: me,
    state: "open",
    scoreA: null,
    scoreB: null,
    winner: null,
    doubleLoss: false,
    mine: true,
    ...over,
  };
}

describe("afterSeasonSchedule", () => {
  const semi = card({ stage: "playoff", tier: 1, week: 1, matchId: "hf" });
  const final = card({
    stage: "playoff",
    tier: 1,
    week: 2,
    matchId: "f",
    state: "waiting",
    mine: false,
    a: { kind: "placeholder", label: "Sieger HF 1", candidates: [] },
    fromA: "hf",
  });

  it("is empty for a player with nothing after the regular season", () => {
    expect(
      afterSeasonSchedule({
        meId: "me",
        cards: [{ ...semi, mine: false }],
        tiebreakers: [],
        weeks,
        today: "2026-11-03",
      }),
    ).toBeNull();
  });

  it("lists the open semi-final and the final a win leads to", () => {
    const schedule = afterSeasonSchedule({
      meId: "me",
      cards: [semi, final],
      tiebreakers: [],
      weeks,
      today: "2026-11-03",
    });
    expect(schedule?.title).toBe("Playoffs");
    expect(schedule?.rows).toEqual([
      {
        matchId: "hf",
        week: 1,
        startsOn: "2026-11-02",
        endsOn: "2026-11-08",
        stage: "Playoffs · Halbfinale",
        opponent: { kind: "player", identity: other },
        status: { kind: "open", current: true, overdue: false },
      },
      {
        matchId: null,
        week: 2,
        startsOn: "2026-11-09",
        endsOn: "2026-11-15",
        stage: "Playoffs · Finale",
        opponent: { kind: "open", label: "Bei Sieg" },
        status: { kind: "ahead" },
      },
    ]);
  });

  it("shows the own score and nothing ahead after a loss", () => {
    const lost = {
      ...semi,
      state: "played" as const,
      scoreA: 1,
      scoreB: 2,
      winner: "b" as const,
    };
    const schedule = afterSeasonSchedule({
      meId: "me",
      cards: [lost, final],
      tiebreakers: [],
      weeks,
      today: "2026-11-10",
    });
    expect(schedule?.rows).toHaveLength(1);
    expect(schedule?.rows[0].status).toEqual({
      kind: "result",
      self: 1,
      opponent: 2,
      label: "Niederlage",
    });
  });

  it("puts the tiebreaker first and marks an overdue match", () => {
    const schedule = afterSeasonSchedule({
      meId: "me",
      cards: [card({ week: 2 })],
      tiebreakers: [
        tiebreaker({ state: "played", scoreA: 0, scoreB: 2, winner: "b" }),
      ],
      weeks,
      today: "2026-11-16",
    });
    expect(schedule?.title).toBe("Tiebreaker · Relegation");
    expect(schedule?.rows.map((row) => [row.stage, row.status])).toEqual([
      [
        "Tiebreaker · Platz 4",
        { kind: "result", self: 2, opponent: 0, label: "Sieg" },
      ],
      ["Relegation", { kind: "open", current: false, overdue: true }],
    ]);
  });

  it("names a match decided without playing", () => {
    const schedule = afterSeasonSchedule({
      meId: "me",
      cards: [card({ state: "decided", b: { kind: "vacant" }, winner: "a" })],
      tiebreakers: [],
      weeks,
      today: "2026-11-03",
    });
    expect(schedule?.rows[0]).toMatchObject({
      opponent: { kind: "none" },
      status: { kind: "decided", label: "Kampflos gewonnen" },
    });
  });
});
