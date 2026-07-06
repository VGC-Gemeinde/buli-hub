import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { divisions, placements, profiles, subDivisions } from "@/db/schema";
import type { Identity } from "@/features/season/dashboard";
import { subDivisionName } from "@/features/seeding/seeding";
import { db } from "@/lib/db";
import { PLAYER_NAME_FALLBACK, playerName } from "@/lib/player-name";

// Marks a placed player as dropped. The caller (action) guarantees the
// placement exists and is active and the reason is non-empty.
export async function setDropped(input: {
  windowId: string;
  userId: string;
  staffId: string;
  reason: string;
}): Promise<void> {
  await db
    .update(placements)
    .set({
      droppedAt: new Date(),
      droppedById: input.staffId,
      dropReason: input.reason,
    })
    .where(
      and(
        eq(placements.windowId, input.windowId),
        eq(placements.userId, input.userId),
      ),
    );
}

// Un-drop: results were never touched, so clearing the flag restores
// everything.
export async function clearDropped(
  windowId: string,
  userId: string,
): Promise<void> {
  await db
    .update(placements)
    .set({ droppedAt: null, droppedById: null, dropReason: null })
    .where(
      and(eq(placements.windowId, windowId), eq(placements.userId, userId)),
    );
}

// The placement of one player in a window (drop state included), or null.
export async function placementDropState(
  windowId: string,
  userId: string,
): Promise<{ droppedAt: Date | null; dropReason: string | null } | null> {
  const row = await db.query.placements.findFirst({
    columns: { droppedAt: true, dropReason: true },
    where: and(
      eq(placements.windowId, windowId),
      eq(placements.userId, userId),
    ),
  });
  return row ?? null;
}

export async function droppedIdsForWindow(
  windowId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ userId: placements.userId })
    .from(placements)
    .where(
      and(eq(placements.windowId, windowId), isNotNull(placements.droppedAt)),
    );
  return new Set(rows.map((row) => row.userId));
}

export async function droppedIdsForSubDivision(
  subDivisionId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ userId: placements.userId })
    .from(placements)
    .where(
      and(
        eq(placements.subDivisionId, subDivisionId),
        isNotNull(placements.droppedAt),
      ),
    );
  return new Set(rows.map((row) => row.userId));
}

export type DropRow = {
  identity: Identity;
  groupName: string;
  reason: string | null;
  droppedAt: Date;
};

// The staff list: every dropped player of a window with group context.
export async function listDrops(windowId: string): Promise<DropRow[]> {
  const rows = await db
    .select({
      userId: placements.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      tier: divisions.tier,
      position: subDivisions.position,
      reason: placements.dropReason,
      droppedAt: placements.droppedAt,
    })
    .from(placements)
    .leftJoin(profiles, eq(profiles.userId, placements.userId))
    .innerJoin(subDivisions, eq(subDivisions.id, placements.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, placements.divisionId))
    .where(
      and(eq(placements.windowId, windowId), isNotNull(placements.droppedAt)),
    )
    .orderBy(asc(placements.droppedAt));
  return rows.map((row) => ({
    identity: {
      userId: row.userId,
      name: playerName(row.displayName, row.username),
      avatarUrl: row.avatarUrl ?? null,
    },
    groupName: subDivisionName(row.tier, row.position),
    reason: row.reason,
    droppedAt: row.droppedAt as Date,
  }));
}

export type DropCandidate = {
  userId: string;
  name: string;
  groupName: string;
};

// Active (not yet dropped), group-placed players of a window — the drop
// dialog's picker, ordered by group then name.
export async function listDropCandidates(
  windowId: string,
): Promise<DropCandidate[]> {
  const rows = await db
    .select({
      userId: placements.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      tier: divisions.tier,
      position: subDivisions.position,
    })
    .from(placements)
    .leftJoin(profiles, eq(profiles.userId, placements.userId))
    .innerJoin(subDivisions, eq(subDivisions.id, placements.subDivisionId))
    .innerJoin(divisions, eq(divisions.id, placements.divisionId))
    .where(and(eq(placements.windowId, windowId), isNull(placements.droppedAt)))
    .orderBy(asc(divisions.tier), asc(subDivisions.position));
  return rows
    .map((row) => ({
      userId: row.userId,
      name: playerName(row.displayName, row.username) || PLAYER_NAME_FALLBACK,
      groupName: subDivisionName(row.tier, row.position),
    }))
    .sort(
      (a, b) =>
        a.groupName.localeCompare(b.groupName, "de") ||
        a.name.localeCompare(b.name, "de"),
    );
}
