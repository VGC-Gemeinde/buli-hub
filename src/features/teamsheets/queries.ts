import { eq } from "drizzle-orm";
import {
  divisions,
  matches,
  profiles,
  registrationWindows,
  subDivisions,
  teamSheets,
} from "@/db/schema";
import { db } from "@/lib/db";
import { playerName } from "@/lib/player-name";

export type StoredSheet = {
  id: string;
  matchId: string;
  playerName: string;
  seasonNumber: number;
  round: number;
  ots: string;
};

// The id column is a uuid, so a request for `/pastes/nonsense` would reach
// Postgres as a failed cast and surface as a 500. A typo in a URL is a 404.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A paste with just enough context to title it. Deliberately no result, no
// score and no opponent: the page is reachable by anyone holding the link, and
// spoiler protection lives on the match view it links back to.
export async function getTeamSheet(id: string): Promise<StoredSheet | null> {
  if (!UUID.test(id)) {
    return null;
  }
  const [row] = await db
    .select({
      id: teamSheets.id,
      matchId: teamSheets.matchId,
      ots: teamSheets.ots,
      round: matches.round,
      seasonNumber: registrationWindows.seasonNumber,
      displayName: profiles.displayName,
      username: profiles.username,
    })
    .from(teamSheets)
    .innerJoin(matches, eq(matches.id, teamSheets.matchId))
    .innerJoin(subDivisions, eq(subDivisions.id, matches.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .innerJoin(
      registrationWindows,
      eq(registrationWindows.id, divisions.windowId),
    )
    .leftJoin(profiles, eq(profiles.userId, teamSheets.playerId))
    .where(eq(teamSheets.id, id))
    .limit(1);

  if (!row) {
    return null;
  }
  return {
    id: row.id,
    matchId: row.matchId,
    playerName: playerName(row.displayName, row.username),
    seasonNumber: row.seasonNumber,
    round: row.round,
    ots: row.ots,
  };
}
