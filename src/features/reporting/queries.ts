import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  disputes,
  divisions,
  matchdays,
  matches,
  matchGames,
  matchResults,
  profiles,
  subDivisions,
} from "@/db/schema";
import type { Identity } from "@/features/season/dashboard";
import { subDivisionName } from "@/features/seeding/seeding";
import { db } from "@/lib/db";
import type { GameRow, MatchOutcome, ResultRow } from "./report";
import type { ResultForStandings } from "./standings";

function toIdentity(row: {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}): Identity {
  return {
    userId: row.userId,
    name: row.displayName ?? row.username ?? "Unbekannt",
    avatarUrl: row.avatarUrl ?? null,
  };
}

// The pairing + both players' identities plus the group name and matchday
// deadline for the report screen header (playerB null = bye, unreportable).
// Null when the match does not exist.
export async function getMatchForReport(matchId: string): Promise<{
  matchId: string;
  round: number;
  subDivisionId: string;
  groupName: string;
  deadline: string | null;
  playerA: Identity;
  playerB: Identity | null;
} | null> {
  const [match] = await db
    .select({
      id: matches.id,
      round: matches.round,
      subDivisionId: matches.subDivisionId,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      tier: divisions.tier,
      position: subDivisions.position,
      windowId: divisions.windowId,
    })
    .from(matches)
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) {
    return null;
  }

  const [matchday] = await db
    .select({ endsOn: matchdays.endsOn })
    .from(matchdays)
    .where(
      and(
        eq(matchdays.windowId, match.windowId),
        eq(matchdays.round, match.round),
      ),
    )
    .limit(1);

  const ids = [match.playerAId, match.playerBId].filter(
    (id): id is string => id !== null,
  );
  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(inArray(profiles.userId, ids));
  const identity = (id: string): Identity => {
    const row = rows.find((r) => r.userId === id);
    return row
      ? toIdentity(row)
      : { userId: id, name: "Unbekannt", avatarUrl: null };
  };
  return {
    matchId: match.id,
    round: match.round,
    subDivisionId: match.subDivisionId,
    groupName: subDivisionName(match.tier, match.position),
    deadline: matchday?.endsOn ?? null,
    playerA: identity(match.playerAId),
    playerB: match.playerBId ? identity(match.playerBId) : null,
  };
}

export type StoredResult = ResultRow & {
  reportedById: string;
  reportedAt: Date;
  confirmedAt: Date | null;
  games: GameRow[];
};

// The recorded result for a match (with its games), or null if unreported.
export async function getMatchResult(
  matchId: string,
): Promise<StoredResult | null> {
  const result = await db.query.matchResults.findFirst({
    where: eq(matchResults.matchId, matchId),
  });
  if (!result) {
    return null;
  }
  const games = await db
    .select({
      gameNumber: matchGames.gameNumber,
      winnerId: matchGames.winnerId,
      replayUrl: matchGames.replayUrl,
    })
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameNumber));
  return {
    outcome: result.outcome,
    winnerId: result.winnerId,
    platform: result.platform,
    playerATeamUrl: result.playerATeamUrl,
    playerBTeamUrl: result.playerBTeamUrl,
    videoUrl: result.videoUrl,
    freeWinReason: result.freeWinReason,
    discussedWithId: result.discussedWithId,
    reportedById: result.reportedById,
    reportedAt: result.reportedAt,
    confirmedAt: result.confirmedAt,
    games,
  };
}

// Persists a result and its games in one transaction. The caller guarantees the
// match is not already reported (the action gate).
export async function saveResult(
  matchId: string,
  result: ResultRow,
  games: GameRow[],
  reportedById: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(matchResults).values({ matchId, reportedById, ...result });
    if (games.length > 0) {
      await tx
        .insert(matchGames)
        .values(games.map((game) => ({ matchId, ...game })));
    }
  });
}

// Every match of a sub-division with its result state — the input for
// `computeStandings`.
export async function groupResults(
  subDivisionId: string,
): Promise<ResultForStandings[]> {
  const rows = await db
    .select({
      matchId: matches.id,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
      gameWinnerId: matchGames.winnerId,
    })
    .from(matches)
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .leftJoin(matchGames, eq(matchGames.matchId, matches.id))
    .where(eq(matches.subDivisionId, subDivisionId))
    .orderBy(asc(matchGames.gameNumber));

  const byMatch = new Map<string, ResultForStandings>();
  for (const row of rows) {
    let entry = byMatch.get(row.matchId);
    if (!entry) {
      entry = {
        playerAId: row.playerAId,
        playerBId: row.playerBId,
        outcome: row.outcome as MatchOutcome | null,
        winnerId: row.winnerId,
        confirmedAt: row.confirmedAt,
        games: [],
      };
      byMatch.set(row.matchId, entry);
    }
    if (row.gameWinnerId) {
      (entry.games as { winnerId: string }[]).push({
        winnerId: row.gameWinnerId,
      });
    }
  }
  return [...byMatch.values()];
}

