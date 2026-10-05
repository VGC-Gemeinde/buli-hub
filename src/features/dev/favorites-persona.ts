import { sql } from "drizzle-orm";
import { addFavorite, favoriteIds } from "@/features/favorites/queries";
import { db } from "@/lib/db";

// The demo favourites of the "Zuschauerin" persona (docs/plans/favorites.md):
// a duel of two favourites in the running week, one player from each further
// group, and a dropped player if the season has one, so the page shows its
// states one login away.
export function pickDemoFavorites(input: {
  // The running Spieltag's matches, tier and group order.
  matches: readonly {
    groupId: string;
    playerAId: string;
    playerBId: string | null;
  }[];
  droppedIds: readonly string[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? 6;
  const picked: string[] = [];
  const add = (id: string | null) => {
    if (id && !picked.includes(id) && picked.length < limit) {
      picked.push(id);
    }
  };
  const duel = input.matches.find((m) => m.playerBId !== null);
  if (duel) {
    add(duel.playerAId);
    add(duel.playerBId);
  }
  add(input.droppedIds[0] ?? null);
  const seenGroups = new Set(duel ? [duel.groupId] : []);
  for (const m of input.matches) {
    if (!seenGroups.has(m.groupId)) {
      seenGroups.add(m.groupId);
      add(m.playerAId);
    }
  }
  return picked;
}

// Gives the persona its demo favourites, unless it already has some (a
// persona's own changes survive the next login).
export async function ensurePersonaFavorites(userId: string): Promise<void> {
  if ((await favoriteIds(userId)).size > 0) {
    return;
  }
  const window = await db.execute<{ id: string }>(
    sql`select id from registration_windows order by opened_at desc limit 1`,
  );
  const windowId = window[0]?.id;
  if (!windowId) {
    return;
  }
  const matches = await db.execute<{
    group_id: string;
    player_a_id: string;
    player_b_id: string | null;
  }>(sql`
    select m.sub_division_id as group_id, m.player_a_id, m.player_b_id
    from matches m
    join sub_divisions sd on sd.id = m.sub_division_id
    join divisions d on d.id = sd.division_id
    join matchdays md on md.window_id = d.window_id and md.round = m.round
    where d.window_id = ${windowId}
      and md.starts_on <= current_date and md.ends_on >= current_date
    order by d.tier, sd.position, m.id
  `);
  const dropped = await db.execute<{ user_id: string }>(sql`
    select user_id from placements
    where window_id = ${windowId} and dropped_at is not null
    order by user_id
  `);
  const ids = pickDemoFavorites({
    matches: matches.map((m) => ({
      groupId: m.group_id,
      playerAId: m.player_a_id,
      playerBId: m.player_b_id,
    })),
    droppedIds: dropped.map((d) => d.user_id),
  });
  for (const id of ids) {
    if (id !== userId) {
      await addFavorite(userId, id);
    }
  }
}
