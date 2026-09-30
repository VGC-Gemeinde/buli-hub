// Pure rules for player replacements (docs/plans/player-replacement.md). A
// replacement takes over a dropped player's slot: from the entry round on the
// slot's matches are theirs, the rounds before stay the dropped player's
// matches (history, counted by the drop override), and every table shows the
// slot as one row — the replacement's, carrying those earlier drop losses.

import type { MatchdayLite } from "@/features/season/dashboard";

// An accepted replacement, the shape everything downstream of acceptance
// needs. Pending offers never reach the standings.
export type AcceptedReplacement = {
  replacedUserId: string;
  replacementUserId: string;
  entryRound: number;
};

// replaced → replacement, for the accepted replacements of a window.
export function replacedByMap(
  replacements: readonly AcceptedReplacement[],
): Map<string, string> {
  return new Map(
    replacements.map((r) => [r.replacedUserId, r.replacementUserId] as const),
  );
}

// Who holds a player's slot now: the player themself, or the end of the
// replacement chain (a replacement can be dropped and replaced in turn).
// Bounded by the map size, so a malformed cycle cannot hang a page.
export function slotHolder(
  userId: string,
  replacedBy: ReadonlyMap<string, string>,
): string {
  let holder = userId;
  for (let step = 0; step < replacedBy.size; step++) {
    const next = replacedBy.get(holder);
    if (next === undefined) {
      break;
    }
    holder = next;
  }
  return holder;
}

// Everyone whose slot `userId` holds now, nearest predecessor first.
export function predecessorsOf(
  userId: string,
  replacedBy: ReadonlyMap<string, string>,
): string[] {
  const inverse = new Map<string, string>();
  for (const [replaced, replacement] of replacedBy) {
    inverse.set(replacement, replaced);
  }
  const result: string[] = [];
  let current = userId;
  for (let step = 0; step < replacedBy.size; step++) {
    const previous = inverse.get(current);
    if (previous === undefined) {
      break;
    }
    result.push(previous);
    current = previous;
  }
  return result;
}

// The standings step after the drop override: every match still on a
// replaced player (all before the entry round, all drop losses by then) is
// attributed to whoever holds the slot now. Tallies, head-to-head and the
// division table then see one ordinary row per slot, and a table adds up —
// the opponent's free win and the slot's loss are the same match. Generic in
// the row type, like `effectiveResult`, so the match id rides along.
export function attributeReplacements<
  T extends {
    playerAId: string;
    playerBId: string | null;
    winnerId: string | null;
    games: readonly { winnerId: string }[];
  },
>(results: readonly T[], replacedBy: ReadonlyMap<string, string>): T[] {
  if (replacedBy.size === 0) {
    return [...results];
  }
  const holder = (id: string) => slotHolder(id, replacedBy);
  return results.map((result) => ({
    ...result,
    playerAId: holder(result.playerAId),
    playerBId: result.playerBId === null ? null : holder(result.playerBId),
    winnerId: result.winnerId === null ? null : holder(result.winnerId),
    games: result.games.map((game) => ({ winnerId: holder(game.winnerId) })),
  }));
}

// The table roster: everyone placed in the group minus the replaced players,
// who leave every table once their replacement has accepted.
export function standingsRoster<T extends { userId: string }>(
  members: readonly T[],
  replacedBy: ReadonlyMap<string, string>,
): T[] {
  return members.filter((member) => !replacedBy.has(member.userId));
}

// The matchdays staff can offer as the entry round today: the running one
// (a replacement found on a Tuesday usually still plays this week) and the
// next one (found on a Saturday, it may be fairer to start next week). Between
// two matchdays only the next exists; after the last one, nothing.
export function entryRoundChoices(
  matchdays: readonly MatchdayLite[],
  today: string,
): { round: number; running: boolean; startsOn: string; endsOn: string }[] {
  const sorted = [...matchdays].sort((a, b) => a.round - b.round);
  const running = sorted.find((m) => m.startsOn <= today && today <= m.endsOn);
  const next = sorted.find((m) => m.startsOn > today);
  return [
    ...(running ? [{ ...running, running: true }] : []),
    ...(next ? [{ ...next, running: false }] : []),
  ];
}