// A match's result state keyed for the dashboard schedule (per player match).
export type MatchResultLite = {
  matchId: string;
  outcome: MatchOutcome;
  winnerId: string | null;
  confirmedAt: Date | null;
  disputed: boolean;
  games: { winnerId: string }[];
};

// Result state for every reported match in a sub-division, keyed by matchId —
// feeds the schedule's result chips / scores on the dashboard.
export async function subDivisionResults(
  subDivisionId: string,
): Promise<Map<string, MatchResultLite>> {
  const rows = await db
    .select({
      matchId: matchResults.matchId,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
      disputeId: disputes.id,
      gameWinnerId: matchGames.winnerId,
      gameNumber: matchGames.gameNumber,
    })
    .from(matchResults)
    .innerJoin(matches, eq(matches.id, matchResults.matchId))
    .leftJoin(
      disputes,
      and(
        eq(disputes.matchId, matchResults.matchId),
        eq(disputes.status, "open"),
      ),
    )
    .leftJoin(matchGames, eq(matchGames.matchId, matchResults.matchId))
    .where(eq(matches.subDivisionId, subDivisionId))
    .orderBy(asc(matchGames.gameNumber));

  const byMatch = new Map<string, MatchResultLite>();
  for (const row of rows) {
    let entry = byMatch.get(row.matchId);
    if (!entry) {
      entry = {
        matchId: row.matchId,
        outcome: row.outcome,
        winnerId: row.winnerId,
        confirmedAt: row.confirmedAt,
        disputed: row.disputeId !== null,
        games: [],
      };
      byMatch.set(row.matchId, entry);
    }
    if (row.gameWinnerId) {
      entry.games.push({ winnerId: row.gameWinnerId });
    }
  }
  return byMatch;
}

// All staff + admin users (never dev) as identities — the „discussed with"
// dropdown for a free-win report.
export async function listStaffAndAdmins(): Promise<Identity[]> {
  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(inArray(profiles.role, ["staff", "admin"]))
    .orderBy(asc(profiles.displayName));
  return rows.map(toIdentity);
}

// Whether a user is a participant of a match — the report authorization check.
export async function isParticipant(
  matchId: string,
  userId: string,
): Promise<boolean> {
  const row = await db.query.matches.findFirst({
    columns: { playerAId: true, playerBId: true },
    where: eq(matches.id, matchId),
  });
  return (
    row !== undefined && (row.playerAId === userId || row.playerBId === userId)
  );
}

// A match for the staff running-season dashboard: identity + schedule + result
// state, across every group of a window. Byes are excluded (nothing to chase).
export type StaffMatchRow = {
  matchId: string;
  round: number;
  groupName: string;
  endsOn: string | null;
  playerA: Identity;
  playerB: Identity;
  outcome: MatchOutcome | null;
  winnerId: string | null;
  confirmedAt: Date | null;
  // Free-win context for the confirm list.
  freeWinReason: string | null;
  reporterName: string | null;
  reportedAt: Date | null;
  // The open dispute on this match, if any.
  dispute: {
    reason: string;
    openedByName: string | null;
    openedAt: Date;
  } | null;
};

