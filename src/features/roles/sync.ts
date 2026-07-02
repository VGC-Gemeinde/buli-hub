import { eq } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { fetchGuildMember } from "@/lib/discord";
import { roleConfig } from "./config";
import { deriveRole, isRoleStale, type Role } from "./roles";

async function readStored(userId: string) {
  const row = await db.query.profiles.findFirst({
    columns: { role: true, roleSyncedAt: true },
    where: eq(profiles.userId, userId),
  });
  return row ?? null;
}

/**
 * Fetches the user's guild roles from Discord and stores the derived app
 * role. Throws on Discord failure — callers decide how tolerant to be.
 * Without role config (env) it is a no-op returning the stored role.
 */
export async function syncRole(
  userId: string,
  discordId: string | null,
): Promise<Role> {
  const config = roleConfig();
  if (!config) {
    return (await readStored(userId))?.role ?? "player";
  }

  const member = discordId
    ? await fetchGuildMember(config.guildId, discordId)
    : null;
  const role = deriveRole(member?.roles ?? null, config.roleIds);

  const roleSyncedAt = new Date();
  await db
    .insert(profiles)
    .values({ userId, role, roleSyncedAt })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { role, roleSyncedAt },
    });

  return role;
}

/**
 * The only way to read a user's role: returns the stored role, re-syncing
 * from Discord first when it is older than the TTL. Revocations on Discord
 * therefore take effect within the TTL. If Discord is unreachable, the
 * stale role is used (availability over freshness in a small window).
 */
export async function getRole(
  userId: string,
  discordId: string | null,
): Promise<Role> {
  const stored = await readStored(userId);
  if (stored && !isRoleStale(stored.roleSyncedAt, new Date())) {
    return stored.role;
  }

  try {
    return await syncRole(userId, discordId);
  } catch (error) {
    console.error("Role sync failed, using stored role:", error);
    return stored?.role ?? "player";
  }
}
