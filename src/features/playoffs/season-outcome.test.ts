import { describe, expect, it } from "vitest";
import { finalTable, type TieDecision } from "@/features/final-table/places";
import { relegationPlayoffsPreview } from "@/features/schedule/relegation-playoffs-preview";
import { resolveRelegationPlayoffs, type StoredMatch } from "./progression";
import { seasonDecided, seasonOutcomes } from "./season-outcome";

const NONE = {
  champion: 0,
  promotions: 0,
  promotionPlayoff: 0,
  demotionPlayoff: 0,
  demotions: 0,
};

// Division 1: a1..a5, two title seats, one relegation seat (a4), one direct
// demotion (a5). Division 2: b1..b4, one direct promotion (b1), one
// relegation seat (b2, or b2/b3 tied for it).
function season(options: {
  results?: Partial<Record<string, StoredMatch["result"]>>;
  tie?: boolean;
  decided?: Map<string, TieDecision>;
}) {
  const tablesByTier = new Map([
    [
      1,
      [
        finalTable({
          tier: 1,
          subDivisionId: null,
          groupPosition: null,
          groupLot: null,
          rows: [1, 2, 3, 4, 5].map((rank) => ({
            userId: `a${rank}`,
            rank,
            dropped: false,
            lot: 0,
          })),
          counts: { ...NONE, champion: 2, demotionPlayoff: 1, demotions: 1 },
        }),
      ],
    ],
    [
      2,
      [
        finalTable(
          {
            tier: 2,
            subDivisionId: null,
            groupPosition: null,
            groupLot: null,
            rows: [
              { userId: "b1", rank: 1, dropped: false, lot: 0 },
              { userId: "b2", rank: 2, dropped: false, lot: 0 },
              {
                userId: "b3",
                rank: options.tie ? 2 : 3,
                dropped: false,
                lot: 0,
              },
              { userId: "b4", rank: 4, dropped: false, lot: 0 },
            ],
            counts: { ...NONE, promotions: 1, promotionPlayoff: 1 },
          },
          options.decided,
        ),
      ],
    ],
  ]);
  const preview = relegationPlayoffsPreview({
    tablesByTier,
    matchdays: [{ startsOn: "2026-11-09", endsOn: "2026-11-15" }],
  });
  const results = options.results ?? {};
  const matches: StoredMatch[] = [
    {
      matchId: "rel",
      stage: "relegation",
      tier: 1,
      position: 0,
      round: 10,
      playerAId: null,
      playerBId: null,
      result: results.rel ?? null,
    },
    {
      matchId: "final",
      stage: "playoff",
      tier: 1,
      position: 0,
      round: 10,
      playerAId: null,
      playerBId: null,
      result: results.final ?? null,
    },
  ];
  const resolved = resolveRelegationPlayoffs({
    preview,
    matches,
    firstRound: 10,
    droppedIds: new Set(),
    lateDroppedIds: new Set(),
  });
  return seasonOutcomes({ tablesByTier, resolved });
}

const won = (winnerId: string) => ({
  outcome: "normal" as const,
  winnerId,
  confirmedAt: null,
});

const outcomes = (result: ReturnType<typeof season>) =>
  Object.fromEntries(result.players.map((p) => [p.userId, p.outcome]));

describe("seasonOutcomes", () => {
  it("reads the direct zones and waits for open matches", () => {
    const result = season({});
    expect(outcomes(result)).toEqual({
      a1: "stays",
      a2: "stays",
      a3: "stays",
      a4: null,
      a5: "demoted",
      b1: "promoted",
      b2: null,
      b3: "stays",
      b4: "stays",
    });
    expect(result.champion).toBeNull();
    expect(seasonDecided(result)).toBe(false);
  });

  it("swaps the relegation pair when the lower one wins", () => {
    const result = season({ results: { rel: won("b2"), final: won("a2") } });
    expect(outcomes(result)).toMatchObject({ a4: "demoted", b2: "promoted" });
    expect(result.champion).toBe("a2");
    expect(seasonDecided(result)).toBe(true);
  });

  it("keeps both where they are when the upper one wins", () => {
    const result = season({ results: { rel: won("a4") } });
    expect(outcomes(result)).toMatchObject({ a4: "stays", b2: "stays" });
  });

  it("demotes the upper one and keeps the lower one after a double loss", () => {
    const result = season({
      results: {
        rel: { outcome: "double_loss", winnerId: null, confirmedAt: null },
      },
    });
    expect(outcomes(result)).toMatchObject({ a4: "demoted", b2: "stays" });
  });

  it("has no champion after a final lost by both", () => {
    const result = season({
      results: {
        final: { outcome: "double_loss", winnerId: null, confirmedAt: null },
      },
    });
    expect(result.champion).toBe("none");
  });

  it("waits for an undecided tie and seats its winner once decided", () => {
    expect(outcomes(season({ tie: true }))).toMatchObject({
      b2: null,
      b3: null,
    });
    const decided = season({
      tie: true,
      decided: new Map([["division:2:1", ["b3", "b2"]]]),
      results: { rel: won("b3") },
    });
    expect(outcomes(decided)).toMatchObject({ b3: "promoted", b2: "stays" });
  });

  it("gives both players of a tiebreaker lost by both the worst outcome", () => {
    const result = season({
      tie: true,
      decided: new Map([["division:2:1", "vacant"]]),
    });
    // Relegation / nothing: both stay; the empty seat hands a4 the match.
    expect(outcomes(result)).toMatchObject({
      b2: "stays",
      b3: "stays",
      a4: "stays",
    });
  });
});
