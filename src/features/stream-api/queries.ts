import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  divisions,
  matches,
  matchGames,
  matchResults,
  motwSelections,
  profiles,
  recordingHolds,
  subDivisions,
  teamSheets,
} from "@/db/schema";
import { motwForWindow, windowPlayerForm } from "@/features/motw/queries";
import { holdsForWindow } from "@/features/recordings/queries";
import { tieKeyGroup } from "@/features/schedule/stage-title";
import { matchdaysForWindow } from "@/features/season/queries";
import { publicEmbargoedIds } from "@/features/spoilers/embargo";
import { db } from "@/lib/db";
import {
  type MatchInput,
  NO_RECORD,
  recordAfterSeason,
  type StreamMatch,
  type StreamMatchDetail,
  type StreamRecord,
  streamNaming,
  toStreamMatch,
  toStreamMatchDetail,
} from "./to-stream-match";

// Read side of the stream API: the played matches of a season with everything
// the mapping needs. Two or three queries per call (matches, games, sheets)
// instead of one per match; a season has a few hundred matches at most.

async function matchInputs(
  windowId: string,
  matchId?: string,
): Promise<MatchInput[]> {
  const pa = alias(profiles, "pa");
  const pb = alias(profiles, "pb");
  const rows = await db
    .select({
      id: matches.id,
      round: matches.round,
      stage: matches.stage,
      groupTier: divisions.tier,
      matchTier: matches.tier,
      position: subDivisions.position,
      tieKey: matches.tieKey,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      // Flat, not nested: drizzle nullifies a nested object from a left
      // join by its own heuristic, which drops a profile with only a
      // username set.
      aName: pa.displayName,
      aUser: pa.username,
      aPhoto: pa.streamPhotoPath,
      bName: pb.displayName,
      bUser: pb.username,
      bPhoto: pb.streamPhotoPath,
      platform: matchResults.platform,
      reportedAt: matchResults.reportedAt,
      motwId: motwSelections.id,
      heldId: recordingHolds.matchId,
    })
    .from(matches)
    // Only regular matches have a group; tiebreaker, Relegation and playoff
    // matches carry their division themselves
    // (docs/plans/relegation-and-playoffs.md).
    .leftJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .leftJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .innerJoin(matchResults, eq(matchResults.matchId, matches.id))
    .leftJoin(pa, eq(pa.userId, matches.playerAId))
    .leftJoin(pb, eq(pb.userId, matches.playerBId))
    .leftJoin(motwSelections, eq(motwSelections.matchId, matches.id))
    .leftJoin(recordingHolds, eq(recordingHolds.matchId, matches.id))
    .where(
      and(
        eq(matches.windowId, windowId),
        eq(matchResults.outcome, "normal"),
        isNotNull(matches.playerAId),
        isNotNull(matches.playerBId),
        matchId ? eq(matches.id, matchId) : undefined,
      ),
    )
    .orderBy(
      asc(matches.round),
      asc(matches.stage),
      asc(sql`coalesce(${divisions.tier}, ${matches.tier})`),
      asc(subDivisions.position),
      asc(matches.position),
      asc(matches.createdAt),
    );
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [games, sheets, shape] = await Promise.all([
    db
      .select({
        matchId: matchGames.matchId,
        gameNumber: matchGames.gameNumber,
        winnerId: matchGames.winnerId,
      })
      .from(matchGames)
      .where(inArray(matchGames.matchId, ids)),
    db
      .select({
        matchId: teamSheets.matchId,
        playerId: teamSheets.playerId,
        ots: teamSheets.ots,
      })
      .from(teamSheets)
      .where(inArray(teamSheets.matchId, ids)),
    seasonShape(windowId),
  ]);

  return rows.flatMap((row) => {
    if (row.playerAId === null || row.playerBId === null) {
      return [];
    }
    const tier = row.groupTier ?? row.matchTier ?? 0;
    // A tiebreaker names the table it decides: a group, or the division.
    const tieGroup =
      row.stage === "tiebreaker" && row.tieKey
        ? (shape.groups.get(tieKeyGroup(row.tieKey) ?? "") ?? null)
        : null;
    const naming = streamNaming({
      stage: row.stage,
      round: row.round,
      tier,
      groupPosition:
        row.stage === "regular"
          ? (row.position ?? 0)
          : (tieGroup?.position ?? null),
      regularRounds: shape.regularRounds,
      playoffRounds: shape.playoffRounds,
    });
    return [
      {
        id: row.id,
        round: row.round,
        stage: row.stage,
        ...naming,
        tier,
        playerAId: row.playerAId,
        playerBId: row.playerBId,
        playerA: {
          displayName: row.aName,
          username: row.aUser,
          streamPhotoPath: row.aPhoto,
        },
        playerB: {
          displayName: row.bName,
          username: row.bUser,
          streamPhotoPath: row.bPhoto,
        },
        platform: row.platform,
        reportedAt: row.reportedAt,
        motw: row.motwId !== null,
        recording: row.heldId !== null,
        games: games
          .filter((g) => g.matchId === row.id)
          .map(({ gameNumber, winnerId }) => ({ gameNumber, winnerId })),
        sheets: sheets
          .filter((s) => s.matchId === row.id)
          .map(({ playerId, ots }) => ({ playerId, ots })),
      },
    ];
  });
}

