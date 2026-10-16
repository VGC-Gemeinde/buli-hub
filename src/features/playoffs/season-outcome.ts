// Every player's season outcome and the champion
// (docs/plans/relegation-and-playoffs.md): from the final tables (with their
// decided ties) and the resolved Relegation and Playoffs. Pure. Live until
// staff complete the season, then written onto `placements`.

import type { FinalTable, Place } from "@/features/final-table/places";
import type { Zone } from "@/features/seeding/post-season";
import type { ResolvedMatch } from "./progression";

export type SeasonOutcome = "promoted" | "stays" | "demoted";

// What a zone leads to when its match is lost (or for a direct zone, simply
// what it is): the outcome a player gets at worst from that place.
const WORST: Record<Zone, SeasonOutcome> = {
  champion: "stays",
  promote: "promoted",
  promotion_playoff: "stays",
  none: "stays",
  demotion_playoff: "demoted",
  demote: "demoted",
};

const RANK: Record<SeasonOutcome, number> = {
  promoted: 2,
  stays: 1,
  demoted: 0,
};

export type PlayerOutcome = {
  userId: string;
  tier: number;
  // Null while something it depends on is undecided.
  outcome: SeasonOutcome | null;
};

export type SeasonResult = {
  players: PlayerOutcome[];
  // The champion's id; "none" after a final lost by both (or without title
  // seats); null while the final is undecided.
  champion: string | "none" | null;
};

export function seasonOutcomes(input: {
  tablesByTier: ReadonlyMap<number, readonly FinalTable[]>;
  resolved: readonly ResolvedMatch[];
}): SeasonResult {
  const relegation = input.resolved.filter((m) => m.stage === "relegation");
  // The relegation match a seat plays in, by the player holding it.
  const relegationOf = (userId: string, side: "upper" | "lower") =>
    relegation.find((match) => {
      const s = side === "upper" ? match.a : match.b;
      return s.kind === "player" && s.userId === userId;
    });

  const players: PlayerOutcome[] = [];
  for (const [tier, tables] of input.tablesByTier) {
    for (const table of tables) {
      for (const place of table.places) {
        for (const outcome of placeOutcomes(table, place, relegationOf)) {
          players.push({ tier, ...outcome });
        }
      }
    }
  }

  return { players: dedupe(players), champion: championOf(input) };
}

// A tied place yields the same entry for each of its places; keep one per
// player.
function dedupe(players: PlayerOutcome[]): PlayerOutcome[] {
  const seen = new Set<string>();
  return players.filter((player) => {
    if (seen.has(player.userId)) {
      return false;
    }
    seen.add(player.userId);
    return true;
  });
}

function placeOutcomes(
  table: FinalTable,
  place: Place,
  relegationOf: (
    userId: string,
    side: "upper" | "lower",
  ) => ResolvedMatch | undefined,
): { userId: string; outcome: SeasonOutcome | null }[] {
  const holder = place.holder;
  if (holder.kind === "tie") {
    // Undecided: every tied player waits.
    return holder.candidates.map((userId) => ({ userId, outcome: null }));
  }
  if (holder.kind === "vacant") {
    // A tiebreaker lost by both: the tied players get the worst outcome
    // their shared place could lead to.
    const tie = table.ties.find((t) => t.key === holder.tieKey);
    if (!tie) {
      return [];
    }
    const worst = tie.zones
      .map((zone) => WORST[zone])
      .reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));
    return tie.userIds.map((userId) => ({ userId, outcome: worst }));
  }
  const userId = holder.userId;
  switch (place.zone) {
    case "promote":
      return [{ userId, outcome: "promoted" }];
    case "demote":
      return [{ userId, outcome: "demoted" }];
    case "none":
    case "champion":
      return [{ userId, outcome: "stays" }];
    case "promotion_playoff":
      return [
        {
          userId,
          outcome: relegationResult(relegationOf(userId, "lower"), userId, {
            won: "promoted",
            lost: "stays",
          }),
        },
      ];
    case "demotion_playoff":
      return [
        {
          userId,
          outcome: relegationResult(relegationOf(userId, "upper"), userId, {
            won: "stays",
            lost: "demoted",
          }),
        },
      ];
  }
}

function relegationResult(
  match: ResolvedMatch | undefined,
  userId: string,
  map: { won: SeasonOutcome; lost: SeasonOutcome },
): SeasonOutcome | null {
  if (!match) {
    // A seat without a match (should not happen once the schedule exists).
    return null;
  }
  switch (match.outcome.kind) {
    case "none":
      return null;
    case "double_loss":
      return map.lost;
    case "won":
      return match.outcome.winnerId === userId ? map.won : map.lost;
  }
}

function championOf(input: {
  tablesByTier: ReadonlyMap<number, readonly FinalTable[]>;
  resolved: readonly ResolvedMatch[];
}): string | "none" | null {
  const playoffs = input.resolved.filter((m) => m.stage === "playoff");
  if (playoffs.length === 0) {
    // No bracket: a single title seat is the champion, none means no title.
    const top = Math.min(...input.tablesByTier.keys());
    const seats = (input.tablesByTier.get(top) ?? []).flatMap((table) =>
      table.places.filter((place) => place.zone === "champion"),
    );
    if (seats.length !== 1) {
      return "none";
    }
    const holder = seats[0].holder;
    return holder.kind === "player"
      ? holder.userId
      : holder.kind === "vacant"
        ? "none"
        : null;
  }
  const final = playoffs.reduce((last, m) => (m.week > last.week ? m : last));
  switch (final.outcome.kind) {
    case "won":
      return final.outcome.winnerId;
    case "double_loss":
      return "none";
    default:
      return null;
  }
}

// Whether everything that decides the season is decided: every player has an
// outcome and the champion is known.
export function seasonDecided(result: SeasonResult): boolean {
  return (
    result.champion !== null &&
    result.players.every((player) => player.outcome !== null)
  );
}
