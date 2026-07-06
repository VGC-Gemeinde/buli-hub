import { eq } from "drizzle-orm";
import { profiles } from "@/db/schema";
import type { Role } from "@/features/roles/roles";
import { db } from "@/lib/db";
import { playerName } from "@/lib/player-name";

export type ProfileIdentity = {
  userId: string;
  name: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: Role;
};

// The public identity of a player (profile page header), or null when no
// profile exists — the page 404s then.
export async function profileIdentity(
  userId: string,
): Promise<ProfileIdentity | null> {
  const row = await db.query.profiles.findFirst({
    columns: {
      userId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      role: true,
    },
    where: eq(profiles.userId, userId),
  });
  if (!row) {
    return null;
  }
  return {
    userId: row.userId,
    name: playerName(row.displayName, row.username),
    displayName: row.displayName,
    username: row.username,
    avatarUrl: row.avatarUrl,
    role: row.role,
  };
}
