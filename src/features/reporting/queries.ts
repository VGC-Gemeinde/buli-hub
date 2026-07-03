import { asc, eq, inArray } from "drizzle-orm";
import { matches, matchGames, matchResults, profiles } from "@/db/schema";
import type { Identity } from "@/features/season/dashboard";
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

// The pairing + both players' identities for the report screen (playerB null =
// bye, unreportable). Null when the match does not exist.
export async function getMatchForReport(matchId: string): Promise<{
  matchId: string;
  round: number;
  subDivisionId: string;
  playerA: Identity;
  playerB: Identity | null;
} | null> {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) {
    return null;
  }
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
    playerA: identity(match.playerAId),
    playerB: match.playerBId ? identity(match.playerBId) : null,
  };
}

export type StoredResult = ResultRow & {
  reportedById: string;
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
