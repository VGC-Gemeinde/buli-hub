import { and, asc, eq, gt, inArray } from "drizzle-orm";
import {
  divisions,
  placements,
  profiles,
  registrations,
  seedings,
  subDivisions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { generateSubDivisions } from "./generate-sub-divisions";
import type { SeedingPlayer } from "./placement";

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
  await db
    .insert(placements)
    .values({ windowId, userId, divisionId, subDivisionId: null })
    .onConflictDoUpdate({
      target: [placements.windowId, placements.userId],
      set: { divisionId, subDivisionId: null },
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
    await tx
      .insert(seedings)
      .values({ windowId, subDivisionSize, updatedAt: now })
      .onConflictDoUpdate({
        target: seedings.windowId,
        set: { subDivisionSize, updatedAt: now },
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

export async function publishSeeding(windowId: string) {
  await db
    .update(seedings)
    .set({ publishedAt: new Date() })
    .where(eq(seedings.windowId, windowId));
}
