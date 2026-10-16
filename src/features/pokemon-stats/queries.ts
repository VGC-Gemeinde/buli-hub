import { and, eq } from "drizzle-orm";
import {
  divisions,
  matches,
  matchResults,
  placements,
  teamSheets,
} from "@/db/schema";
import { decidedByDrop } from "@/features/drops/drops";
import { droppedIdsForWindow } from "@/features/drops/queries";
import { motwForWindow } from "@/features/motw/queries";
import { holdsForWindow } from "@/features/recordings/queries";
import { allMatchdaysForWindow } from "@/features/season/queries";
import { publicEmbargoedIds } from "@/features/spoilers/embargo";
import { db } from "@/lib/db";
import type { CountedSheet, Week } from "./filter";
import { toSlots } from "./sheets";

// Every team sheet of a season the public may count
// (specs/001-pokemon-usage-stats, research R1 to R3): all stages, minus the
// matches under public embargo (the one rule the tables use) and the matches
// that are not rated, each with its phase, week, the player's division and
// its result.
export async function countedSheets(windowId: string): Promise<CountedSheet[]> {
  const [rows, tiers, motw, holds, droppedIds] = await Promise.all([
    db
      .select({
        matchId: teamSheets.matchId,
        playerId: teamSheets.playerId,
        ots: teamSheets.ots,
        stage: matches.stage,
        round: matches.round,
        playerAId: matches.playerAId,
        playerBId: matches.playerBId,
        outcome: matchResults.outcome,
        winnerId: matchResults.winnerId,
      })
      .from(teamSheets)
      .innerJoin(matches, eq(matches.id, teamSheets.matchId))
      .innerJoin(matchResults, eq(matchResults.matchId, teamSheets.matchId))
      .where(eq(matches.windowId, windowId)),
    db
      .select({ userId: placements.userId, tier: divisions.tier })
      .from(placements)
      .innerJoin(divisions, eq(divisions.id, placements.divisionId))
      .where(eq(placements.windowId, windowId)),
    motwForWindow(windowId),
    holdsForWindow(windowId),
    droppedIdsForWindow(windowId),
  ]);

  const embargoed = publicEmbargoedIds({ motw, holds });
  const tierOf = new Map(tiers.map((row) => [row.userId, row.tier]));
  const sheets: CountedSheet[] = [];
  for (const row of rows) {
    if (embargoed.has(row.matchId)) {
      continue;
    }
    const mons = toSlots(row.ots);
    if (!mons) {
      console.warn(
        `pokemon-stats: sheet of match ${row.matchId} does not parse`,
      );
      continue;
    }
    // Only rated matches count, for usage and win rate alike, so every
    // number in a row rests on the same matches: a regular match a drop
    // decided (its result says nothing about the teams any more), and
    // anything without a winner, leaves the stats entirely.
    const droppedOut =
      row.stage === "regular" &&
      row.playerAId !== null &&
      decidedByDrop(
        { playerAId: row.playerAId, playerBId: row.playerBId },
        droppedIds,
      );
    const rated =
      row.outcome === "normal" && row.winnerId !== null && !droppedOut;
    if (!rated) {
      continue;
    }
    sheets.push({
      matchId: row.matchId,
      playerId: row.playerId,
      phase:
        row.stage === "regular" || row.stage === "tiebreaker"
          ? "regular"
          : "post",
      round: row.round,
      tier: tierOf.get(row.playerId) ?? null,
      result: row.winnerId === row.playerId ? "won" : "lost",
      mons,
    });
  }
  return sheets;
}

// The season's weeks and the rounds tiebreakers are played in, for the week
// filter (research R4).
export async function statsWeeks(
  windowId: string,
): Promise<{ weeks: Week[]; tiebreakerRounds: Set<number> }> {
  const [weeks, tiebreakers] = await Promise.all([
    allMatchdaysForWindow(windowId),
    db
      .selectDistinct({ round: matches.round })
      .from(matches)
      .where(
        and(eq(matches.windowId, windowId), eq(matches.stage, "tiebreaker")),
      ),
  ]);
  return {
    weeks,
    tiebreakerRounds: new Set(tiebreakers.map((row) => row.round)),
  };
}

// The season's divisions, for the division select.
export async function seasonTiers(windowId: string): Promise<number[]> {
  const rows = await db
    .select({ tier: divisions.tier })
    .from(divisions)
    .where(eq(divisions.windowId, windowId))
    .orderBy(divisions.tier);
  return rows.map((row) => row.tier);
}
