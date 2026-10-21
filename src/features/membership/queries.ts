import { and, eq, isNull, sql } from "drizzle-orm";
import { placements, profiles, registrations } from "@/db/schema";
import type { DiscordIdentity } from "@/features/auth/identity";
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

// Registered players' Discord identities for the membership sweep: the
// Discord id from `users`, the names and avatar as the last sync stored them.
export async function listRegisteredIdentities(
  windowId: string,
): Promise<{ userId: string; identity: DiscordIdentity }[]> {
  const rows = await db.execute<{
    id: string;
    discord_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>(
    sql`select u.id, u.discord_id, p.display_name, p.username, p.avatar_url
        from registrations r
        join users u on u.id = r.user_id
        left join profiles p on p.user_id = u.id
        where r.window_id = ${windowId}`,
  );
  return rows.map((row) => ({
    userId: row.id,
    identity: {
      discordId: row.discord_id,
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url,
    },
  }));
}
