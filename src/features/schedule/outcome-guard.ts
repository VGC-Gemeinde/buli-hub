// What a result change may do to Relegation und Playoffs
// (docs/plans/relegation-and-playoffs.md): a change that alters how a match
// ends is refused once a match that builds on it has a result, and after
// any change the seats that depend on it are written anew.

import { and, eq, inArray, or, sql } from "drizzle-orm";
import { matches, motwSelections, recordingHolds } from "@/db/schema";
import { getMatchResult } from "@/features/reporting/queries";
import { db } from "@/lib/db";
import {
  type CountedOutcome,
  countedOutcome,
  sameOutcome,
} from "./effective-outcome";
import { tiedPlayersHavePlayed } from "./queries";
import { syncSeats } from "./relegation-playoffs-setup";

export type { CountedOutcome } from "./effective-outcome";
export { countedOutcome, sameOutcome } from "./effective-outcome";

export const OUTCOME_LOCKED_ERROR =
  "Ein Match, das auf diesem Ergebnis aufbaut, hat schon ein Ergebnis. Dieser Ausgang lässt sich nicht mehr ändern.";

async function matchFacts(matchId: string) {
  const [row] = await db
    .select({
      windowId: matches.windowId,
      stage: matches.stage,
      round: matches.round,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
    })
    .from(matches)
    .where(eq(matches.id, matchId));
  return row ?? null;
}

// Null when the change may go ahead; the error otherwise. `next` is the
// outcome the change leads to, or "any" when the caller cannot tell (a
// dispute decision): then any change is treated as one that alters it.
export async function outcomeChangeRefusal(
  matchId: string,
  next: CountedOutcome | "any",
): Promise<string | null> {
  const match = await matchFacts(matchId);
  if (!match || match.stage === "regular" || match.stage === "relegation") {
    // Regular results are locked as a whole once they matter; nothing builds
    // on a Relegation match.
    return null;
  }
  if (next !== "any") {
    const current = countedOutcome(await getMatchResult(matchId));
    if (sameOutcome(current, next)) {
      return null;
    }
  }
  const players = [match.playerAId, match.playerBId].filter(
    (id): id is string => id !== null,
  );
  // What builds on the match: for a tiebreaker the matches its seats feed;
  // for a playoff match the later rounds its players reach.
  const built = await tiedPlayersHavePlayed(match.windowId, players, {
    afterRound: match.stage === "playoff" ? match.round : undefined,
  });
  return built ? OUTCOME_LOCKED_ERROR : null;
}

// After a result changed: what depends on it is written anew, the seats a
// tiebreaker decides and the next round a playoff match feeds.
export async function afterResultChange(matchId: string): Promise<void> {
  const match = await matchFacts(matchId);
  if (match?.stage === "tiebreaker" || match?.stage === "playoff") {
    await syncSeats(match.windowId);
  }
}

// Whether a match is withheld from the public: held for a recording, or the
// Match of the Week before its VOD.
async function withheld(matchId: string): Promise<boolean> {
  const [hold] = await db
    .select({ id: recordingHolds.matchId })
    .from(recordingHolds)
    .where(eq(recordingHolds.matchId, matchId));
  if (hold) {
    return true;
  }
  const [motw] = await db
    .select({ url: motwSelections.youtubeUrl })
    .from(motwSelections)
    .where(eq(motwSelections.matchId, matchId));
  return motw !== undefined && motw.url === null;
}

// Whether a Relegation or playoff match's line-up comes from a withheld
// result: a tiebreaker or an earlier bracket round one of its players came
// through. That result must not get out through this match
// (docs/plans/relegation-and-playoffs.md).
export async function withheldSourceOf(matchId: string): Promise<boolean> {
  const match = await matchFacts(matchId);
  if (!match || (match.stage !== "relegation" && match.stage !== "playoff")) {
    return false;
  }
  const players = [match.playerAId, match.playerBId].filter(
    (id): id is string => id !== null,
  );
  if (players.length === 0) {
    return false;
  }
  // Where its players came through: a tiebreaker, or (from the second
  // bracket round on) the previous round's playoff match.
  const sources = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.windowId, match.windowId),
        or(
          eq(matches.stage, "tiebreaker"),
          and(
            eq(matches.stage, "playoff"),
            sql`${matches.round} = ${match.round - 1}`,
          ),
        ),
        or(
          inArray(matches.playerAId, players),
          inArray(matches.playerBId, players),
        ),
      ),
    );
  for (const source of sources) {
    if (await withheld(source.id)) {
      return true;
    }
  }
  return false;
}

export const WITHHELD_SOURCE_REPORT_ERROR =
  "Das Match, aus dem dieses seine Besetzung hat, wird noch zurückgehalten. Gemeldet werden kann erst nach seiner Freigabe.";

// Refuses a result for a match whose line-up comes from a withheld result,
// unless the match is withheld itself.
export async function withheldSourceReportRefusal(
  matchId: string,
): Promise<string | null> {
  if (!(await withheldSourceOf(matchId))) {
    return null;
  }
  return (await withheld(matchId)) ? null : WITHHELD_SOURCE_REPORT_ERROR;
}

export const WITHHELD_SOURCE_RELEASE_ERROR =
  "Erst das Match freigeben, aus dem dieses seine Besetzung hat.";
