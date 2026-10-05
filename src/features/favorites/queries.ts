import { and, eq, inArray, sql } from "drizzle-orm";
import type { PickablePlayer } from "@/components/player-picker";
import { favorites, profiles } from "@/db/schema";
import {
  type OverviewViewer,
  publicLeagueOverview,
} from "@/features/public-league/queries";
import { replacementsForWindow } from "@/features/replacements/queries";
import { replacedByMap } from "@/features/replacements/replacement";
import type { MatchdayLite } from "@/features/season/dashboard";
import { db } from "@/lib/db";
import {
  type FavoriteGroup,
  type FavoritePlayer,
  favoriteCandidates,
  favoriteGroups,
  favoritesTable,
} from "./favorites";

// The players a user has favourited. Empty for nobody signed in, so callers
// can pass the result straight to the views.
export async function favoriteIds(userId: string | null): Promise<Set<string>> {
  if (userId === null) {
    return new Set();
  }
  const rows = await db
    .select({ playerId: favorites.playerId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return new Set(rows.map((row) => row.playerId));
}

// Idempotent: a second add of the same player is a no-op.
export async function addFavorite(
  userId: string,
  playerId: string,
): Promise<void> {
  await db.insert(favorites).values({ userId, playerId }).onConflictDoNothing();
}

export async function removeFavorite(
  userId: string,
  playerId: string,
): Promise<void> {
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.playerId, playerId)));
}

// Whether a hub user with this id exists. Raw SQL because Drizzle does not
// manage the auth schema.
export async function hubUserExists(userId: string): Promise<boolean> {
  const rows = await db.execute<{ id: string }>(
    sql`select id from auth.users where id = ${userId}`,
  );
  return rows.length > 0;
}

export type FavoritesPageData = {
  seasonName: string;
  currentRound: number | null;
  totalRounds: number;
  matchdays: MatchdayLite[];
  groups: FavoriteGroup[];
  players: FavoritePlayer[];
  candidates: PickablePlayer[];
};

// Everything `/favoriten` shows, built on the public overview so the page
// counts exactly what the public tables count (drops, replacements and the
// result embargo already applied).
export async function favoritesPage(input: {
  windowId: string;
  seasonNumber: number;
  today: string;
  viewer: OverviewViewer & { userId: string };
  favoriteIds: ReadonlySet<string>;
}): Promise<FavoritesPageData> {
  const [overview, replacements] = await Promise.all([
    publicLeagueOverview(
      input.windowId,
      input.seasonNumber,
      input.today,
      input.viewer,
    ),
    replacementsForWindow(input.windowId),
  ]);
  const accepted = replacements.filter((r) => r.acceptedAt !== null);
  const replacedBy = replacedByMap(
    accepted.map((r) => ({
      replacedUserId: r.replaced.userId,
      replacementUserId: r.replacement.userId,
      entryRound: r.entryRound,
    })),
  );

  const placedIds = overview.divisions.flatMap((d) =>
    d.groups.flatMap((g) => g.standings.map((row) => row.userId)),
  );
  const usernames = await usernamesOf(placedIds);

  return {
    seasonName: overview.seasonName,
    currentRound: overview.currentRound,
    totalRounds: overview.totalRounds,
    matchdays: overview.matchdays,
    groups: favoriteGroups(overview.divisions, input.favoriteIds),
    players: favoritesTable(
      overview.divisions,
      input.favoriteIds,
      replacedBy,
      overview.currentRound,
    ),
    candidates: favoriteCandidates(
      overview.divisions,
      usernames,
      input.viewer.userId,
    ),
  };
}

async function usernamesOf(
  userIds: readonly string[],
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({ userId: profiles.userId, username: profiles.username })
    .from(profiles)
    .where(inArray(profiles.userId, [...userIds]));
  return new Map(rows.map((row) => [row.userId, row.username]));
}
