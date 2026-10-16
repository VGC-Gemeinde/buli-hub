import { describe, expect, it } from "vitest";
import type { DivisionForValidation } from "@/features/seeding/post-season";
import {
  playoffSeatCount,
  relegationPairingCounts,
  relegationPlayoffsMatches,
  relegationPlayoffsSetupDue,
  relegationPlayoffsWeekContents,
  relegationPlayoffsWeeks,
} from "./relegation-playoffs";

const div = (
  tier: number,
  o: Partial<DivisionForValidation> = {},
): DivisionForValidation => ({
  tier,
  relevantTable: "sub_division",
  guaranteedPromotions: 0,
  guaranteedDemotions: 0,
  promotionPlayoffSlots: 0,
  demotionPlayoffSlots: 0,
  championshipPlayoffSlots: 0,
  groupSizes: [8, 8],
  ...o,
});

// Saison-9-like: Division 1 in two groups with four title seats each and one
// relegation seat; Division 2 and 3 exchange one relegation seat per group.
const league = [
  div(1, { championshipPlayoffSlots: 4, demotionPlayoffSlots: 1 }),
  div(2, { promotionPlayoffSlots: 1, demotionPlayoffSlots: 1 }),
  div(3, { promotionPlayoffSlots: 1 }),
];

describe("relegation and playoff schedule", () => {
  it("counts title seats per group times groups", () => {
    expect(playoffSeatCount(league)).toBe(8);
    expect(
      playoffSeatCount([
        div(1, { relevantTable: "division", championshipPlayoffSlots: 6 }),
      ]),
    ).toBe(6);
  });

  it("counts relegation pairings per boundary", () => {
    expect(relegationPairingCounts(league)).toEqual([
      { upperTier: 1, lowerTier: 2, pairings: 2 },
      { upperTier: 2, lowerTier: 3, pairings: 2 },
    ]);
  });

  it("needs one week per bracket round, at least one", () => {
    expect(relegationPlayoffsWeeks(league)).toBe(3);
    expect(relegationPlayoffsWeeks([div(1), div(2)])).toBe(1);
    expect(
      relegationPlayoffsWeeks([div(1, { championshipPlayoffSlots: 3 })]),
    ).toBe(3);
  });

  it("creates the relegation in week 1 and each round in its week", () => {
    const matches = relegationPlayoffsMatches(league);
    expect(matches.filter((m) => m.stage === "relegation")).toEqual([
      { stage: "relegation", tier: 1, position: 0, week: 1 },
      { stage: "relegation", tier: 1, position: 1, week: 1 },
      { stage: "relegation", tier: 2, position: 0, week: 1 },
      { stage: "relegation", tier: 2, position: 1, week: 1 },
    ]);
    const playoffs = matches.filter((m) => m.stage === "playoff");
    expect(playoffs.map((m) => m.week)).toEqual([1, 1, 1, 1, 2, 2, 3]);
  });

  it("leaves first-round byes out", () => {
    const matches = relegationPlayoffsMatches([
      div(1, { relevantTable: "division", championshipPlayoffSlots: 6 }),
    ]);
    expect(matches.filter((m) => m.week === 1)).toHaveLength(2);
    expect(matches).toHaveLength(5);
  });

  it("names what each week holds", () => {
    expect(relegationPlayoffsWeekContents(league)).toEqual([
      "Relegation · Viertelfinale",
      "Halbfinale",
      "Finale",
    ]);
    expect(relegationPlayoffsWeekContents([div(1), div(2)])).toEqual([
      "Tiebreaker",
    ]);
  });

  it("asks for the schedule from the second-to-last Spieltag on", () => {
    expect(
      relegationPlayoffsSetupDue({ currentRound: 7, totalRounds: 9 }),
    ).toBe(false);
    expect(
      relegationPlayoffsSetupDue({ currentRound: 8, totalRounds: 9 }),
    ).toBe(true);
    expect(
      relegationPlayoffsSetupDue({ currentRound: null, totalRounds: 9 }),
    ).toBe(true);
  });
});
