// Relegation, Playoffs and tiebreakers as the public pages show them
// (docs/plans/relegation-and-playoffs.md). Pure: the resolved state, the
// stored results and what is withheld in; one card per match out, already
// cut to what this viewer may see.
//
// - A withheld result (recording hold, Match of the Week before its VOD)
//   never reaches a viewer who is neither staff nor a participant.
// - Neither does who won it: a side that comes from a withheld match shows
//   "Sieger HF 1" (or its seat) unless the viewer plays this match or is
//   staff.
// - A pending free win is not public yet.
// Spoiler protection is the client's: the cards carry what it needs (which
// matches a side came through) to cover a chain without moving anything.

import type { FinalTable } from "@/features/final-table/places";
import type { Identity } from "@/features/season/dashboard";
import { PLAYER_NAME_FALLBACK } from "@/lib/player-name";
import { matchLabel, roundName } from "./bracket";
import type { ResolvedMatch, SideState } from "./progression";

export type PublicSide =
  | { kind: "player"; identity: Identity; note: string | null }
  | { kind: "placeholder"; label: string; candidates: Identity[] }
  | { kind: "vacant" };

export type PublicCard = {
  matchId: string;
  stage: "relegation" | "playoff";
  tier: number;
  week: number;
  position: number;
  // "HF 1", "Finale", or the pairing's number at its boundary.
  label: string;
  a: PublicSide;
  b: PublicSide;
  // open: both sides known, no result; waiting: a side is not known yet;
  // played: a result this viewer sees; withheld: played, not public yet;
  // decided: decided without a match (an empty seat, a drop).
  state: "open" | "waiting" | "played" | "withheld" | "decided";
  scoreA: number | null;
  scoreB: number | null;
  winner: "a" | "b" | null;
  doubleLoss: boolean;
  // The viewer plays this match.
  mine: boolean;
  // The matches a side's player came through, for covering the chain under
  // spoiler protection.
  fromA: string | null;
  fromB: string | null;
};

export type StoredResultView = {
  outcome: "normal" | "free_win" | "double_loss";
  winnerId: string | null;
  confirmedAt: Date | null;
  games: readonly { winnerId: string }[];
};

function score(result: StoredResultView, userId: string | null): number | null {
  if (userId === null) {
    return null;
  }
  if (result.outcome === "double_loss") {
    return 0;
  }
  if (result.outcome === "free_win") {
    return result.winnerId === userId ? 2 : 0;
  }
  return result.games.filter((game) => game.winnerId === userId).length;
}

export function publicCards(input: {
  resolved: readonly ResolvedMatch[];
  results: ReadonlyMap<string, StoredResultView>;
  // Matches whose result is withheld from the public right now.
  withheld: ReadonlySet<string>;
  // The tiebreaker match of each boundary tie, by tie key.
  tiebreakerOf: ReadonlyMap<string, string>;
  identities: ReadonlyMap<string, Identity>;
  viewer: { userId: string | null; isStaff: boolean };
}): PublicCard[] {
  const identityOf = (userId: string): Identity =>
    input.identities.get(userId) ?? {
      userId,
      name: PLAYER_NAME_FALLBACK,
      avatarUrl: null,
    };
  const totalRounds = Math.max(
    0,
    ...input.resolved.filter((m) => m.stage === "playoff").map((m) => m.week),
  );
  const sourceOf = (origin: ResolvedMatch["originA"]) =>
    origin.kind === "winner"
      ? (input.resolved.find(
          (m) =>
            m.stage === "playoff" &&
            m.week === origin.week &&
            m.position === origin.position,
        ) ?? null)
      : null;

  return input.resolved.map((match) => {
    const ids = [match.a, match.b].map((side) =>
      side.kind === "player" ? side.userId : null,
    );
    const mine =
      input.viewer.userId !== null && ids.includes(input.viewer.userId);
    const privileged = mine || input.viewer.isStaff;

    // The match a side's player came through: the earlier bracket round, or
    // the tiebreaker that decided the seat.
    const throughOf = (origin: ResolvedMatch["originA"]): string | null =>
      origin.kind === "winner"
        ? (sourceOf(origin)?.matchId ?? null)
        : origin.tieKey
          ? (input.tiebreakerOf.get(origin.tieKey) ?? null)
          : null;
    const side = (
      state: SideState,
      origin: ResolvedMatch["originA"],
    ): PublicSide => {
      const through = throughOf(origin);
      const masked =
        through !== null && input.withheld.has(through) && !privileged;
      const label = origin.kind === "seat" ? origin.seatLabel : origin.label;
      if (state.kind === "vacant") {
        return { kind: "vacant" };
      }
      if (state.kind === "open" || masked) {
        return { kind: "placeholder", label, candidates: [] };
      }
      return {
        kind: "player",
        identity: identityOf(state.userId),
        note: origin.kind === "seat" ? origin.seatLabel : null,
      };
    };

    const result = input.results.get(match.matchId) ?? null;
    const hiddenPending =
      result?.outcome === "free_win" &&
      result.confirmedAt === null &&
      !privileged;
    const withheld =
      result !== null && input.withheld.has(match.matchId) && !privileged;
    const sideKnown = match.a.kind !== "open" && match.b.kind !== "open";
    const decidedWithout =
      result === null && match.outcome.kind !== "none" && sideKnown;
    const state: PublicCard["state"] =
      result !== null && !hiddenPending
        ? withheld
          ? "withheld"
          : "played"
        : decidedWithout
          ? "decided"
          : sideKnown
            ? "open"
            : "waiting";

    const showResult = state === "played" || state === "decided";
    const winnerId =
      showResult && match.outcome.kind === "won"
        ? match.outcome.winnerId
        : null;
    return {
      matchId: match.matchId,
      stage: match.stage,
      tier: match.tier,
      week: match.week,
      position: match.position,
      label:
        match.stage === "playoff"
          ? matchLabel(totalRounds, match.week, match.position)
          : match.label,
      a: side(match.a, match.originA),
      b: side(match.b, match.originB),
      state,
      scoreA: state === "played" && result ? score(result, ids[0]) : null,
      scoreB: state === "played" && result ? score(result, ids[1]) : null,
      winner: winnerId === null ? null : winnerId === ids[0] ? "a" : "b",
      doubleLoss: showResult && match.outcome.kind === "double_loss",
      mine,
      fromA: throughOf(match.originA),
      fromB: throughOf(match.originB),
    };
  });
}

