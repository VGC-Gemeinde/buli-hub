import { and, asc, count, eq, gt, inArray } from "drizzle-orm";
import {
  divisions,
  placements,
  profiles,
  registrations,
  seedingLocks,
  seedings,
  subDivisions,
} from "@/db/schema";
import { db } from "@/lib/db";
import type { Lock } from "./control";
import { generateSubDivisions } from "./generate-sub-divisions";
import type { SeedingPlayer } from "./placement";

// The current control lock plus the holder's display name for the banner, or
// null if nobody has ever taken control. Freshness (TTL) is decided by the pure
// `deriveControlState`, not here.
export async function getLockWithHolder(
  windowId: string,
): Promise<(Lock & { holderName: string | null }) | null> {
  const row = await db
    .select({
      holderId: seedingLocks.holderId,
      heartbeatAt: seedingLocks.heartbeatAt,
      displayName: profiles.displayName,
      username: profiles.username,
    })
    .from(seedingLocks)
    .leftJoin(profiles, eq(profiles.userId, seedingLocks.holderId))
    .where(eq(seedingLocks.windowId, windowId))
    .limit(1);
  const lock = row[0];
  if (!lock) {
    return null;
  }
  return {
    holderId: lock.holderId,
    heartbeatAt: lock.heartbeatAt,
    holderName: lock.displayName ?? lock.username,
  };
}

// Takes (or renews) control for `holderId`, resetting both timestamps to now.
export async function upsertLock(windowId: string, holderId: string) {
  const now = new Date();
  await db
    .insert(seedingLocks)
    .values({ windowId, holderId, acquiredAt: now, heartbeatAt: now })
    .onConflictDoUpdate({
      target: seedingLocks.windowId,
      set: { holderId, acquiredAt: now, heartbeatAt: now },
    });
}

// Refreshes the heartbeat only while `holderId` still holds the lock (a
// takeover changes the holder, so this becomes a no-op for the ousted tab).
export async function bumpHeartbeat(windowId: string, holderId: string) {
  await db
    .update(seedingLocks)
    .set({ heartbeatAt: new Date() })
    .where(
      and(
        eq(seedingLocks.windowId, windowId),
        eq(seedingLocks.holderId, holderId),
      ),
    );
}

// Releases the lock only if `holderId` still holds it.
export async function releaseLock(windowId: string, holderId: string) {
  await db
    .delete(seedingLocks)
    .where(
      and(
        eq(seedingLocks.windowId, windowId),
        eq(seedingLocks.holderId, holderId),
      ),
    );
}

export async function getSeeding(windowId: string) {
  return (
    (await db.query.seedings.findFirst({
      where: eq(seedings.windowId, windowId),
    })) ?? null
  );
}

export async function listDivisions(windowId: string) {
  return db
    .select()
    .from(divisions)
    .where(eq(divisions.windowId, windowId))
    .orderBy(asc(divisions.tier));
}

// Registered players for the season with their identity and current division
// placement (null = unassigned).
export async function listSeedingPlayers(
  windowId: string,
): Promise<SeedingPlayer[]> {
  return db
    .select({
      userId: registrations.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      status: registrations.status,
      platform: registrations.platform,
      participatedBefore: registrations.participatedBefore,
      skillSelfRating: registrations.skillSelfRating,
      prevSeason: registrations.prevSeason,
      prevName: registrations.prevName,
      prevDivision: registrations.prevDivision,
      prevPlacement: registrations.prevPlacement,
      greatestAchievements: registrations.greatestAchievements,
      divisionId: placements.divisionId,
      subDivisionId: placements.subDivisionId,
    })
    .from(registrations)
    .leftJoin(profiles, eq(profiles.userId, registrations.userId))
    .leftJoin(
      placements,
      and(
        eq(placements.userId, registrations.userId),
        eq(placements.windowId, windowId),
      ),
    )
    .where(eq(registrations.windowId, windowId));
}

