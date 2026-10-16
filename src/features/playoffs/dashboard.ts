// The Spieler-Dashboard after the regular season
// (docs/plans/relegation-and-playoffs.md): the player's next match in a
// tiebreaker, the Relegation or the Playoffs with what is at stake, or, once
// they have nothing left to play, their season outcome. Pure.

import type { Identity } from "@/features/season/dashboard";
import { roundName } from "./bracket";
import type { PublicCard, PublicTiebreaker } from "./public-view";
import type { SeasonOutcome } from "./season-outcome";

export type DashboardHero =
  | {
      kind: "match";
      matchId: string;
      // "Relegation", "Playoffs · Halbfinale", "Tiebreaker".
      stage: string;
      // The opponent, or what the side is until it is known.
      opponent:
        | { kind: "player"; identity: Identity }
        | { kind: "open"; label: string };
      stakes: { win: string; loss: string } | null;
    }
  | {
      kind: "outcome";
      outcome: SeasonOutcome;
      champion: boolean;
      // The division the player plays in next season.
      nextTier: number;
    };

function opponentOf(
  card: PublicCard,
  meId: string,
): { kind: "player"; identity: Identity } | { kind: "open"; label: string } {
  const isA = card.a.kind === "player" && card.a.identity.userId === meId;
  const other = isA ? card.b : card.a;
  if (other.kind === "player") {
    return { kind: "player", identity: other.identity };
  }
  return {
    kind: "open",
    label: other.kind === "placeholder" ? other.label : "Freilos",
  };
}

export function dashboardHero(input: {
  meId: string;
  tier: number;
  cards: readonly PublicCard[];
  tiebreakers: readonly PublicTiebreaker[];
  outcome: { outcome: SeasonOutcome | null; champion: boolean } | null;
}): DashboardHero | null {
  const open = (state: PublicCard["state"]) =>
    state === "open" || state === "waiting";

  const tiebreaker = input.tiebreakers.find(
    (t) => t.mine && t.state === "open",
  );
  if (tiebreaker) {
    const isA = tiebreaker.a.userId === input.meId;
    return {
      kind: "match",
      matchId: tiebreaker.matchId,
      stage: "Tiebreaker",
      opponent: {
        kind: "player",
        identity: isA ? tiebreaker.b : tiebreaker.a,
      },
      stakes: null,
    };
  }

  const totalRounds = Math.max(
    0,
    ...input.cards.filter((c) => c.stage === "playoff").map((c) => c.week),
  );
  const next = [...input.cards]
    .filter((card) => card.mine && open(card.state))
    .sort((x, y) => x.week - y.week)[0];
  if (next) {
    const isUpper =
      next.a.kind === "player" && next.a.identity.userId === input.meId;
    const stakes =
      next.stage === "relegation"
        ? isUpper
          ? {
              win: `Klassenerhalt in Division ${next.tier}`,
              loss: `Abstieg in Division ${next.tier + 1}`,
            }
          : {
              win: `Aufstieg in Division ${next.tier}`,
              loss: `Klassenerhalt in Division ${next.tier + 1}`,
            }
        : {
            win:
              next.week === totalRounds
                ? "Meister"
                : `${roundName(totalRounds, next.week + 1)}`,
            loss: "Ausgeschieden",
          };
    return {
      kind: "match",
      matchId: next.matchId,
      stage:
        next.stage === "relegation"
          ? "Relegation"
          : `Playoffs · ${roundName(totalRounds, next.week)}`,
      opponent: opponentOf(next, input.meId),
      stakes,
    };
  }

  if (input.outcome?.outcome) {
    const outcome = input.outcome.outcome;
    return {
      kind: "outcome",
      outcome,
      champion: input.outcome.champion,
      nextTier:
        outcome === "promoted"
          ? input.tier - 1
          : outcome === "demoted"
            ? input.tier + 1
            : input.tier,
    };
  }
  return null;
}

// One row of the Spielplan's part after the regular season: the player's
// tiebreaker, Relegation and Playoff matches, and while they are still in
// the Playoffs the rounds they reach by winning.
export type AfterSeasonRow = {
  // Null for a round the player has not reached.
  matchId: string | null;
  // The week after the regular season, from 1.
  week: number;
  startsOn: string | null;
  endsOn: string | null;
  // "Tiebreaker · Platz 4", "Relegation", "Playoffs · Halbfinale".
  stage: string;
  opponent:
    | { kind: "player"; identity: Identity }
    | { kind: "open"; label: string }
    | { kind: "none" };
  status:
    | {
        kind: "result";
        self: number;
        opponent: number;
        label: "Sieg" | "Niederlage" | "Doppelniederlage";
      }
    | {
        kind: "decided";
        label: "Kampflos gewonnen" | "Kampflos verloren" | "Doppelniederlage";
      }
    | { kind: "open"; current: boolean; overdue: boolean }
    | { kind: "ahead" };
};

