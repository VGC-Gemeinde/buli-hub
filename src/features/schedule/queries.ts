import { and, asc, eq, isNotNull } from "drizzle-orm";
import { matchdays, matches, placements } from "@/db/schema";
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
