// Database half of the impersonation tooling.
//
// Once the local database holds production-shaped data, the most useful dev
// tool is not "log in as a made-up admin" but "see exactly what this player
// sees" — their season, division, matches and results. That catches the bugs a
// non-technical user would otherwise have to report.
//
// No profile pinning happens here, unlike persona login: a cloned user already
// carries the right role, and role sync stays off outside production
// (src/features/roles/config.ts), so nothing overwrites it.

import { and, eq, sql } from "drizzle-orm";
import { divisions, placements, profiles, subDivisions } from "@/db/schema";
import { type DevLoginResult, establishSession } from "@/features/dev/login";
import { latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { divisionLabel, type ImpersonatableUser } from "./users";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Signs the browser in as an existing user. The email is looked up here rather
 * than taken from the caller, so a stale link cannot mint a session for an
 * address that no longer belongs to that row.
 */
export async function loginAsUser(userId: string): Promise<DevLoginResult> {
  if (!UUID.test(userId)) {
    return { ok: false, error: `Keine gültige Nutzer-ID: ${userId}` };
  }

  const rows = await db.execute<{ email: string | null }>(
    sql`select email from auth.users where id = ${userId}`,
  );
  const email = rows[0]?.email;
  if (!email) {
    return { ok: false, error: `Kein Nutzer mit der ID ${userId}` };
  }

  return establishSession(email);
}

/**
 * Every user with a profile row, annotated with their placement in the latest
 * season so the picker can be scanned by division rather than by uuid.
 */
export async function listImpersonatableUsers(): Promise<ImpersonatableUser[]> {
  const windowId = (await latestWindow())?.id ?? null;

  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      role: profiles.role,
      tier: divisions.tier,
      position: subDivisions.position,
      droppedAt: placements.droppedAt,
    })
    .from(profiles)
    // Without a season there is nothing to join to; `false` keeps one query
    // shape instead of branching the whole select.
    .leftJoin(
      placements,
      windowId
        ? and(
            eq(placements.userId, profiles.userId),
            eq(placements.windowId, windowId),
          )
        : sql`false`,
    )
    .leftJoin(divisions, eq(divisions.id, placements.divisionId))
    .leftJoin(subDivisions, eq(subDivisions.id, placements.subDivisionId))
    .orderBy(
      sql`${divisions.tier} nulls last`,
      sql`${subDivisions.position} nulls last`,
      profiles.displayName,
    );

  return rows.map((row) => ({
    userId: row.userId,
    displayName: row.displayName,
    username: row.username,
    role: row.role,
    division: divisionLabel(row.tier, row.position),
    dropped: row.droppedAt !== null,
  }));
}
