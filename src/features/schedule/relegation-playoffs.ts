// The schedule of Relegation und Playoffs (docs/plans/relegation-and-playoffs.md):
// how many weeks follow the last Spieltag and which matches exist in them.
// Pure, and read from the seeding's zone configuration alone: the number of
// seats, pairings and bracket matches is fixed once the seeding is final,
// whatever the standings end up saying.

import {
  bracketRounds,
  playoffMatches,
  roundName,
} from "@/features/playoffs/bracket";
import {
  type DivisionForValidation,
  effectiveSeats,
} from "@/features/seeding/post-season";

// Type-to-confirm phrase for the terminal create gate.
export const RELEGATION_PLAYOFFS_SCHEDULE_PHRASE = "Spielplan erstellen";

export type ScheduledMatch = {
  stage: "relegation" | "playoff";
  // Relegation: the upper division of the boundary; playoffs: 1.
  tier: number;
  position: number;
  // 1-based week after the regular season.
  week: number;
};

function byTier(
  divisions: readonly DivisionForValidation[],
): DivisionForValidation[] {
  return [...divisions].sort((a, b) => a.tier - b.tier);
}

// Title-playoff seats of the top division.
export function playoffSeatCount(
  divisions: readonly DivisionForValidation[],
): number {
  const [top] = byTier(divisions);
  return top ? effectiveSeats(top).champion : 0;
}

// Relegation pairings per boundary, top to bottom (boundaries without seats
// left out). Seeding validation guarantees both sides match; the smaller side
// bounds it regardless.
export function relegationPairingCounts(
  divisions: readonly DivisionForValidation[],
): { upperTier: number; lowerTier: number; pairings: number }[] {
  const sorted = byTier(divisions);
  const counts: { upperTier: number; lowerTier: number; pairings: number }[] =
    [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const pairings = Math.min(
      effectiveSeats(sorted[i]).demotionPlayoff,
      effectiveSeats(sorted[i + 1]).promotionPlayoff,
    );
    if (pairings > 0) {
      counts.push({
        upperTier: sorted[i].tier,
        lowerTier: sorted[i + 1].tier,
        pairings,
      });
    }
  }
  return counts;
}

// One week per bracket round; at least one, which carries the Relegation and
// the tiebreakers even without a bracket.
export function relegationPlayoffsWeeks(
  divisions: readonly DivisionForValidation[],
): number {
  return Math.max(1, bracketRounds(playoffSeatCount(divisions)));
}

// Every match the schedule creates: the Relegation in week 1, each bracket
// round in its week, first-round byes left out.
export function relegationPlayoffsMatches(
  divisions: readonly DivisionForValidation[],
): ScheduledMatch[] {
  const relegation = relegationPairingCounts(divisions).flatMap((boundary) =>
    Array.from({ length: boundary.pairings }, (_, position) => ({
      stage: "relegation" as const,
      tier: boundary.upperTier,
      position,
      week: 1,
    })),
  );
  const playoffs = playoffMatches(playoffSeatCount(divisions)).map(
    ({ round, position }) => ({
      stage: "playoff" as const,
      tier: 1,
      position,
      week: round,
    }),
  );
  return [...relegation, ...playoffs];
}

// What each week holds: "Relegation · Viertelfinale", "Halbfinale", "Finale";
// a week with nothing but tiebreakers says so.
export function relegationPlayoffsWeekContents(
  divisions: readonly DivisionForValidation[],
): string[] {
  const rounds = bracketRounds(playoffSeatCount(divisions));
  const relegation = relegationPairingCounts(divisions).length > 0;
  return Array.from({ length: relegationPlayoffsWeeks(divisions) }, (_, i) => {
    const week = i + 1;
    const parts = [
      ...(week === 1 && relegation ? ["Relegation"] : []),
      ...(week <= rounds ? [roundName(rounds, week)] : []),
    ];
    return parts.length > 0 ? parts.join(" · ") : "Tiebreaker";
  });
}

// "Woche 1", "Woche 2", …
export function relegationPlayoffsWeekName(week: number): string {
  return `Woche ${week}`;
}

// When the staff overview asks for the schedule: from the second-to-last
// Spieltag on (it can be created any time before from the Spielplan page),
// and after the last one. `currentRound` is null once the season's Spieltage
// are over.
export function relegationPlayoffsSetupDue(input: {
  currentRound: number | null;
  totalRounds: number;
}): boolean {
  return (
    input.currentRound === null || input.currentRound >= input.totalRounds - 1
  );
}
