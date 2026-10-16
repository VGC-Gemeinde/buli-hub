// How a tiebreaker, Relegation or playoff match ends, for everything that
// builds on it (docs/plans/relegation-and-playoffs.md). Pure.
//
// - A player dropped in the regular season loses every match, played or not
//   (the same override as during the season).
// - A player dropped after it (a late drop) loses only the matches without a
//   result; played ones stay as they are.
// - An empty seat (a tiebreaker lost by both) is nobody: whoever plays
//   against it wins without a match.
// - Absent on both sides is a double loss.

// How a match ends, as far as anything after it is concerned.
export type CountedOutcome =
  | { kind: "none" }
  | { kind: "won"; winnerId: string }
  | { kind: "double_loss" };

export type StoredOutcome = {
  outcome: "normal" | "free_win" | "double_loss";
  winnerId: string | null;
  confirmedAt: Date | null;
};

// A stored result's counted outcome: a free win counts once confirmed.
export function countedOutcome(result: StoredOutcome | null): CountedOutcome {
  if (result === null) {
    return { kind: "none" };
  }
  if (result.outcome === "double_loss") {
    return { kind: "double_loss" };
  }
  if (result.outcome === "free_win" && result.confirmedAt === null) {
    return { kind: "none" };
  }
  return result.winnerId
    ? { kind: "won", winnerId: result.winnerId }
    : { kind: "none" };
}

export function sameOutcome(a: CountedOutcome, b: CountedOutcome): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  return a.kind !== "won" || a.winnerId === (b as typeof a).winnerId;
}

export function effectiveOutcome(input: {
  playerAId: string | null;
  playerBId: string | null;
  stored: StoredOutcome | null;
  droppedIds: ReadonlySet<string>;
  lateDroppedIds: ReadonlySet<string>;
  // A side that is an empty seat rather than not known yet.
  vacantA?: boolean;
  vacantB?: boolean;
}): CountedOutcome {
  const { playerAId: a, playerBId: b } = input;
  const regularDropA = a !== null && input.droppedIds.has(a);
  const regularDropB = b !== null && input.droppedIds.has(b);
  const decide = (
    absentA: boolean,
    absentB: boolean,
  ): CountedOutcome | null => {
    if (absentA && absentB) {
      return { kind: "double_loss" };
    }
    if (absentA && b !== null) {
      return { kind: "won", winnerId: b };
    }
    if (absentB && a !== null) {
      return { kind: "won", winnerId: a };
    }
    return null;
  };
  // The regular season's drop overrides everything.
  const byRegularDrop = decide(regularDropA, regularDropB);
  if (byRegularDrop) {
    return byRegularDrop;
  }
  if (input.stored !== null) {
    return countedOutcome(input.stored);
  }
  const absentA =
    input.vacantA === true || (a !== null && input.lateDroppedIds.has(a));
  const absentB =
    input.vacantB === true || (b !== null && input.lateDroppedIds.has(b));
  return decide(absentA, absentB) ?? { kind: "none" };
}
