import { and, eq, isNull, sql } from "drizzle-orm";
import {
  discordSeasonResources,
  discordSeasonSyncState,
  placements,
} from "@/db/schema";
import { publishedStages } from "@/features/schedule/queries";
import { listSubDivisions } from "@/features/seeding/queries";
import { db } from "@/lib/db";
import { PLAYER_NAME_FALLBACK, playerName } from "@/lib/player-name";
import type {
  ResourceKind,
  SeasonGroup,
  SeasonPlayer,
  StageRoom,
  TrackedResource,
} from "./plan";
import {
  type SeasonDiscordReport,
  type SeasonDiscordSyncState,
  seasonDiscordReportSchema,
} from "./report";

// The season's sub-divisions, ordered by tier and position.
export async function listSeasonGroups(
  windowId: string,
): Promise<SeasonGroup[]> {
  const rows = await listSubDivisions(windowId);
  return rows.map((row) => ({
    subDivisionId: row.id,
    tier: row.tier,
    position: row.position,
  }));
}

// Active placed players of a window with their Discord id, which lives in the
// auth metadata. Raw SQL because Drizzle does not manage the auth schema; the
// metadata goes through the same mapper as a real session.
export async function listPlacedPlayers(
  windowId: string,
): Promise<SeasonPlayer[]> {
  const rows = await db.execute<{
    user_id: string;
    sub_division_id: string;
    display_name: string | null;
    username: string | null;
    discord_id: string;
    stages: string[] | null;
  }>(
    // `stages`: the stages after the regular season the player has a match
    // in (their players are set once Relegation und Playoffs are published).
    sql`select p.user_id, p.sub_division_id, pr.display_name, pr.username,
               u.discord_id,
               array(
                 select distinct m.stage::text from matches m
                 where m.window_id = p.window_id
                   and m.stage in ('playoff', 'relegation')
                   and (m.player_a_id = p.user_id or m.player_b_id = p.user_id)
               ) as stages
        from placements p
        join users u on u.id = p.user_id
        left join profiles pr on pr.user_id = p.user_id
        where p.window_id = ${windowId}
          and p.sub_division_id is not null
          and p.dropped_at is null
        order by p.user_id`,
  );
  return rows.map((row) => ({
    userId: row.user_id,
    subDivisionId: row.sub_division_id,
    stages: (row.stages ?? []).filter(
      (stage): stage is StageRoom =>
        stage === "playoff" || stage === "relegation",
    ),
    name: playerName(row.display_name, row.username) || PLAYER_NAME_FALLBACK,
    discordId: row.discord_id,
  }));
}

export async function trackedResources(
  windowId: string,
): Promise<TrackedResource[]> {
  return db
    .select({
      subDivisionId: discordSeasonResources.subDivisionId,
      kind: discordSeasonResources.kind,
      discordId: discordSeasonResources.discordId,
    })
    .from(discordSeasonResources)
    .where(eq(discordSeasonResources.windowId, windowId));
}

// Records a created role or channel; re-points the row when the sync had to
// recreate a resource whose Discord object was gone. A stage room's rows
// carry no sub-division and are unique per season and kind.
export async function recordResource(input: {
  windowId: string;
  subDivisionId: string | null;
  kind: ResourceKind;
  discordId: string;
}): Promise<void> {
  if (input.subDivisionId === null) {
    await db.transaction(async (tx) => {
      await tx
        .delete(discordSeasonResources)
        .where(
          and(
            eq(discordSeasonResources.windowId, input.windowId),
            eq(discordSeasonResources.kind, input.kind),
            isNull(discordSeasonResources.subDivisionId),
          ),
        );
      await tx.insert(discordSeasonResources).values(input);
    });
    return;
  }
  await db
    .insert(discordSeasonResources)
    .values(input)
    .onConflictDoUpdate({
      target: [
        discordSeasonResources.subDivisionId,
        discordSeasonResources.kind,
      ],
      set: { discordId: input.discordId, createdAt: new Date() },
    });
}

// The stages after the regular season that get a room: once Relegation und
// Playoffs are published, those the season has.
export async function listStageRooms(windowId: string): Promise<StageRoom[]> {
  const stages = await publishedStages(windowId);
  if (!stages) {
    return [];
  }
  return [
    ...(stages.playoffs ? (["playoff"] as const) : []),
    ...(stages.relegation ? (["relegation"] as const) : []),
  ];
}

export async function saveSyncState(
  windowId: string,
  ranAt: Date,
  report: SeasonDiscordReport,
): Promise<void> {
  await db
    .insert(discordSeasonSyncState)
    .values({ windowId, ranAt, report })
    .onConflictDoUpdate({
      target: discordSeasonSyncState.windowId,
      set: { ranAt, report },
    });
}

// The last run's state, or null when there was none (or the stored report
// no longer parses, which reads the same to the dashboard: run it again).
export async function getSyncState(
  windowId: string,
): Promise<SeasonDiscordSyncState | null> {
  const row = await db.query.discordSeasonSyncState.findFirst({
    where: eq(discordSeasonSyncState.windowId, windowId),
  });
  if (!row) {
    return null;
  }
  const parsed = seasonDiscordReportSchema.safeParse(row.report);
  return parsed.success ? { ranAt: row.ranAt, report: parsed.data } : null;
}

// Whether the placements table still lists the window at all — the sync is
// pointless (and the schedule gate handles the rest) without placements.
export async function windowHasPlacements(windowId: string): Promise<boolean> {
  const row = await db.query.placements.findFirst({
    columns: { id: true },
    where: eq(placements.windowId, windowId),
  });
  return row !== undefined;
}
