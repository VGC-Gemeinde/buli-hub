// What a match is called where its group name would stand: the sub-division
// for a regular match ("Division 1a"), the stage for the others
// (docs/plans/relegation-and-playoffs.md). Pure.

import { roundName } from "@/features/playoffs/bracket";
import { boundaryName } from "@/features/relegation/pairings";
import { divisionName, subDivisionName } from "@/features/seeding/seeding";

export type MatchStage = "regular" | "tiebreaker" | "relegation" | "playoff";

export function matchStageTitle(input: {
  stage: MatchStage;
  tier: number;
  // Regular: the match's group; tiebreaker: the decided table's group, null
  // for a division table.
  groupPosition: number | null;
  // Playoffs: the match's round and the bracket's number of rounds.
  playoffRound?: number;
  playoffRounds?: number;
}): string {
  const table =
    input.groupPosition === null
      ? divisionName(input.tier)
      : subDivisionName(input.tier, input.groupPosition);
  switch (input.stage) {
    case "regular":
      return table;
    case "tiebreaker":
      return `Tiebreaker · ${table}`;
    case "relegation":
      return `Relegation · ${boundaryName(input.tier, input.tier + 1)}`;
    case "playoff":
      return `Playoffs · ${roundName(input.playoffRounds ?? 1, input.playoffRound ?? 1)}`;
  }
}

// The group a tiebreaker decides, from its tie key ("group:<id>:<index>");
// null for a division table ("division:<tier>:<index>").
export function tieKeyGroup(tieKey: string): string | null {
  const [kind, id] = tieKey.split(":");
  return kind === "group" ? id : null;
}