// What naming a match needs from its season: how many Spieltage there are,
// the Playoffs' rounds, and every group's position by id.
async function seasonShape(windowId: string): Promise<{
  regularRounds: number;
  playoffRounds: number[];
  groups: Map<string, { position: number }>;
}> {
  const [regular, playoff, groups] = await Promise.all([
    matchdaysForWindow(windowId),
    db
      .selectDistinct({ round: matches.round })
      .from(matches)
      .where(and(eq(matches.windowId, windowId), eq(matches.stage, "playoff")))
      .orderBy(asc(matches.round)),
    db
      .select({ id: subDivisions.id, position: subDivisions.position })
      .from(subDivisions)
      .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
      .where(eq(divisions.windowId, windowId)),
  ]);
  return {
    regularRounds: regular.length,
    playoffRounds: playoff.map((row) => row.round),
    groups: new Map(groups.map((g) => [g.id, { position: g.position }])),
  };
}

/** Every played best-of-3 of the season with both team sheets, in schedule order. */
export async function listStreamMatches(
  windowId: string,
): Promise<StreamMatch[]> {
  const inputs = await matchInputs(windowId);
  return inputs.flatMap((input) => toStreamMatch(input) ?? []);
}

/**
 * One played match of the season with sheets, photos and both players' season
 * record; null otherwise.
 *
 * The record is what each player brings **into** this match: the tally without
 * this match, and without every other result still under embargo. An overlay
 * reveals a match game by game, so a record that already counted it would give
 * the outcome away before the first game is shown — and a record counting the
 * week's other withheld matches would give those away to the same audience.
 * The match's own outcome is in `games`, so the stream adds it once it has
 * played the match out (docs/plans/stream-api.md).
 *
 * The result itself is delivered in full: the stream API carries no embargo,
 * the caller is the broadcast that shows the match, and the hold is flagged as
 * `recording` for it to act on.
 */
export async function getStreamMatch(
  windowId: string,
  matchId: string,
): Promise<StreamMatchDetail | null> {
  const [motwSelections, holds] = await Promise.all([
    motwForWindow(windowId),
    holdsForWindow(windowId),
  ]);
  const excluded = publicEmbargoedIds({ motw: motwSelections, holds });
  excluded.add(matchId);
  const [inputs, form] = await Promise.all([
    matchInputs(windowId, matchId),
    windowPlayerForm(windowId, excluded),
  ]);
  const [input] = inputs;
  if (!input) {
    return null;
  }
  // A player without a standings row has not been placed in this season.
  const regularOf = (userId: string): StreamRecord => {
    const row = form.get(userId);
    return row ? { wins: row.wins, losses: row.losses } : NO_RECORD;
  };
  // After the regular season the record runs on: every tiebreaker,
  // Relegation and playoff match the player finished before this one counts
  // too (docs/plans/relegation-and-playoffs.md).
  const earlier = input.stage === "regular" ? [] : await laterResults(windowId);
  const recordOf = (userId: string): StreamRecord =>
    input.stage === "regular"
      ? regularOf(userId)
      : recordAfterSeason({
          userId,
          regular: regularOf(userId),
          earlier,
          beforeRound: input.round,
          excluded,
        });
  return toStreamMatchDetail(input, {
    a: recordOf(input.playerAId),
    b: recordOf(input.playerBId),
  });
}

// The season's tiebreaker, Relegation and playoff matches with a counted
// result: played, a confirmed free win, or a double loss.
async function laterResults(windowId: string) {
  const rows = await db
    .select({
      matchId: matches.id,
      round: matches.round,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
      outcome: matchResults.outcome,
      winnerId: matchResults.winnerId,
      confirmedAt: matchResults.confirmedAt,
    })
    .from(matches)
    .innerJoin(matchResults, eq(matchResults.matchId, matches.id))
    .where(and(eq(matches.windowId, windowId), ne(matches.stage, "regular")));
  return rows.flatMap((row) =>
    row.playerAId === null ||
    row.playerBId === null ||
    (row.outcome === "free_win" && row.confirmedAt === null)
      ? []
      : [
          {
            matchId: row.matchId,
            round: row.round,
            playerAId: row.playerAId,
            playerBId: row.playerBId,
            winnerId: row.outcome === "double_loss" ? null : row.winnerId,
          },
        ],
  );
}
