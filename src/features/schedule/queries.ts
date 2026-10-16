import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import {
  disputes,
  matchdays,
  matches,
  matchResults,
  motwSelections,
  placements,
  recordingHolds,
  registrationWindows,
  tieOrders,
} from "@/db/schema";
import { db } from "@/lib/db";

// Players placed in each sub-division of a finalized seeding, grouped and
// ordered deterministically (by user id) so round-robin generation is
// reproducible. Only grouped placements are returned (a finalized seeding has
// every player in a sub-division).
export async function subDivisionRosters(
  windowId: string,
): Promise<{ subDivisionId: string; userIds: string[] }[]> {
  const rows = await db
    .select({
      subDivisionId: placements.subDivisionId,
      userId: placements.userId,
    })
    .from(placements)
    .where(
      and(
        eq(placements.windowId, windowId),
        isNotNull(placements.subDivisionId),
      ),
    )
    .orderBy(asc(placements.subDivisionId), asc(placements.userId));

  const byGroup = new Map<string, string[]>();
  for (const row of rows) {
    const subDivisionId = row.subDivisionId as string;
    const list = byGroup.get(subDivisionId);
    if (list) {
      list.push(row.userId);
    } else {
      byGroup.set(subDivisionId, [row.userId]);
    }
  }
  return [...byGroup.entries()].map(([subDivisionId, userIds]) => ({
    subDivisionId,
    userIds,
  }));
}

// Whether a schedule has been generated for the season — its existence marks the
// regular season as running.
export async function hasSchedule(windowId: string): Promise<boolean> {
  const row = await db.query.matchdays.findFirst({
    columns: { id: true },
    where: eq(matchdays.windowId, windowId),
  });
  return row !== undefined;
}

// Stamps the window's schedule as published. The null guard makes the update
// idempotent under a double click — publication is terminal, the first
// timestamp stands.
export async function markSchedulePublished(windowId: string): Promise<void> {
  await db
    .update(registrationWindows)
    .set({ schedulePublishedAt: new Date() })
    .where(
      and(
        eq(registrationWindows.id, windowId),
        isNull(registrationWindows.schedulePublishedAt),
      ),
    );
}

// Whether the match's own season has published it: the regular schedule for
// a regular match, Relegation und Playoffs for every other kind
// (docs/plans/relegation-and-playoffs.md). Gate for the public match page
// and reporting: resolved per match (not via the latest window), so links
// into past seasons keep working while a new season's schedule is still
// hidden.
export async function matchSchedulePublished(
  matchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      stage: matches.stage,
      schedulePublishedAt: registrationWindows.schedulePublishedAt,
      regularSeasonClosedAt: registrationWindows.regularSeasonClosedAt,
    })
    .from(matches)
    .innerJoin(
      registrationWindows,
      eq(registrationWindows.id, matches.windowId),
    )
    .where(eq(matches.id, matchId));
  if (!row) {
    return false;
  }
  return row.stage === "regular"
    ? row.schedulePublishedAt !== null
    : row.regularSeasonClosedAt !== null;
}

// Persists the Spieltag calendar + all matches in one transaction. Generation is
// one-shot (the action gate rejects a second run), so there is nothing to
// replace — a plain insert.
export async function persistSchedule(
  windowId: string,
  windows: readonly { start: string; end: string }[],
  matchRows: readonly {
    subDivisionId: string;
    round: number;
    playerAId: string;
    playerBId: string | null;
  }[],
) {
  await db.transaction(async (tx) => {
    if (windows.length > 0) {
      await tx.insert(matchdays).values(
        windows.map((window, i) => ({
          windowId,
          round: i + 1,
          startsOn: window.start,
          endsOn: window.end,
        })),
      );
    }
    if (matchRows.length > 0) {
      await tx
        .insert(matches)
        .values(matchRows.map((row) => ({ ...row, windowId })));
    }
  });
}

// Whether the season's Relegation und Playoffs schedule exists: its weeks
// are the matchdays that are not regular.
export async function hasRelegationPlayoffsSchedule(
  windowId: string,
): Promise<boolean> {
  const row = await db.query.matchdays.findFirst({
    columns: { id: true },
    where: and(eq(matchdays.windowId, windowId), eq(matchdays.regular, false)),
  });
  return row !== undefined;
}