export async function windowMatchOverview(
  windowId: string,
): Promise<StaffMatchRow[]> {
  const pa = alias(profiles, "pa");
  const pb = alias(profiles, "pb");
  const pr = alias(profiles, "pr");
  const dp = alias(profiles, "dp");
  const rows = await db
    .select({
      matchId: matches.id,
      round: matches.round,
      tier: divisions.tier,
      position: subDivisions.position,
      endsOn: matchdays.endsOn,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      aName: pa.displayName,
      aUser: pa.username,
      aAvatar: pa.avatarUrl,
      bName: pb.displayName,
      bUser: pb.username,
      bAvatar: pb.avatarUrl,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
      freeWinReason: matchResults.freeWinReason,
      reportedAt: matchResults.reportedAt,
      rpName: pr.displayName,
      rpUser: pr.username,
      disputeReason: disputes.reason,
      disputeOpenedAt: disputes.openedAt,
      dpName: dp.displayName,
      dpUser: dp.username,
    })
    .from(matches)
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .leftJoin(
      matchdays,
      and(
        eq(matchdays.windowId, divisions.windowId),
        eq(matchdays.round, matches.round),
      ),
    )
    .leftJoin(pa, eq(pa.userId, matches.playerAId))
    .leftJoin(pb, eq(pb.userId, matches.playerBId))
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .leftJoin(pr, eq(pr.userId, matchResults.reportedById))
    .leftJoin(
      disputes,
      and(eq(disputes.matchId, matches.id), eq(disputes.status, "open")),
    )
    .leftJoin(dp, eq(dp.userId, disputes.openedById))
    .where(and(eq(divisions.windowId, windowId), isNotNull(matches.playerBId)))
    .orderBy(
      asc(divisions.tier),
      asc(subDivisions.position),
      asc(matches.round),
    );

  return rows.map((row) => ({
    matchId: row.matchId,
    round: row.round,
    groupName: subDivisionName(row.tier, row.position),
    endsOn: row.endsOn,
    playerA: toIdentity({
      userId: row.playerAId,
      displayName: row.aName,
      username: row.aUser,
      avatarUrl: row.aAvatar,
    }),
    playerB: toIdentity({
      userId: row.playerBId as string,
      displayName: row.bName,
      username: row.bUser,
      avatarUrl: row.bAvatar,
    }),
    outcome: row.outcome,
    winnerId: row.winnerId,
    confirmedAt: row.confirmedAt,
    freeWinReason: row.freeWinReason,
    reporterName: row.rpName ?? row.rpUser,
    reportedAt: row.reportedAt,
    dispute: row.disputeReason
      ? {
          reason: row.disputeReason,
          openedByName: row.dpName ?? row.dpUser,
          openedAt: row.disputeOpenedAt as Date,
        }
      : null,
  }));
}

// Confirms a pending free win — it then counts for standings.
export async function confirmFreeWin(
  matchId: string,
  staffId: string,
): Promise<void> {
  await db
    .update(matchResults)
    .set({
      confirmedById: staffId,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(matchResults.matchId, matchId),
        eq(matchResults.outcome, "free_win"),
      ),
    );
}

// Staff award/correction: writes a free-win or double-loss result (no games),
// recording `corrected_by` when a result already existed. Free wins awarded by
// staff are confirmed immediately.
export async function upsertStaffResult(input: {
  matchId: string;
  outcome: "free_win" | "double_loss";
  winnerId: string | null;
  freeWinReason: string | null;
  staffId: string;
}): Promise<void> {
  const now = new Date();
  const confirmed = input.outcome === "free_win";
  await db.transaction(async (tx) => {
    await tx.delete(matchGames).where(eq(matchGames.matchId, input.matchId));
    await tx
      .insert(matchResults)
      .values({
        matchId: input.matchId,
        outcome: input.outcome,
        winnerId: input.winnerId,
        platform: null,
        playerATeamUrl: null,
        playerBTeamUrl: null,
        videoUrl: null,
        freeWinReason: input.freeWinReason,
        discussedWithId: null,
        reportedById: input.staffId,
        confirmedById: confirmed ? input.staffId : null,
        confirmedAt: confirmed ? now : null,
      })
      .onConflictDoUpdate({
        target: matchResults.matchId,
        set: {
          outcome: input.outcome,
          winnerId: input.winnerId,
          platform: null,
          playerATeamUrl: null,
          playerBTeamUrl: null,
          videoUrl: null,
          freeWinReason: input.freeWinReason,
          discussedWithId: null,
          confirmedById: confirmed ? input.staffId : null,
          confirmedAt: confirmed ? now : null,
          correctedById: input.staffId,
          correctedAt: now,
          updatedAt: now,
        },
      });
  });
}

// Reopens a match by clearing its result (games cascade) so it can be
// re-reported.
export async function deleteMatchResult(matchId: string): Promise<void> {
  await db.delete(matchResults).where(eq(matchResults.matchId, matchId));
}

// --- Disputes -------------------------------------------------------------

export async function openDispute(input: {
  matchId: string;
  openedById: string;
  reason: string;
}): Promise<void> {
  await db.insert(disputes).values({
    matchId: input.matchId,
    openedById: input.openedById,
    reason: input.reason,
  });
}