// The entry round at acceptance: staff's choice while that matchday is not
// over yet, otherwise the running (or next) one — never a past round, which
// would hand the replacement matches whose week has already ended. Null when
// the season has no matchday left.
export function effectiveEntryRound(
  chosen: number,
  matchdays: readonly MatchdayLite[],
  today: string,
): number | null {
  const sorted = [...matchdays].sort((a, b) => a.round - b.round);
  const chosenDay = sorted.find((m) => m.round === chosen);
  if (chosenDay && chosenDay.endsOn >= today) {
    return chosen;
  }
  const fallback = sorted.find((m) => m.endsOn >= today);
  return fallback?.round ?? null;
}

// Why staff may not offer a replacement right now, or null when they may.
export function offerBlock(input: {
  replacedDropped: boolean;
  replacedHasGroup: boolean;
  existing: "none" | "pending" | "accepted";
  candidateExists: boolean;
  candidatePlaced: boolean;
  candidateHasOffer: boolean;
  entryRoundOffered: boolean;
}): string | null {
  if (!input.replacedHasGroup) {
    return "Spieler ist in dieser Saison nicht platziert";
  }
  if (!input.replacedDropped) {
    return "Nur gedroppte Spieler können ersetzt werden";
  }
  if (input.existing === "accepted") {
    return "Spieler wurde bereits ersetzt";
  }
  if (input.existing === "pending") {
    return "Für diesen Spieler läuft bereits ein Angebot";
  }
  if (!input.candidateExists) {
    return "Dieser Nutzer war noch nie im Buli-Hub angemeldet";
  }
  if (input.candidatePlaced) {
    return "Dieser Spieler spielt in dieser Saison bereits mit";
  }
  if (input.candidateHasOffer) {
    return "Dieser Spieler hat bereits ein Angebot für einen anderen Platz";
  }
  if (!input.entryRoundOffered) {
    return "Dieser Spieltag kann nicht mehr gewählt werden";
  }
  return null;
}

// The staff-facing and public line about a replacement.
export function replacementLine(input: {
  replacedName: string;
  entryRound: number;
}): string {
  return `Ersatz für ${input.replacedName} ab Spieltag ${input.entryRound}`;
}

export function replacedLine(input: {
  replacementName: string;
  entryRound: number;
}): string {
  return `Ersetzt durch ${input.replacementName} ab Spieltag ${input.entryRound}`;
}

// The "Ersatz" tag of a table row, keyed by the replacement's user id — the
// tooltip text says whose slot it is and since when. Accepted only.
export function replacementNotes(
  replacements: readonly {
    replaced: { name: string };
    replacement: { userId: string };
    entryRound: number;
    acceptedAt: Date | null;
  }[],
): Map<string, string> {
  return new Map(
    replacements
      .filter((r) => r.acceptedAt !== null)
      .map((r) => [
        r.replacement.userId,
        replacementLine({
          replacedName: r.replaced.name,
          entryRound: r.entryRound,
        }),
      ]),
  );
}

// Tags the replacement rows of an assembled table (the "Ersatz" marker).
export function markReplacements<T extends { userId: string }>(
  rows: readonly T[],
  notes: ReadonlyMap<string, string>,
): (T & { replacement?: string })[] {
  return rows.map((row) => {
    const note = notes.get(row.userId);
    return note === undefined ? { ...row } : { ...row, replacement: note };
  });
}

// How many losses a replacement starts with: the slot's matches before the
// entry round, byes excluded (a bye is no match, so no loss).
export function missedMatches(
  slotMatches: readonly {
    round: number;
    playerAId: string;
    playerBId: string | null;
  }[],
  replacedUserId: string,
  entryRound: number,
): number {
  return slotMatches.filter(
    (m) =>
      m.round < entryRound &&
      m.playerBId !== null &&
      (m.playerAId === replacedUserId || m.playerBId === replacedUserId),
  ).length;
}

// `missedMatches` for each offered entry round, keyed by round — what the
// offer dialog shows next to each choice.
export function missedByEntryRound(
  slotMatches: readonly {
    round: number;
    playerAId: string;
    playerBId: string | null;
  }[],
  replacedUserId: string,
  rounds: readonly number[],
): Record<number, number> {
  return Object.fromEntries(
    rounds.map((round) => [
      round,
      missedMatches(slotMatches, replacedUserId, round),
    ]),
  );
}
