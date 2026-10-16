import {
  droppedIdsForWindow,
  lateDroppedIdsForWindow,
} from "@/features/drops/queries";
import type { FinalTable, TieDecision } from "@/features/final-table/places";
import { loadFinalTables } from "@/features/final-table/queries";
import { motwForWindow } from "@/features/motw/queries";
import {
  playerWrites,
  type ResolvedMatch,
  resolveRelegationPlayoffs,
} from "@/features/playoffs/progression";
import {
  type SeasonResult,
  seasonOutcomes,
} from "@/features/playoffs/season-outcome";
import { holdsForWindow } from "@/features/recordings/queries";
import { replacementsForWindow } from "@/features/replacements/queries";
import {
  resultsWithGames,
  windowMatchOverview,
} from "@/features/reporting/queries";
import type { Identity } from "@/features/season/dashboard";
import {
  allMatchdaysForWindow,
  matchdaysForWindow,
} from "@/features/season/queries";
import { divisionsWithGroupSizes } from "@/features/seeding/queries";
import { divisionName, subDivisionName } from "@/features/seeding/seeding";
import { germanToday } from "@/lib/german-time";
import { PLAYER_NAME_FALLBACK } from "@/lib/player-name";
import { effectiveOutcome } from "./effective-outcome";
import {
  hasRelegationPlayoffsSchedule,
  lateMatchOpenPoints,
  regularSeasonClosed,
  relegationPlayoffsMatchRows,
  seasonCompleted,
  tiebreakerRows,
  tieOrdersFor,
  updateSeats,
} from "./queries";
import {
  relegationPlayoffsMatches,
  relegationPlayoffsWeekContents,
  relegationPlayoffsWeeks,
} from "./relegation-playoffs";
import {
  type RelegationPlayoffsPreview,
  relegationPlayoffsPreview,
  ZONE_LABEL,
} from "./relegation-playoffs-preview";
import {
  type PublishBlocker,
  type PublishFacts,
  publishBlockers,
  tieDecisions,
} from "./relegation-playoffs-publish";
import {
  type ScheduledMatchSides,
  scheduledMatchSides,
} from "./relegation-playoffs-sides";
import { defaultDeadlines } from "./spieltage";
import { matchStageTitle } from "./stage-title";

// What the create dialog needs: the calendar defaults and what the schedule
// would hold. Null while there is no regular Spieltag to follow.
export type RelegationPlayoffsSetup = {
  lastSpieltagEnd: string;
  defaultDeadlines: string[];
  weekContents: string[];
  relegationMatches: number;
  playoffMatches: number;
};

// The state of the season's Relegation und Playoffs schedule for staff:
// still to create (with the dialog's facts), or created (with the live
// preview). Server-only; reads the seeding, the calendar and the standings.
// A shared place of three or more across a boundary, waiting for (or
// carrying) the staff's order.
export type StaffOrderTie = {
  tieKey: string;
  tableName: string;
  // The tied players in their current order: the saved one, or the table's.
  players: Identity[];
  // What each place means, best first ("Platz 4 · Relegation").
  placeLabels: string[];
  reason: string;
  decided: boolean;
};

export async function relegationPlayoffsState(windowId: string): Promise<
  | { kind: "setup"; setup: RelegationPlayoffsSetup | null }
  | {
      kind: "created";
      preview: RelegationPlayoffsPreview;
      identities: Map<string, Identity>;
      // Null once published; until then what still blocks publishing.
      blockers: PublishBlocker[] | null;
      counts: { relegation: number; playoffs: number; tiebreakers: number };
      staffOrders: StaffOrderTie[];
    }
