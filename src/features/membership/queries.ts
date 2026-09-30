import type { User } from "@supabase/supabase-js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { placements, profiles, registrations } from "@/db/schema";
import {
  type DiscordIdentity,
  discordIdentityFromUser,
} from "@/features/auth/identity";
import { db } from "@/lib/db";
import type { RosterMembership } from "./membership";

// Registered roster of a window with membership state, for the staff overview.
// Dropped players are left out: the membership duty is a condition of taking
// part, and a dropped player no longer takes part, so a dropped player who
// left the server is nothing for staff to clarify. Before the seeding there
// are no placements and the left join keeps everyone.
export async function registeredMembership(
  windowId: string,
): Promise<RosterMembership[]> {
  return db
    .select({
      userId: registrations.userId,
      displayName: profiles.displayName,
      username: profiles.username,
      avatarUrl: profiles.avatarUrl,
      guildMember: profiles.guildMember,
      guildMemberCheckedAt: profiles.guildMemberCheckedAt,
    })
    .from(registrations)
    .leftJoin(profiles, eq(profiles.userId, registrations.userId))
    .leftJoin(
      placements,
      and(
        eq(placements.windowId, registrations.windowId),
        eq(placements.userId, registrations.userId),
      ),
    )
    .where(
      and(eq(registrations.windowId, windowId), isNull(placements.droppedAt)),
    );
}

// Registered players' auth identities for the membership sweep. Raw SQL
// because Drizzle does not manage the auth schema; the metadata goes through
// the same mapper as a real session (the pinPersonaProfile trick).
export async function listRegisteredIdentities(
  windowId: string,
): Promise<{ userId: string; identity: DiscordIdentity }[]> {
  const rows = await db.execute<{
    id: string;
    meta: Record<string, unknown> | null;
  }>(
    sql`select u.id, u.raw_user_meta_data as meta
        from registrations r
        join auth.users u on u.id = r.user_id
        where r.window_id = ${windowId}`,
  );
  return rows.map((row) => ({
    userId: row.id,
    identity: discordIdentityFromUser({
      user_metadata: row.meta ?? {},
    } as User),
  }));
}
