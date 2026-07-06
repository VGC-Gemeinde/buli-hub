import { and, asc, eq } from "drizzle-orm";
import { divisions, matches, motwSelections, subDivisions } from "@/db/schema";
import { db } from "@/lib/db";

export type MotwSelection = {
  round: number;
  matchId: string;
  youtubeUrl: string | null;
};

// Every Match-of-the-Week pick of a season, ordered by round — feeds the
// public overview (badges + prominent block) and the staff manager.
export async function motwForWindow(
  windowId: string,
): Promise<MotwSelection[]> {
  return db
    .select({
      round: motwSelections.round,
      matchId: motwSelections.matchId,
      youtubeUrl: motwSelections.youtubeUrl,
    })
    .from(motwSelections)
    .where(eq(motwSelections.windowId, windowId))
    .orderBy(asc(motwSelections.round));
}

// The MotW selection a match carries, or null — drives the match page's
// spoiler protection and YouTube link.
export async function motwByMatchId(
  matchId: string,
): Promise<{ round: number; youtubeUrl: string | null } | null> {
  const row = await db.query.motwSelections.findFirst({
    columns: { round: true, youtubeUrl: true },
    where: eq(motwSelections.matchId, matchId),
  });
  return row ?? null;
}

// A match's season anchor for the selection action: which window/round it
// belongs to, its participants, and whether it is a bye (unselectable). Null
// for an unknown id.
export async function matchSelectionContext(matchId: string): Promise<{
  windowId: string;
  round: number;
  playerAId: string;
  playerBId: string | null;
  isBye: boolean;
} | null> {
  const [row] = await db
    .select({
      windowId: divisions.windowId,
      round: matches.round,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
    })
    .from(matches)
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .where(eq(matches.id, matchId))
    .limit(1);
  return row
    ? {
        windowId: row.windowId,
        round: row.round,
        playerAId: row.playerAId,
        playerBId: row.playerBId,
        isBye: row.playerBId === null,
      }
    : null;
}

// Picks (or replaces) the MotW of a round. Replacing clears the YouTube URL —
// it belonged to the previous match.
export async function upsertMotw(input: {
  windowId: string;
  round: number;
  matchId: string;
  staffId: string;
}): Promise<void> {
  await db
    .insert(motwSelections)
    .values({
      windowId: input.windowId,
      round: input.round,
      matchId: input.matchId,
      selectedById: input.staffId,
    })
    .onConflictDoUpdate({
      target: [motwSelections.windowId, motwSelections.round],
      set: {
        matchId: input.matchId,
        youtubeUrl: null,
        selectedById: input.staffId,
        updatedAt: new Date(),
      },
    });
}

// Clears a round's pick. Returns the unselected match id (for revalidation),
// or null when the round had none.
export async function deleteMotw(
  windowId: string,
  round: number,
): Promise<string | null> {
  const rows = await db
    .delete(motwSelections)
    .where(
      and(
        eq(motwSelections.windowId, windowId),
        eq(motwSelections.round, round),
      ),
    )
    .returning({ matchId: motwSelections.matchId });
  return rows[0]?.matchId ?? null;
}

// Sets or clears (url null) a pick's YouTube URL. Returns the affected match
// id, or null when the round has no pick.
export async function setMotwYoutubeUrl(input: {
  windowId: string;
  round: number;
  url: string | null;
}): Promise<string | null> {
  const rows = await db
    .update(motwSelections)
    .set({ youtubeUrl: input.url, updatedAt: new Date() })
    .where(
      and(
        eq(motwSelections.windowId, input.windowId),
        eq(motwSelections.round, input.round),
      ),
    )
    .returning({ matchId: motwSelections.matchId });
  return rows[0]?.matchId ?? null;
}
