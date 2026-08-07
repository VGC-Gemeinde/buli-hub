import type { Identity } from "@/features/season/dashboard";
import type { MatchOutcome } from "./report";

// How a match renders on the schedule. A recorded result wins over any
// date-derived state; a past matchday with no result is "überfällig" — except a
// bye, which is never overdue. Dates are ISO day strings (YYYY-MM-DD).
export type MatchDisplayState =
  | "current"
  | "upcoming"
  | "reported"
  | "pending_free_win"
  | "overdue";

export function matchDisplayState(input: {
  match: { startsOn: string; endsOn: string; opponent: Identity | null };
  result: { outcome: MatchOutcome; confirmedAt: Date | null } | null;
  today: string;
}): MatchDisplayState {
  if (input.result) {
    if (
      input.result.outcome === "free_win" &&
      input.result.confirmedAt === null
    ) {
      return "pending_free_win";
    }
    return "reported";
  }
  const { startsOn, endsOn, opponent } = input.match;
  if (input.today > endsOn) {
    // A bye has nothing to report, so it never becomes overdue; callers render
    // it as "Spielfrei" (past byes just fade).
    return opponent === null ? "upcoming" : "overdue";
  }
  if (startsOn <= input.today && input.today <= endsOn) {
    return "current";
  }
  return "upcoming";
}

// The score from `userId`'s point of view plus the Sieg/Niederlage label.
// A free win is a walkover, awarded as a 2:0 default win (like a no-show); a
// double loss is a loss for both.
export function scoreFor(
  userId: string,
  result: {
    outcome: MatchOutcome;
    winnerId: string | null;
    games: readonly { winnerId: string }[];
  },
): { self: number; opponent: number; label: "Sieg" | "Niederlage" | null } {
  if (result.outcome === "double_loss") {
    return { self: 0, opponent: 0, label: "Niederlage" };
  }
  if (result.outcome === "free_win") {
    const won = result.winnerId === userId;
    return {
      self: won ? 2 : 0,
      opponent: won ? 0 : 2,
      label: won ? "Sieg" : "Niederlage",
    };
  }
  let self = 0;
  let opponent = 0;
  for (const game of result.games) {
    if (game.winnerId === userId) {
      self++;
    } else {
      opponent++;
    }
  }
  const label =
    result.winnerId === userId ? "Sieg" : result.winnerId ? "Niederlage" : null;
  return { self, opponent, label };
}