export type AfterSeasonSchedule = {
  // The stages the player plays, in order: "Tiebreaker · Relegation".
  title: string;
  rows: AfterSeasonRow[];
};

export function afterSeasonSchedule(input: {
  meId: string;
  cards: readonly PublicCard[];
  tiebreakers: readonly PublicTiebreaker[];
  // The weeks after the regular season, in order.
  weeks: readonly { startsOn: string; endsOn: string }[];
  today: string;
}): AfterSeasonSchedule | null {
  const weekOf = (week: number) => input.weeks[week - 1] ?? null;
  const timing = (week: number, open: boolean) => {
    const dates = weekOf(week);
    return {
      current:
        dates !== null &&
        dates.startsOn <= input.today &&
        input.today <= dates.endsOn,
      overdue: open && dates !== null && input.today > dates.endsOn,
    };
  };
  const dated = (week: number) => ({
    week,
    startsOn: weekOf(week)?.startsOn ?? null,
    endsOn: weekOf(week)?.endsOn ?? null,
  });
  const resultLabel = (won: boolean, doubleLoss: boolean) =>
    doubleLoss ? "Doppelniederlage" : won ? "Sieg" : "Niederlage";

  const rows: AfterSeasonRow[] = [];
  for (const tiebreaker of input.tiebreakers.filter((t) => t.mine)) {
    const isA = tiebreaker.a.userId === input.meId;
    const played = tiebreaker.state === "played";
    rows.push({
      matchId: tiebreaker.matchId,
      ...dated(1),
      stage: `Tiebreaker · ${tiebreaker.placeLabel}`,
      opponent: {
        kind: "player",
        identity: isA ? tiebreaker.b : tiebreaker.a,
      },
      status:
        played && tiebreaker.scoreA !== null && tiebreaker.scoreB !== null
          ? {
              kind: "result",
              self: isA ? tiebreaker.scoreA : tiebreaker.scoreB,
              opponent: isA ? tiebreaker.scoreB : tiebreaker.scoreA,
              label: resultLabel(
                tiebreaker.winner === (isA ? "a" : "b"),
                tiebreaker.doubleLoss,
              ),
            }
          : { kind: "open", ...timing(1, true) },
    });
  }

  const totalRounds = Math.max(
    0,
    ...input.cards.filter((c) => c.stage === "playoff").map((c) => c.week),
  );
  const stageOf = (card: PublicCard) =>
    card.stage === "relegation"
      ? "Relegation"
      : `Playoffs · ${roundName(totalRounds, card.week)}`;
  const mine = input.cards
    .filter((card) => card.mine)
    .sort((x, y) => x.week - y.week);
  for (const card of mine) {
    const isA =
      card.a.kind === "player" && card.a.identity.userId === input.meId;
    const own = isA ? "a" : "b";
    const scores = [card.scoreA, card.scoreB];
    const status: AfterSeasonRow["status"] =
      card.state === "played" && scores[0] !== null && scores[1] !== null
        ? {
            kind: "result",
            self: (isA ? scores[0] : scores[1]) ?? 0,
            opponent: (isA ? scores[1] : scores[0]) ?? 0,
            label: resultLabel(card.winner === own, card.doubleLoss),
          }
        : card.state === "decided"
          ? {
              kind: "decided",
              label: card.doubleLoss
                ? "Doppelniederlage"
                : card.winner === own
                  ? "Kampflos gewonnen"
                  : "Kampflos verloren",
            }
          : { kind: "open", ...timing(card.week, card.state === "open") };
    rows.push({
      matchId: card.matchId,
      ...dated(card.week),
      stage: stageOf(card),
      opponent: opponentRow(card, input.meId),
      status,
    });
  }

  // Still in the Playoffs: the rounds a win leads to.
  const last = mine.at(-1);
  if (
    last &&
    last.stage === "playoff" &&
    (last.state === "open" || last.state === "waiting")
  ) {
    let through = last.matchId;
    for (;;) {
      const next = input.cards.find(
        (card) => card.fromA === through || card.fromB === through,
      );
      if (!next) {
        break;
      }
      rows.push({
        matchId: null,
        ...dated(next.week),
        stage: stageOf(next),
        opponent: { kind: "open", label: "Bei Sieg" },
        status: { kind: "ahead" },
      });
      through = next.matchId;
    }
  }

  if (rows.length === 0) {
    return null;
  }
  const stages = [...new Set(rows.map((row) => row.stage.split(" · ")[0]))];
  return { title: stages.join(" · "), rows };
}

function opponentRow(
  card: PublicCard,
  meId: string,
): AfterSeasonRow["opponent"] {
  const opponent = opponentOf(card, meId);
  if (opponent.kind === "open" && opponent.label === "Freilos") {
    return { kind: "none" };
  }
  return opponent;
}