// Persists the weeks after the regular season and the Relegation and playoff
// matches in them, players still unknown (docs/plans/relegation-and-playoffs.md).
// One transaction; the action gate makes it one-shot, the unique place index
// backs that up.
export async function persistRelegationPlayoffsSchedule(input: {
  windowId: string;
  firstRound: number;
  windows: readonly { start: string; end: string }[];
  matchRows: readonly {
    stage: "relegation" | "playoff";
    tier: number;
    position: number;
    week: number;
  }[];
}): Promise<void> {
  const { windowId, firstRound } = input;
  await db.transaction(async (tx) => {
    await tx.insert(matchdays).values(
      input.windows.map((window, i) => ({
        windowId,
        round: firstRound + i,
        startsOn: window.start,
        endsOn: window.end,
        regular: false,
      })),
    );
    if (input.matchRows.length > 0) {
      await tx.insert(matches).values(
        input.matchRows.map((row) => ({
          windowId,
          stage: row.stage,
          tier: row.tier,
          position: row.position,
          round: firstRound + row.week - 1,
        })),
      );
    }
  });
}

// The season's Relegation and playoff matches with their place and any
// stored players.
export async function relegationPlayoffsMatchRows(windowId: string): Promise<
  {
    matchId: string;
    stage: "relegation" | "playoff";
    tier: number;
    position: number;
    round: number;
    playerAId: string | null;
    playerBId: string | null;
    result: {
      outcome: "normal" | "free_win" | "double_loss";
      winnerId: string | null;
      confirmedAt: Date | null;
    } | null;
  }[]
> {
  const rows = await db
    .select({
      matchId: matches.id,
      stage: matches.stage,
      tier: matches.tier,
      position: matches.position,
      round: matches.round,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
    })
    .from(matches)
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(
      and(
        eq(matches.windowId, windowId),
        inArray(matches.stage, ["relegation", "playoff"]),
      ),
    )
    .orderBy(
      asc(matches.round),
      asc(matches.stage),
      asc(matches.tier),
      asc(matches.position),
    );
  // Relegation and playoff matches always carry their place
  // (`matches_placed_shape`).
  return rows.map(({ outcome, winnerId, confirmedAt, ...row }) => ({
    ...row,
    stage: row.stage as "relegation" | "playoff",
    tier: row.tier ?? 0,
    position: row.position ?? 0,
    result: outcome ? { outcome, winnerId, confirmedAt } : null,
  }));
}

// Whether the season's regular results are final: Relegation und Playoffs
// are published (docs/plans/relegation-and-playoffs.md).
export async function regularSeasonClosed(windowId: string): Promise<boolean> {
  const row = await db.query.registrationWindows.findFirst({
    columns: { regularSeasonClosedAt: true },
    where: eq(registrationWindows.id, windowId),
  });
  return row?.regularSeasonClosedAt != null;
}

// Why a match's result can no longer change, or null while it can: a
// regular match once the regular season is closed, every match once the
// season is completed. The same rule as the database trigger
// `reject_closed_regular_write`, read up front so the actions can say so.
export async function resultLockError(matchId: string): Promise<string | null> {
  const [row] = await db
    .select({
      stage: matches.stage,
      closedAt: registrationWindows.regularSeasonClosedAt,
      completedAt: registrationWindows.seasonCompletedAt,
    })
    .from(matches)
    .innerJoin(
      registrationWindows,
      eq(registrationWindows.id, matches.windowId),
    )
    .where(eq(matches.id, matchId));
  if (!row) {
    return null;
  }
  if (row.completedAt !== null) {
    return SEASON_COMPLETED_ERROR;
  }
  return row.stage === "regular" && row.closedAt !== null
    ? REGULAR_SEASON_CLOSED_ERROR
    : null;
}

export const SEASON_COMPLETED_ERROR =
  "Die Saison ist abgeschlossen. Ihre Ergebnisse sind endgültig.";

// What the hub shows when a locked action is refused.
export const REGULAR_SEASON_CLOSED_ERROR =
  "Die reguläre Saison ist abgeschlossen. Ihre Ergebnisse sind endgültig.";