> {
  const [created, matchdays, closed] = await Promise.all([
    hasRelegationPlayoffsSchedule(windowId),
    allMatchdaysForWindow(windowId),
    regularSeasonClosed(windowId),
  ]);

  if (created) {
    const [decided, orders] = await Promise.all([
      currentTieDecisions(windowId),
      tieOrdersFor(windowId),
    ]);
    const { tablesByTier, identities } = await loadFinalTables(
      windowId,
      decided,
    );
    const preview = relegationPlayoffsPreview({
      tablesByTier,
      matchdays: matchdays.filter((day) => !day.regular),
    });
    const ties = [...tablesByTier.values()]
      .flat()
      .flatMap((table) => table.ties);
    const identityOf = (userId: string): Identity =>
      identities.get(userId) ?? {
        userId,
        name: PLAYER_NAME_FALLBACK,
        avatarUrl: null,
      };
    return {
      kind: "created",
      preview,
      identities,
      blockers: closed
        ? null
        : publishBlockers(await publishFacts(windowId, germanToday())),
      counts: {
        relegation: preview.relegation.reduce(
          (sum, boundary) => sum + boundary.matches.length,
          0,
        ),
        playoffs: Array.isArray(preview.playoffs)
          ? preview.playoffs[0].matches.length * 2 +
            preview.playoffs[0].byes.length
          : 0,
        tiebreakers: ties.filter((tie) => tie.decision === "tiebreaker").length,
      },
      staffOrders: ties
        .filter((tie) => tie.decision === "staff_order")
        .map((tie) => {
          const saved = orders.find((order) => order.tieKey === tie.key);
          const preview = previewTieName(tie);
          return {
            tieKey: tie.key,
            tableName: preview,
            players: (saved?.order ?? tie.userIds).map(identityOf),
            placeLabels: tie.indexes.map(
              (index, i) => `Platz ${index + 1} · ${ZONE_LABEL[tie.zones[i]]}`,
            ),
            reason: saved?.reason ?? "",
            decided: saved !== undefined,
          };
        }),
    };
  }

  return { kind: "setup", setup: await setupFrom(windowId, matchdays) };
}

function previewTieName(tie: {
  tier: number;
  groupPosition: number | null;
}): string {
  return tie.groupPosition === null
    ? divisionName(tie.tier)
    : subDivisionName(tie.tier, tie.groupPosition);
}

async function setupFrom(
  windowId: string,
  matchdays: readonly { endsOn: string; regular: boolean }[],
): Promise<RelegationPlayoffsSetup | null> {
  const regular = matchdays.filter((day) => day.regular);
  const last = regular[regular.length - 1];
  if (!last) {
    return null;
  }
  const divisions = await divisionsWithGroupSizes(windowId);
  const matches = relegationPlayoffsMatches(divisions);
  return {
    lastSpieltagEnd: last.endsOn,
    defaultDeadlines: defaultDeadlines(
      last.endsOn,
      relegationPlayoffsWeeks(divisions),
    ),
    weekContents: relegationPlayoffsWeekContents(divisions),
    relegationMatches: matches.filter((m) => m.stage === "relegation").length,
    playoffMatches: matches.filter((m) => m.stage === "playoff").length,
  };
}

// The create dialog's facts while the schedule is still to create; null once
// it exists (or before there is a Spieltag to follow).
export async function relegationPlayoffsSetup(
  windowId: string,
): Promise<RelegationPlayoffsSetup | null> {
  if (await hasRelegationPlayoffsSchedule(windowId)) {
    return null;
  }
  return setupFrom(windowId, await allMatchdaysForWindow(windowId));
}

// Every Relegation and playoff match with who plays or could play each side,
// plus the identities behind the ids. Empty before the schedule exists.
export async function relegationPlayoffsSides(windowId: string): Promise<{
  matches: ScheduledMatchSides[];
  identities: Map<string, Identity>;
}> {
  const [rows, matchdays] = await Promise.all([
    relegationPlayoffsMatchRows(windowId),
    allMatchdaysForWindow(windowId),
  ]);
  const extra = matchdays.filter((day) => !day.regular);
  if (rows.length === 0 || extra.length === 0) {
    return { matches: [], identities: new Map() };
  }
  const { tablesByTier, identities } = await loadFinalTables(
    windowId,
    await currentTieDecisions(windowId),
  );
  const preview = relegationPlayoffsPreview({ tablesByTier, matchdays: extra });
  return {
    matches: scheduledMatchSides({
      rows,
      preview,
      firstRound: extra[0].round,
    }),
    identities,
  };
}