export async function divisionBelongsToWindow(
  windowId: string,
  divisionId: string,
): Promise<boolean> {
  const row = await db.query.divisions.findFirst({
    columns: { id: true },
    where: and(eq(divisions.id, divisionId), eq(divisions.windowId, windowId)),
  });
  return row !== undefined;
}

// Assigns (or clears, divisionId null) a player's division. Changing the
// division resets any sub-division placement, which belongs to a division.
export async function assignPlayerToDivision(
  windowId: string,
  userId: string,
  divisionId: string | null,
) {
  await assignPlayersToDivision(windowId, [userId], divisionId);
}

// Bulk variant: assign many players to one division in a single upsert.
export async function assignPlayersToDivision(
  windowId: string,
  userIds: string[],
  divisionId: string | null,
) {
  if (userIds.length === 0) {
    return;
  }
  await db
    .insert(placements)
    .values(
      userIds.map((userId) => ({
        windowId,
        userId,
        divisionId,
        subDivisionId: null,
      })),
    )
    .onConflictDoUpdate({
      target: [placements.windowId, placements.userId],
      set: { divisionId, subDivisionId: null },
    });
}

// Removes a player's placement entirely. Part of a staff registration cancel:
// a draft seeding may already have placed the player, and schedule generation
// reads placements alone, so an orphaned row would put a ghost player into the
// Spielplan.
export async function removePlacement(windowId: string, userId: string) {
  await db
    .delete(placements)
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    );
}

// Creates the divisions for tiers 1..count. Used by the auto-init, which sets
// up the divisions without a seedings row (the group size is chosen by staff
// afterwards). No-op for count < 1.
export async function createDivisions(windowId: string, count: number) {
  if (count < 1) {
    return;
  }
  const rows = [];
  for (let tier = 1; tier <= count; tier++) {
    rows.push({ windowId, tier });
  }
  await db.insert(divisions).values(rows);
}

// Places players into an exact division + sub-division in one upsert (drag &
// drop can drop onto a group, which sets both at once — unlike the division /
// group assignments above that each touch only one field).
export async function placePlayersInGroup(
  windowId: string,
  userIds: string[],
  divisionId: string | null,
  subDivisionId: string | null,
) {
  if (userIds.length === 0) {
    return;
  }
  await db
    .insert(placements)
    .values(
      userIds.map((userId) => ({
        windowId,
        userId,
        divisionId,
        subDivisionId,
      })),
    )
    .onConflictDoUpdate({
      target: [placements.windowId, placements.userId],
      set: { divisionId, subDivisionId },
    });
}

// Persists the seeding config and reconciles the division rows to exactly
// `divisionCount` tiers (1..N): creates the missing tiers and removes any
// above N (their sub-divisions cascade; placements are set null).
export async function saveSeedingConfig(
  windowId: string,
  subDivisionSize: number,
  divisionCount: number,
) {
  await db.transaction(async (tx) => {
    const now = new Date();
    // Changing the size/division count reshapes the seeding, so any saved
    // post-season config no longer reflects it — clear the confirmation.
    await tx
      .insert(seedings)
      .values({ windowId, subDivisionSize, updatedAt: now })
      .onConflictDoUpdate({
        target: seedings.windowId,
        set: { subDivisionSize, postSeasonConfiguredAt: null, updatedAt: now },
      });

    const existing = await tx
      .select({ tier: divisions.tier })
      .from(divisions)
      .where(eq(divisions.windowId, windowId));
    const existingTiers = new Set(existing.map((row) => row.tier));

    const toCreate = [];
    for (let tier = 1; tier <= divisionCount; tier++) {
      if (!existingTiers.has(tier)) {
        toCreate.push({ windowId, tier });
      }
    }
    if (toCreate.length > 0) {
      await tx.insert(divisions).values(toCreate);
    }

    await tx
      .delete(divisions)
      .where(
        and(
          eq(divisions.windowId, windowId),
          gt(divisions.tier, divisionCount),
        ),
      );
  });
}

