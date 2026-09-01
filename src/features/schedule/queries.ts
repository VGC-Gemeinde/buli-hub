import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import {
  divisions,
  matchdays,
  matches,
  placements,
  registrationWindows,
  subDivisions,
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

// Whether the match's own season has published its schedule. Gate for the
// public match page and reporting: resolved per match (not via the latest
// window), so links into past seasons keep working while a new season's
// schedule is still hidden.
export async function matchSchedulePublished(
  matchId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ publishedAt: registrationWindows.schedulePublishedAt })
    .from(matches)
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .innerJoin(
      registrationWindows,
      eq(registrationWindows.id, divisions.windowId),
    )
    .where(eq(matches.id, matchId));
  return row !== undefined && row.publishedAt !== null;
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
      await tx.insert(matches).values([...matchRows]);
    }
  });
}