// How the boundary ties stand: tiebreaker results that count (a drop
// decides an unplayed one) and staff orders
// (docs/plans/relegation-and-playoffs.md).
export async function currentTieDecisions(
  windowId: string,
): Promise<Map<string, TieDecision>> {
  const [tiebreakers, orders, droppedIds, lateDroppedIds] = await Promise.all([
    tiebreakerRows(windowId),
    tieOrdersFor(windowId),
    droppedIdsForWindow(windowId),
    lateDroppedIdsForWindow(windowId),
  ]);
  return tieDecisions({
    tiebreakers: tiebreakers.map((row) => {
      const outcome = effectiveOutcome({
        playerAId: row.playerAId,
        playerBId: row.playerBId,
        stored: row.outcome
          ? {
              outcome: row.outcome,
              winnerId: row.winnerId,
              confirmedAt: row.confirmedAt,
            }
          : null,
        droppedIds,
        lateDroppedIds,
      });
      return {
        tieKey: row.tieKey,
        playerAId: row.playerAId,
        playerBId: row.playerBId,
        outcome:
          outcome.kind === "none"
            ? null
            : outcome.kind === "won"
              ? "won"
              : "double_loss",
        winnerId: outcome.kind === "won" ? outcome.winnerId : null,
      };
    }),
    orders,
  });
}

// Relegation und Playoffs as they stand: every match with who plays each
// side and how it ends, plus the preview it was resolved from and the
// identities behind the ids (docs/plans/relegation-and-playoffs.md). Null
// before the schedule exists.
export async function relegationPlayoffsResolved(windowId: string): Promise<{
  resolved: ResolvedMatch[];
  preview: RelegationPlayoffsPreview;
  tablesByTier: Map<number, FinalTable[]>;
  identities: Map<string, Identity>;
  firstRound: number;
} | null> {
  const [decided, rows, matchdays, droppedIds, lateDroppedIds] =
    await Promise.all([
      currentTieDecisions(windowId),
      relegationPlayoffsMatchRows(windowId),
      allMatchdaysForWindow(windowId),
      droppedIdsForWindow(windowId),
      lateDroppedIdsForWindow(windowId),
    ]);
  const extra = matchdays.filter((day) => !day.regular);
  if (extra.length === 0) {
    return null;
  }
  const { tablesByTier, identities } = await loadFinalTables(windowId, decided);
  const preview = relegationPlayoffsPreview({ tablesByTier, matchdays: extra });
  return {
    resolved: resolveRelegationPlayoffs({
      preview,
      matches: rows,
      firstRound: extra[0].round,
      droppedIds,
      lateDroppedIds,
    }),
    preview,
    tablesByTier,
    identities,
    firstRound: extra[0].round,
  };
}

// Writes who plays every Relegation and playoff match without a result:
// the seats from the table, the winners of the earlier bracket rounds. After
// publishing and after every change that can move one of them. Idempotent;
// a match with a result keeps the players it was played by. Before
// publishing the players stay empty, so nothing reaches a player early.
export async function syncSeats(windowId: string): Promise<void> {
  if (!(await regularSeasonClosed(windowId))) {
    return;
  }
  const state = await relegationPlayoffsResolved(windowId);
  if (state) {
    await updateSeats(playerWrites(state.resolved));
  }
}

// The publish checklist's facts for the season, read from the regular
// season's matches and the staff workspaces.
export async function publishFacts(
  windowId: string,
  today: string,
): Promise<PublishFacts> {
  const [overview, holds, selections, replacements, matchdays, created] =
    await Promise.all([
      windowMatchOverview(windowId),
      holdsForWindow(windowId),
      motwForWindow(windowId),
      replacementsForWindow(windowId),
      matchdaysForWindow(windowId),
      hasRelegationPlayoffsSchedule(windowId),
    ]);
  const regularIds = new Set(overview.map((match) => match.matchId));
  const last = matchdays[matchdays.length - 1];
  return {
    scheduleCreated: created,
    lastSpieltagOver: last !== undefined && today > last.endsOn,
    unreported: overview.filter(
      (match) => match.outcome === null && !match.decidedByDrop,
    ).length,
    openDisputes: overview.filter((match) => match.dispute !== null).length,
    pendingFreeWins: overview.filter(
      (match) => match.outcome === "free_win" && match.confirmedAt === null,
    ).length,
    heldRegular: holds.filter((hold) => regularIds.has(hold.matchId)).length,
    motwWithoutVod: selections.filter(
      (selection) =>
        selection.youtubeUrl === null && regularIds.has(selection.matchId),
    ).length,
    openReplacementOffers: replacements.filter(
      (replacement) => replacement.acceptedAt === null,
    ).length,
  };
}