// The season's tiebreakers with the result that counts for them.
export async function tiebreakerRows(windowId: string): Promise<
  {
    matchId: string;
    tieKey: string;
    playerAId: string;
    playerBId: string;
    outcome: "normal" | "free_win" | "double_loss" | null;
    winnerId: string | null;
    confirmedAt: Date | null;
  }[]
> {
  const rows = await db
    .select({
      matchId: matches.id,
      tieKey: matches.tieKey,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
    })
    .from(matches)
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(
      and(eq(matches.windowId, windowId), eq(matches.stage, "tiebreaker")),
    );
  // A tiebreaker always has its key and both players.
  return rows.map((row) => ({
    ...row,
    tieKey: row.tieKey ?? "",
    playerAId: row.playerAId ?? "",
    playerBId: row.playerBId ?? "",
  }));
}

export async function tieOrdersFor(
  windowId: string,
): Promise<{ tieKey: string; order: string[]; reason: string }[]> {
  return db
    .select({
      tieKey: tieOrders.tieKey,
      order: tieOrders.order,
      reason: tieOrders.reason,
    })
    .from(tieOrders)
    .where(eq(tieOrders.windowId, windowId));
}

export async function saveTieOrder(input: {
  windowId: string;
  tieKey: string;
  order: string[];
  reason: string;
  staffId: string;
}): Promise<void> {
  await db
    .insert(tieOrders)
    .values({
      windowId: input.windowId,
      tieKey: input.tieKey,
      order: input.order,
      reason: input.reason,
      decidedById: input.staffId,
    })
    .onConflictDoUpdate({
      target: [tieOrders.windowId, tieOrders.tieKey],
      set: {
        order: input.order,
        reason: input.reason,
        decidedById: input.staffId,
        decidedAt: new Date(),
      },
    });
}

