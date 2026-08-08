import type { StaffMatchRow } from "./queries";

// Pure bucketing for the staff running-season dashboard.
export type MatchBuckets = {
  // Past matchday, still unreported — needs chasing.
  overdue: StaffMatchRow[];
  // Every match of the current matchday (the "alle dieser Woche" filter shows
  // all of these; the default view shows only the unreported ones).
  thisWeek: StaffMatchRow[];
  // Reported free wins still awaiting staff confirmation.
  pendingFreeWins: StaffMatchRow[];
  // Matches with an open dispute.
  disputed: StaffMatchRow[];
};

export function bucketMatches(input: {
  matches: readonly StaffMatchRow[];
  currentRound: number | null;
  today: string;
}): MatchBuckets {
  const overdue: StaffMatchRow[] = [];
  const thisWeek: StaffMatchRow[] = [];
  const pendingFreeWins: StaffMatchRow[] = [];
  const disputed: StaffMatchRow[] = [];

  for (const match of input.matches) {
    if (match.dispute) {
      disputed.push(match);
    }
    if (match.outcome === "free_win" && match.confirmedAt === null) {
      pendingFreeWins.push(match);
    }
    if (
      match.outcome === null &&
      match.endsOn !== null &&
      input.today > match.endsOn
    ) {
      overdue.push(match);
    }
    if (input.currentRound !== null && match.round === input.currentRound) {
      thisWeek.push(match);
    }
  }
  return { overdue, thisWeek, pendingFreeWins, disputed };
}

// Whether a this-week match still needs a result (drives the default vs
// "alle" filter).
export function isUnreported(match: StaffMatchRow): boolean {
  return match.outcome === null;
}
