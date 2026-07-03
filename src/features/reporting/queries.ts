import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
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
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
    })
    .from(matches)
    .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(eq(matches.subDivisionId, subDivisionId));
  return rows.map((row) => ({
    playerAId: row.playerAId,
    playerBId: row.playerBId,
    outcome: row.outcome as MatchOutcome | null,
    winnerId: row.winnerId,
    confirmedAt: row.confirmedAt,
  }));
}

// A match's result state keyed for the dashboard schedule (per player match).
export type MatchResultLite = {
  matchId: string;
  outcome: MatchOutcome;
  winnerId: string | null;
  confirmedAt: Date | null;
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
      gameWinnerId: matchGames.winnerId,
      gameNumber: matchGames.gameNumber,
    })
    .from(matchResults)
    .innerJoin(matches, eq(matches.id, matchResults.matchId))
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
};

export async function windowMatchOverview(
  windowId: string,
): Promise<StaffMatchRow[]> {
  const pa = alias(profiles, "pa");
  const pb = alias(profiles, "pb");
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