// The bracket's rounds, named, with their cards in position order.
export function bracketRounds(cards: readonly PublicCard[]) {
  const playoffs = cards.filter((card) => card.stage === "playoff");
  const total = Math.max(0, ...playoffs.map((card) => card.week));
  return Array.from({ length: total }, (_, i) => ({
    week: i + 1,
    name: roundName(total, i + 1),
    cards: playoffs
      .filter((card) => card.week === i + 1)
      .sort((x, y) => x.position - y.position),
  }));
}

// The champion as the public sees it: a name, "none" (a final lost by both),
// or null while the final is open or not public.
export function publicChampion(
  cards: readonly PublicCard[],
): { identity: Identity; matchId: string } | "none" | null {
  const finals = cards.filter((card) => card.stage === "playoff");
  if (finals.length === 0) {
    return null;
  }
  const final = finals.reduce((last, card) =>
    card.week > last.week ? card : last,
  );
  if (final.doubleLoss) {
    return "none";
  }
  const side =
    final.winner === "a" ? final.a : final.winner === "b" ? final.b : null;
  return side?.kind === "player"
    ? { identity: side.identity, matchId: final.matchId }
    : null;
}

// Tiebreakers for the division view: who plays for which shared place.
export type PublicTiebreaker = {
  matchId: string;
  tableName: string;
  placeLabel: string;
  a: Identity;
  b: Identity;
  state: "open" | "played" | "withheld";
  scoreA: number | null;
  scoreB: number | null;
  winner: "a" | "b" | null;
  doubleLoss: boolean;
  mine: boolean;
};

export function publicTiebreakers(input: {
  tiebreakers: readonly {
    matchId: string;
    tieKey: string;
    playerAId: string;
    playerBId: string;
  }[];
  tables: readonly FinalTable[];
  tableName: (table: FinalTable) => string;
  results: ReadonlyMap<string, StoredResultView>;
  withheld: ReadonlySet<string>;
  identities: ReadonlyMap<string, Identity>;
  viewer: { userId: string | null; isStaff: boolean };
}): PublicTiebreaker[] {
  const identityOf = (userId: string): Identity =>
    input.identities.get(userId) ?? {
      userId,
      name: PLAYER_NAME_FALLBACK,
      avatarUrl: null,
    };
  return input.tiebreakers.flatMap((tiebreaker) => {
    const table = input.tables.find((t) =>
      t.ties.some((tie) => tie.key === tiebreaker.tieKey),
    );
    const tie = table?.ties.find((t) => t.key === tiebreaker.tieKey);
    if (!table || !tie) {
      return [];
    }
    const ids = [tiebreaker.playerAId, tiebreaker.playerBId];
    const mine =
      input.viewer.userId !== null && ids.includes(input.viewer.userId);
    const privileged = mine || input.viewer.isStaff;
    const result = input.results.get(tiebreaker.matchId) ?? null;
    const visible =
      result !== null &&
      !(
        result.outcome === "free_win" &&
        result.confirmedAt === null &&
        !privileged
      );
    const withheld =
      visible && input.withheld.has(tiebreaker.matchId) && !privileged;
    const state: PublicTiebreaker["state"] = !visible
      ? "open"
      : withheld
        ? "withheld"
        : "played";
    const shown = state === "played" && result ? result : null;
    return [
      {
        matchId: tiebreaker.matchId,
        tableName: input.tableName(table),
        placeLabel: `Platz ${tie.indexes[0] + 1}`,
        a: identityOf(ids[0]),
        b: identityOf(ids[1]),
        state,
        scoreA: shown ? score(shown, ids[0]) : null,
        scoreB: shown ? score(shown, ids[1]) : null,
        winner:
          shown && shown.outcome !== "double_loss" && shown.winnerId
            ? shown.winnerId === ids[0]
              ? "a"
              : "b"
            : null,
        doubleLoss: shown?.outcome === "double_loss",
        mine,
      },
    ];
  });
}

