// Who plays each Relegation and playoff match and how it ends, round by
// round (docs/plans/relegation-and-playoffs.md). Pure: the seats (from the
// final tables), the stored matches with their results, and the drops in;
// one resolved state per match out. Writing the players into the matches,
// the correction guard, the season outcome and every view read this.
//
// A side is a player, open (its seat's tie or the match it comes from is not
// decided yet) or vacant (an empty seat, or the match it comes from was lost
// by both). A match with a vacant side goes to the other side without being
// played; vacant on both sides it is a double loss, and its winner's place in
// the next round is vacant too.

import type { Seat } from "@/features/final-table/places";
import {
  type CountedOutcome,
  effectiveOutcome,
  type StoredOutcome,
} from "@/features/schedule/effective-outcome";
import type {
  PreviewMatch,
  PreviewSide,
  RelegationPlayoffsPreview,
} from "@/features/schedule/relegation-playoffs-preview";

export type SideState =
  | { kind: "player"; userId: string }
  | { kind: "open" }
  | { kind: "vacant" };

export type ResolvedMatch = {
  matchId: string;
  stage: "relegation" | "playoff";
  tier: number;
  week: number;
  position: number;
  label: string;
  a: SideState;
  b: SideState;
  // Where each side comes from, for labels ("Division 2a · Platz 7",
  // "Sieger HF 1").
  originA: PreviewSide;
  originB: PreviewSide;
  outcome: CountedOutcome;
  // A result is stored (played, or awarded by staff).
  reported: boolean;
};

export type StoredMatch = {
  matchId: string;
  stage: "relegation" | "playoff";
  tier: number;
  position: number;
  round: number;
  playerAId: string | null;
  playerBId: string | null;
  result: StoredOutcome | null;
};

function seatState(seat: { holder: Seat["holder"] }): SideState {
  switch (seat.holder.kind) {
    case "player":
      return { kind: "player", userId: seat.holder.userId };
    case "vacant":
      return { kind: "vacant" };
    default:
      return { kind: "open" };
  }
}

export function resolveRelegationPlayoffs(input: {
  preview: RelegationPlayoffsPreview;
  matches: readonly StoredMatch[];
  firstRound: number;
  droppedIds: ReadonlySet<string>;
  lateDroppedIds: ReadonlySet<string>;
}): ResolvedMatch[] {
  const planned: PreviewMatch[] = [
    ...input.preview.relegation.flatMap((boundary) => boundary.matches),
    ...(Array.isArray(input.preview.playoffs)
      ? input.preview.playoffs.flatMap((round) => round.matches)
      : []),
  ];
  const stored = (match: PreviewMatch) =>
    input.matches.find(
      (m) =>
        m.stage === match.stage &&
        m.tier === match.tier &&
        m.round - input.firstRound + 1 === match.week &&
        m.position === match.position,
    );

  const resolved: ResolvedMatch[] = [];
  const winnerSide = (week: number, position: number): SideState => {
    const source = resolved.find(
      (m) =>
        m.stage === "playoff" && m.week === week && m.position === position,
    );
    if (!source) {
      return { kind: "open" };
    }
    switch (source.outcome.kind) {
      case "won":
        return { kind: "player", userId: source.outcome.winnerId };
      case "double_loss":
        return { kind: "vacant" };
      default:
        return { kind: "open" };
    }
  };
  const sideOf = (origin: PreviewSide): SideState =>
    origin.kind === "seat"
      ? seatState(origin)
      : winnerSide(origin.week, origin.position);

  // Relegation first, then the bracket round by round, so every winner
  // origin finds its source already resolved.
  const order = [...planned].sort(
    (x, y) =>
      Number(x.stage === "playoff") - Number(y.stage === "playoff") ||
      x.week - y.week ||
      x.position - y.position,
  );
  for (const match of order) {
    const row = stored(match);
    if (!row) {
      continue;
    }
    // A match with a result keeps the players it was played by.
    const played = row.result !== null;
    const a: SideState =
      played && row.playerAId
        ? { kind: "player", userId: row.playerAId }
        : sideOf(match.a);
    const b: SideState =
      played && row.playerBId
        ? { kind: "player", userId: row.playerBId }
        : sideOf(match.b);
    resolved.push({
      matchId: row.matchId,
      stage: match.stage,
      tier: match.tier,
      week: match.week,
      position: match.position,
      label: match.label,
      a,
      b,
      originA: match.a,
      originB: match.b,
      reported: played,
      outcome: effectiveOutcome({
        playerAId: a.kind === "player" ? a.userId : null,
        playerBId: b.kind === "player" ? b.userId : null,
        stored: row.result,
        droppedIds: input.droppedIds,
        lateDroppedIds: input.lateDroppedIds,
        vacantA: a.kind === "vacant",
        vacantB: b.kind === "vacant",
      }),
    });
  }
  return resolved;
}

// The players to store per match: a player side's id, null otherwise. Only
// for matches without a result.
export function playerWrites(
  resolved: readonly ResolvedMatch[],
): { matchId: string; playerAId: string | null; playerBId: string | null }[] {
  const id = (side: SideState) => (side.kind === "player" ? side.userId : null);
  return resolved
    .filter((match) => !match.reported)
    .map((match) => ({
      matchId: match.matchId,
      playerAId: id(match.a),
      playerBId: id(match.b),
    }));
}