// Persists the per-season replay requirement (proof mandatory for tiers
// <= value). Does not touch the post-season stamp — the rule has nothing to
// do with the group shape. The insert path only exists for the edge of a
// seeding that was never configured (no auto-init); it uses the same size
// default the workspace assumes.
export async function saveReplayRequirement(
  windowId: string,
  replayRequiredTiers: number,
) {
  const now = new Date();
  await db
    .insert(seedings)
    .values({
      windowId,
      subDivisionSize: 8,
      replayRequiredTiers,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: seedings.windowId,
      set: { replayRequiredTiers, updatedAt: now },
    });
}

// Sub-divisions of a season's divisions, ordered by division tier then group
// position.
export async function listSubDivisions(windowId: string) {
  return db
    .select({
      id: subDivisions.id,
      divisionId: subDivisions.divisionId,
      position: subDivisions.position,
      tier: divisions.tier,
    })
    .from(subDivisions)
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .where(eq(divisions.windowId, windowId))
    .orderBy(asc(divisions.tier), asc(subDivisions.position));
}

// Regenerates a division's sub-divisions from its assigned players: replaces
// the existing groups and re-assigns every player. Idempotent to re-run.
export async function generateSubDivisionsForDivision(
  windowId: string,
  divisionId: string,
) {
  const seeding = await getSeeding(windowId);
  if (!seeding) {
    return;
  }

  const divisionPlayers = await db
    .select({
      userId: placements.userId,
      platform: registrations.platform,
    })
    .from(placements)
    .innerJoin(
      registrations,
      and(
        eq(registrations.userId, placements.userId),
        eq(registrations.windowId, placements.windowId),
      ),
    )
    .where(
      and(
        eq(placements.windowId, windowId),
        eq(placements.divisionId, divisionId),
      ),
    );

  const groups = generateSubDivisions(divisionPlayers, seeding.subDivisionSize);

  await db.transaction(async (tx) => {
    // Regenerating groups changes their sizes, so a saved post-season config
    // may no longer be valid — clear the confirmation.
    await tx
      .update(seedings)
      .set({ postSeasonConfiguredAt: null, updatedAt: new Date() })
      .where(eq(seedings.windowId, windowId));
    // Deleting the old groups resets their players' sub_division_id (FK set
    // null); recreate and re-assign.
    await tx
      .delete(subDivisions)
      .where(eq(subDivisions.divisionId, divisionId));

    for (let position = 0; position < groups.length; position++) {
      const [created] = await tx
        .insert(subDivisions)
        .values({ divisionId, position })
        .returning({ id: subDivisions.id });
      const userIds = groups[position].map((p) => p.userId);
      if (userIds.length > 0) {
        await tx
          .update(placements)
          .set({ subDivisionId: created.id })
          .where(
            and(
              eq(placements.windowId, windowId),
              inArray(placements.userId, userIds),
            ),
          );
      }
    }
  });
}

// The division a sub-division belongs to (for validating manual moves).
export async function subDivisionDivisionId(
  subDivisionId: string,
): Promise<string | null> {
  const row = await db.query.subDivisions.findFirst({
    columns: { divisionId: true },
    where: eq(subDivisions.id, subDivisionId),
  });
  return row?.divisionId ?? null;
}

export async function movePlayerToSubDivision(
  windowId: string,
  userId: string,
  subDivisionId: string,
) {
  await db
    .update(placements)
    .set({ subDivisionId })
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    );
}

export async function finalizeSeeding(windowId: string) {
  await db
    .update(seedings)
    .set({ finalizedAt: new Date() })
    .where(eq(seedings.windowId, windowId));
}