// The week after the regular season running today, from 1; null outside
// every week.
export function currentAfterSeasonWeek(
  weeks: readonly { startsOn: string; endsOn: string }[],
  today: string,
): number | null {
  const index = weeks.findIndex(
    (week) => week.startsOn <= today && today <= week.endsOn,
  );
  return index === -1 ? null : index + 1;
}

// The week the Liga-Übersicht opens on once the weeks after the regular
// season are published: the running one, the last one begun, else the first.
export function afterSeasonWeekToShow(
  weeks: readonly { startsOn: string; endsOn: string }[],
  today: string,
): number {
  const begun = weeks.filter((week) => week.startsOn <= today).length;
  return currentAfterSeasonWeek(weeks, today) ?? Math.max(1, begun);
}

export type DivisionWeekSection =
  | { kind: "tiebreaker"; label: string; tiebreakers: PublicTiebreaker[] }
  | { kind: "relegation" | "playoff"; label: string; cards: PublicCard[] };

// What a division plays in one week after the regular season: its
// tiebreakers (week 1), the Relegation at each of its boundaries and, for
// Division 1, the Playoff round.
export function divisionWeek(input: {
  cards: readonly PublicCard[];
  tiebreakers: readonly PublicTiebreaker[];
  tiebreakerTiers: ReadonlyMap<string, number>;
  tier: number;
  week: number;
}): DivisionWeekSection[] {
  return weekSections({
    cards: input.cards,
    week: input.week,
    tiebreakers: input.tiebreakers.filter(
      (t) => input.tiebreakerTiers.get(t.matchId) === input.tier,
    ),
    includes: (card) =>
      card.stage === "relegation"
        ? card.tier === input.tier || card.tier === input.tier - 1
        : card.tier === input.tier,
  });
}

// What the viewer's favourites play in one week after the regular season.
export function favoritesAfterSeasonWeek(input: {
  cards: readonly PublicCard[];
  tiebreakers: readonly PublicTiebreaker[];
  favoriteIds: ReadonlySet<string>;
  week: number;
}): DivisionWeekSection[] {
  const favorite = (side: PublicSide) =>
    side.kind === "player" && input.favoriteIds.has(side.identity.userId);
  return weekSections({
    cards: input.cards,
    week: input.week,
    tiebreakers: input.tiebreakers.filter(
      (t) =>
        input.favoriteIds.has(t.a.userId) || input.favoriteIds.has(t.b.userId),
    ),
    includes: (card) => favorite(card.a) || favorite(card.b),
  });
}

// One week's matches under their labels, in the order tiebreakers,
// Relegation by boundary, Playoff round.
function weekSections(input: {
  cards: readonly PublicCard[];
  tiebreakers: readonly PublicTiebreaker[];
  week: number;
  includes: (card: PublicCard) => boolean;
}): DivisionWeekSection[] {
  const sections: DivisionWeekSection[] = [];
  // Tiebreakers run in week 1.
  if (input.week === 1 && input.tiebreakers.length > 0) {
    sections.push({
      kind: "tiebreaker",
      label: "Tiebreaker",
      tiebreakers: [...input.tiebreakers],
    });
  }
  const inWeek = input.cards
    .filter((card) => card.week === input.week && input.includes(card))
    .sort((x, y) => x.tier - y.tier || x.position - y.position);
  const relegation = inWeek.filter((card) => card.stage === "relegation");
  for (const upper of [...new Set(relegation.map((card) => card.tier))]) {
    sections.push({
      kind: "relegation",
      label: `Relegation · Division ${upper} und ${upper + 1}`,
      cards: relegation.filter((card) => card.tier === upper),
    });
  }
  const total = Math.max(
    0,
    ...input.cards.filter((c) => c.stage === "playoff").map((c) => c.week),
  );
  const playoffs = inWeek.filter((card) => card.stage === "playoff");
  if (playoffs.length > 0) {
    sections.push({
      kind: "playoff",
      label: `Playoffs · ${roundName(total, input.week)}`,
      cards: playoffs,
    });
  }
  return sections;
}