// Whether the season can be completed, and its outcome so far: every
// player's outcome and the champion known, no dispute open and nothing
// withheld among the matches after the regular season. Null before
// publishing.
export async function seasonCompletionState(windowId: string): Promise<{
  result: SeasonResult;
  blockers: string[];
  completed: boolean;
} | null> {
  if (!(await regularSeasonClosed(windowId))) {
    return null;
  }
  const [state, open, completed] = await Promise.all([
    relegationPlayoffsResolved(windowId),
    lateMatchOpenPoints(windowId),
    seasonCompleted(windowId),
  ]);
  if (!state) {
    return null;
  }
  const result = seasonOutcomes({
    tablesByTier: state.tablesByTier,
    resolved: state.resolved,
  });
  const undecided = result.players.filter((p) => p.outcome === null).length;
  const blockers = [
    ...(undecided > 0 || result.champion === null
      ? [
          undecided === 1
            ? "Ein Ausgang steht noch nicht fest"
            : undecided > 1
              ? `${undecided} Ausgänge stehen noch nicht fest`
              : "Der Meister steht noch nicht fest",
        ]
      : []),
    ...(open.disputes > 0
      ? [
          open.disputes === 1
            ? "1 Ergebnis ist angefochten"
            : `${open.disputes} Ergebnisse sind angefochten`,
        ]
      : []),
    ...(open.withheld > 0
      ? [
          open.withheld === 1
            ? "1 Ergebnis wird noch zurückgehalten"
            : `${open.withheld} Ergebnisse werden noch zurückgehalten`,
        ]
      : []),
  ];
  return { result, blockers, completed };
}

// The tiebreaker, Relegation and playoff matches with both players set, in
// the shape the recordings workspace lists matches in.
export async function settledLateMatches(windowId: string): Promise<
  {
    matchId: string;
    round: number;
    tier: number;
    groupName: string;
    playerA: Identity;
    playerB: Identity;
    outcome: "normal" | "free_win" | "double_loss" | null;
    confirmedAt: Date | null;
    endsOn: string | null;
  }[]
> {
  if (!(await regularSeasonClosed(windowId))) {
    return [];
  }
  const [state, tiebreakers, matchdays] = await Promise.all([
    relegationPlayoffsResolved(windowId),
    tiebreakerRows(windowId),
    allMatchdaysForWindow(windowId),
  ]);
  if (!state) {
    return [];
  }
  const identityOf = (userId: string): Identity =>
    state.identities.get(userId) ?? {
      userId,
      name: PLAYER_NAME_FALLBACK,
      avatarUrl: null,
    };
  const endsOn = (round: number) =>
    matchdays.find((day) => day.round === round)?.endsOn ?? null;
  const totalRounds = Math.max(
    0,
    ...state.resolved.filter((m) => m.stage === "playoff").map((m) => m.week),
  );
  const tables = [...state.tablesByTier.values()].flat();
  const rows = [
    ...tiebreakers.map((t) => {
      const table = tables.find((x) =>
        x.ties.some((tie) => tie.key === t.tieKey),
      );
      return {
        matchId: t.matchId,
        round: state.firstRound,
        tier: table?.tier ?? 0,
        groupName: matchStageTitle({
          stage: "tiebreaker",
          tier: table?.tier ?? 0,
          groupPosition: table?.groupPosition ?? null,
        }),
        a: t.playerAId,
        b: t.playerBId,
        outcome: t.outcome,
        confirmedAt: t.confirmedAt,
      };
    }),
    ...state.resolved.flatMap((match) =>
      match.a.kind === "player" && match.b.kind === "player"
        ? [
            {
              matchId: match.matchId,
              round: state.firstRound + match.week - 1,
              tier: match.tier,
              groupName: matchStageTitle({
                stage: match.stage,
                tier: match.tier,
                groupPosition: null,
                playoffRound: match.week,
                playoffRounds: totalRounds,
              }),
              a: match.a.userId,
              b: match.b.userId,
              outcome: null as "normal" | "free_win" | "double_loss" | null,
              confirmedAt: null as Date | null,
            },
          ]
        : [],
    ),
  ];
  const results = await resultsWithGames(rows.map((row) => row.matchId));
  return rows.map((row) => {
    const result = results.get(row.matchId);
    return {
      matchId: row.matchId,
      round: row.round,
      tier: row.tier,
      groupName: row.groupName,
      playerA: identityOf(row.a),
      playerB: identityOf(row.b),
      outcome: result?.outcome ?? row.outcome,
      confirmedAt: result?.confirmedAt ?? row.confirmedAt,
      endsOn: endsOn(row.round),
    };
  });
}