// Publishing in one transaction: the regular season closes, the tiebreakers
// are created, the known seats are written. The closed timestamp's null
// guard makes a double click a no-op; returns whether this call published.
export async function persistPublication(input: {
  windowId: string;
  round: number;
  tiebreakers: readonly {
    tieKey: string;
    tier: number;
    position: number;
    playerAId: string;
    playerBId: string;
  }[];
  seats: readonly {
    matchId: string;
    playerAId: string | null | undefined;
    playerBId: string | null | undefined;
  }[];
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const closed = await tx
      .update(registrationWindows)
      .set({ regularSeasonClosedAt: new Date() })
      .where(
        and(
          eq(registrationWindows.id, input.windowId),
          isNull(registrationWindows.regularSeasonClosedAt),
        ),
      )
      .returning({ id: registrationWindows.id });
    if (closed.length === 0) {
      return false;
    }
    if (input.tiebreakers.length > 0) {
      await tx.insert(matches).values(
        input.tiebreakers.map((tie) => ({
          windowId: input.windowId,
          stage: "tiebreaker" as const,
          tier: tie.tier,
          position: tie.position,
          tieKey: tie.tieKey,
          round: input.round,
          playerAId: tie.playerAId,
          playerBId: tie.playerBId,
        })),
      );
    }
    await writeSeats(tx, input.seats);
    return true;
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Writes the seat players of Relegation and playoff matches that have no
// result yet; a match with a result keeps the players it was played by.
// `undefined` leaves a side alone (it comes from an earlier match).
async function writeSeats(
  tx: Tx | typeof db,
  seats: readonly {
    matchId: string;
    playerAId: string | null | undefined;
    playerBId: string | null | undefined;
  }[],
): Promise<void> {
  for (const seat of seats) {
    const set: { playerAId?: string | null; playerBId?: string | null } = {};
    if (seat.playerAId !== undefined) set.playerAId = seat.playerAId;
    if (seat.playerBId !== undefined) set.playerBId = seat.playerBId;
    if (Object.keys(set).length === 0) continue;
    await tx
      .update(matches)
      .set(set)
      .where(
        and(
          eq(matches.id, seat.matchId),
          inArray(matches.stage, ["relegation", "playoff"]),
          sql`not exists (select 1 from ${matchResults} where ${matchResults.matchId} = ${matches.id})`,
        ),
      );
  }
}

export async function updateSeats(
  seats: Parameters<typeof writeSeats>[1],
): Promise<void> {
  await writeSeats(db, seats);
}

// Whether any of the players has a Relegation or playoff match with a result
// in the season (only rounds after `afterRound`, when given): then a
// decision that seats them can no longer change.
export async function tiedPlayersHavePlayed(
  windowId: string,
  userIds: readonly string[],
  options: { afterRound?: number } = {},
): Promise<boolean> {
  if (userIds.length === 0) {
    return false;
  }
  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(
      and(
        eq(matches.windowId, windowId),
        inArray(matches.stage, ["relegation", "playoff"]),
        options.afterRound === undefined
          ? undefined
          : sql`${matches.round} > ${options.afterRound}`,
        or(
          inArray(matches.playerAId, [...userIds]),
          inArray(matches.playerBId, [...userIds]),
        ),
      ),
    )
    .limit(1);
  return row !== undefined;
}

// Whether the season is completed (docs/plans/relegation-and-playoffs.md).
export async function seasonCompleted(windowId: string): Promise<boolean> {
  const row = await db.query.registrationWindows.findFirst({
    columns: { seasonCompletedAt: true },
    where: eq(registrationWindows.id, windowId),
  });
  return row?.seasonCompletedAt != null;
}

// What still keeps a published season from completing, among its
// tiebreaker, Relegation and playoff matches: open disputes and results
// withheld from the public (a recording hold, a Match of the Week without
// its VOD).
export async function lateMatchOpenPoints(
  windowId: string,
): Promise<{ disputes: number; withheld: number }> {
  const [disputeRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(disputes)
    .innerJoin(matches, eq(matches.id, disputes.matchId))
    .where(
      and(
        eq(matches.windowId, windowId),
        ne(matches.stage, "regular"),
        eq(disputes.status, "open"),
      ),
    );
  const [holdRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recordingHolds)
    .innerJoin(matches, eq(matches.id, recordingHolds.matchId))
    .where(and(eq(matches.windowId, windowId), ne(matches.stage, "regular")));
  const [motwRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motwSelections)
    .innerJoin(matches, eq(matches.id, motwSelections.matchId))
    .where(
      and(
        eq(matches.windowId, windowId),
        ne(matches.stage, "regular"),
        isNull(motwSelections.youtubeUrl),
      ),
    );
  return {
    disputes: disputeRow?.count ?? 0,
    withheld: (holdRow?.count ?? 0) + (motwRow?.count ?? 0),
  };
}

// Completing the season: every player's outcome onto their placement, the
// champion flagged, the season stamped. One transaction; a second call is a
// no-op and returns false.
export async function persistSeasonCompletion(input: {
  windowId: string;
  outcomes: readonly {
    userId: string;
    outcome: "promoted" | "stays" | "demoted";
  }[];
  championId: string | null;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const done = await tx
      .update(registrationWindows)
      .set({ seasonCompletedAt: new Date() })
      .where(
        and(
          eq(registrationWindows.id, input.windowId),
          isNull(registrationWindows.seasonCompletedAt),
        ),
      )
      .returning({ id: registrationWindows.id });
    if (done.length === 0) {
      return false;
    }
    for (const player of input.outcomes) {
      await tx
        .update(placements)
        .set({
          seasonOutcome: player.outcome,
          champion: player.userId === input.championId,
        })
        .where(
          and(
            eq(placements.windowId, input.windowId),
            eq(placements.userId, player.userId),
          ),
        );
    }
    return true;
  });
}

// Which of Relegation and Playoffs a published season has: what the Liga row
// offers. Null before publishing.
export async function publishedStages(
  windowId: string,
): Promise<{ playoffs: boolean; relegation: boolean } | null> {
  if (!(await regularSeasonClosed(windowId))) {
    return null;
  }
  const rows = await db
    .selectDistinct({ stage: matches.stage })
    .from(matches)
    .where(
      and(
        eq(matches.windowId, windowId),
        inArray(matches.stage, ["relegation", "playoff"]),
      ),
    );
  const stages = new Set(rows.map((row) => row.stage));
  return {
    playoffs: stages.has("playoff"),
    relegation: stages.has("relegation"),
  };
}