// Every division of a window with its post-season config and the roster size of
// each of its groups (ordered by position) — the input for post-season
// validation and the config panel.
export type DivisionWithGroupSizes = {
  id: string;
  tier: number;
  relevantTable: "sub_division" | "division";
  guaranteedPromotions: number;
  guaranteedDemotions: number;
  promotionPlayoffSlots: number;
  demotionPlayoffSlots: number;
  championshipPlayoffSlots: number;
  groupSizes: number[];
};

export async function divisionsWithGroupSizes(
  windowId: string,
): Promise<DivisionWithGroupSizes[]> {
  const divs = await listDivisions(windowId);
  // One row per group with its player count, in tier/position order.
  const groups = await db
    .select({
      divisionId: subDivisions.divisionId,
      position: subDivisions.position,
      size: count(placements.userId),
    })
    .from(subDivisions)
    .innerJoin(divisions, eq(divisions.id, subDivisions.divisionId))
    .leftJoin(placements, eq(placements.subDivisionId, subDivisions.id))
    .where(eq(divisions.windowId, windowId))
    .groupBy(subDivisions.divisionId, subDivisions.id, subDivisions.position)
    .orderBy(asc(subDivisions.position));

  const sizesByDivision = new Map<string, number[]>();
  for (const group of groups) {
    const list = sizesByDivision.get(group.divisionId) ?? [];
    list.push(group.size);
    sizesByDivision.set(group.divisionId, list);
  }

  return divs.map((division) => ({
    id: division.id,
    tier: division.tier,
    relevantTable: division.relevantTable,
    guaranteedPromotions: division.guaranteedPromotions,
    guaranteedDemotions: division.guaranteedDemotions,
    promotionPlayoffSlots: division.promotionPlayoffSlots,
    demotionPlayoffSlots: division.demotionPlayoffSlots,
    championshipPlayoffSlots: division.championshipPlayoffSlots,
    groupSizes: sizesByDivision.get(division.id) ?? [],
  }));
}

// A single division's post-season config (for the player dashboard's zones).
export async function divisionPostSeason(divisionId: string): Promise<{
  relevantTable: "sub_division" | "division";
  guaranteedPromotions: number;
  guaranteedDemotions: number;
  promotionPlayoffSlots: number;
  demotionPlayoffSlots: number;
  championshipPlayoffSlots: number;
} | null> {
  const row = await db.query.divisions.findFirst({
    columns: {
      relevantTable: true,
      guaranteedPromotions: true,
      guaranteedDemotions: true,
      promotionPlayoffSlots: true,
      demotionPlayoffSlots: true,
      championshipPlayoffSlots: true,
    },
    where: eq(divisions.id, divisionId),
  });
  return row ?? null;
}

// Writes each division's post-season columns and stamps (or clears)
// `post_season_configured_at`: set only when the config is valid, so finalize's
// "explicitly configured" gate can trust it.
export async function savePostSeasonConfig(
  windowId: string,
  configs: readonly {
    divisionId: string;
    relevantTable: "sub_division" | "division";
    guaranteedPromotions: number;
    guaranteedDemotions: number;
    promotionPlayoffSlots: number;
    demotionPlayoffSlots: number;
    championshipPlayoffSlots: number;
  }[],
  valid: boolean,
) {
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const config of configs) {
      await tx
        .update(divisions)
        .set({
          relevantTable: config.relevantTable,
          guaranteedPromotions: config.guaranteedPromotions,
          guaranteedDemotions: config.guaranteedDemotions,
          promotionPlayoffSlots: config.promotionPlayoffSlots,
          demotionPlayoffSlots: config.demotionPlayoffSlots,
          championshipPlayoffSlots: config.championshipPlayoffSlots,
        })
        .where(
          and(
            eq(divisions.id, config.divisionId),
            eq(divisions.windowId, windowId),
          ),
        );
    }
    await tx
      .update(seedings)
      .set({ postSeasonConfiguredAt: valid ? now : null, updatedAt: now })
      .where(eq(seedings.windowId, windowId));
  });
}