export async function resolveDispute(input: {
  matchId: string;
  resolution: "upheld" | "corrected";
  note: string | null;
  resolvedById: string;
}): Promise<void> {
  await db
    .update(disputes)
    .set({
      status: "resolved",
      resolution: input.resolution,
      note: input.note,
      resolvedById: input.resolvedById,
      resolvedAt: new Date(),
    })
    .where(
      and(eq(disputes.matchId, input.matchId), eq(disputes.status, "open")),
    );
}

// The open dispute on a match (for the match page), or null.
export async function matchOpenDispute(matchId: string): Promise<{
  reason: string;
  openedByName: string | null;
  openedAt: Date;
} | null> {
  const rows = await db
    .select({
      reason: disputes.reason,
      openedAt: disputes.openedAt,
      name: profiles.displayName,
      user: profiles.username,
    })
    .from(disputes)
    .leftJoin(profiles, eq(profiles.userId, disputes.openedById))
    .where(and(eq(disputes.matchId, matchId), eq(disputes.status, "open")))
    .limit(1);
  const row = rows[0];
  return row
    ? {
        reason: row.reason,
        openedByName: row.name ?? row.user,
        openedAt: row.openedAt,
      }
    : null;
}

export type DisputeRow = {
  matchId: string;
  round: number;
  groupName: string;
  playerA: Identity;
  playerB: Identity;
  reason: string;
  openedByName: string | null;
  openedAt: Date;
  resolution: "upheld" | "corrected" | null;
  resolvedAt: Date | null;
};

// Resolved disputes of a window, newest first — the „resolved" history filter.
export async function windowResolvedDisputes(
  windowId: string,
): Promise<DisputeRow[]> {
  const pa = alias(profiles, "pa");
  const pb = alias(profiles, "pb");
  const dp = alias(profiles, "dp");
  const rows = await db
    .select({
      matchId: matches.id,
      round: matches.round,
      tier: divisions.tier,
      position: subDivisions.position,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      aName: pa.displayName,
      aUser: pa.username,
      aAvatar: pa.avatarUrl,
      bName: pb.displayName,
      bUser: pb.username,
      bAvatar: pb.avatarUrl,
      reason: disputes.reason,
      openedAt: disputes.openedAt,
      dpName: dp.displayName,
      dpUser: dp.username,
      resolution: disputes.resolution,
      resolvedAt: disputes.resolvedAt,
    })
    .from(disputes)
    .innerJoin(matches, eq(matches.id, disputes.matchId))
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .leftJoin(pa, eq(pa.userId, matches.playerAId))
    .leftJoin(pb, eq(pb.userId, matches.playerBId))
    .leftJoin(dp, eq(dp.userId, disputes.openedById))
    .where(
      and(eq(divisions.windowId, windowId), eq(disputes.status, "resolved")),
    )
    .orderBy(desc(disputes.resolvedAt));

  return rows.map((row) => ({
    matchId: row.matchId,
    round: row.round,
    groupName: subDivisionName(row.tier, row.position),
    playerA: toIdentity({
      userId: row.playerAId,
      displayName: row.aName,
      username: row.aUser,
      avatarUrl: row.aAvatar,
    }),
    playerB: toIdentity({
      userId: row.playerBId as string,
      displayName: row.bName,
      username: row.bUser,
      avatarUrl: row.bAvatar,
    }),
    reason: row.reason,
    openedByName: row.dpName ?? row.dpUser,
    openedAt: row.openedAt,
    resolution: row.resolution,
    resolvedAt: row.resolvedAt,
  }));
}

// Staff full edit of an existing result: upserts the whole result + games,
// recording `corrected_by`. A free-win set here is confirmed immediately.
export async function replaceResult(input: {
  matchId: string;
  result: ResultRow;
  games: GameRow[];
  staffId: string;
}): Promise<void> {
  const now = new Date();
  const confirmed = input.result.outcome === "free_win";
  await db.transaction(async (tx) => {
    await tx.delete(matchGames).where(eq(matchGames.matchId, input.matchId));
    await tx
      .insert(matchResults)
      .values({
        matchId: input.matchId,
        ...input.result,
        reportedById: input.staffId,
        confirmedById: confirmed ? input.staffId : null,
        confirmedAt: confirmed ? now : null,
      })
      .onConflictDoUpdate({
        target: matchResults.matchId,
        set: {
          ...input.result,
          confirmedById: confirmed ? input.staffId : null,
          confirmedAt: confirmed ? now : null,
          correctedById: input.staffId,
          correctedAt: now,
          updatedAt: now,
        },
      });
    if (input.games.length > 0) {
      await tx
        .insert(matchGames)
        .values(
          input.games.map((game) => ({ matchId: input.matchId, ...game })),
        );
    }
  });
}
