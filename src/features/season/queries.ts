import { and, asc, eq } from "drizzle-orm";
import {
  divisions,
  matchdays,
  matches,
  placements,
  profiles,
  subDivisions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { playerName } from "@/lib/player-name";
import type { Identity, MatchdayLite } from "./dashboard";

// The player's placement in a season, with the group's tier + position for
// naming. Null when the player has no group placement in this window (the inner
// joins drop a division-only or absent placement).
export async function playerPlacement(
  windowId: string,
  userId: string,
): Promise<{
  divisionId: string;
  subDivisionId: string;
  tier: number;
  position: number;
} | null> {
  const rows = await db
    .select({
      divisionId: placements.divisionId,
      subDivisionId: placements.subDivisionId,
      tier: divisions.tier,
      position: subDivisions.position,
    })
    .from(placements)
    .innerJoin(subDivisions, eq(subDivisions.id, placements.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, placements.divisionId))
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    )
    .limit(1);

  const row = rows[0];
  if (!row?.divisionId || !row.subDivisionId) {
    return null;
  }
  return {
    divisionId: row.divisionId,
    subDivisionId: row.subDivisionId,
    tier: row.tier,
    position: row.position,
  };
}

// Everyone in a sub-division, as display identities, ordered by name — the
// group roster / standings rows.
export async function groupRoster(subDivisionId: string): Promise<Identity[]> {
  const rows = await db
    .select({
      userId: placements.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
    })
    .from(placements)
    .leftJoin(profiles, eq(profiles.userId, placements.userId))
    .where(eq(placements.subDivisionId, subDivisionId));

  return rows
    .map((row) => ({
      userId: row.userId,
      name: playerName(row.displayName, row.username),
      avatarUrl: row.avatarUrl ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// All matches of a sub-division's round-robin (pairings only; results arrive
// with the reporting feature).
export async function subDivisionMatches(
  subDivisionId: string,
): Promise<
  { id: string; round: number; playerAId: string; playerBId: string | null }[]
> {
  return db
    .select({
      id: matches.id,
      round: matches.round,
      playerAId: matches.playerAId,
      playerBId: matches.playerBId,
    })
    .from(matches)
    .where(eq(matches.subDivisionId, subDivisionId))
    .orderBy(asc(matches.round));
}

// The season's Spieltag calendar, ordered by round.
export async function matchdaysForWindow(
  windowId: string,
): Promise<MatchdayLite[]> {
  return db
    .select({
      round: matchdays.round,
      startsOn: matchdays.startsOn,
      endsOn: matchdays.endsOn,
    })
    .from(matchdays)
    .where(eq(matchdays.windowId, windowId))
    .orderBy(asc(matchdays.round));
}
