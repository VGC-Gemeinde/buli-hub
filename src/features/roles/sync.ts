import { eq } from "drizzle-orm";
import { profiles } from "@/db/schema";
import type { DiscordIdentity } from "@/features/auth/identity";
import { db } from "@/lib/db";
import { fetchGuildMember } from "@/lib/discord";
import { roleConfig } from "./config";
import { guildIdentity } from "./identity";
import { deriveRole, isRoleStale, type Role } from "./roles";

export type StoredMember = {
  role: Role;
  roleSyncedAt: Date | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

async function readStored(userId: string): Promise<StoredMember | null> {
  const row = await db.query.profiles.findFirst({
    columns: {
      role: true,
      roleSyncedAt: true,
      displayName: true,
      username: true,
      avatarUrl: true,
    },
    where: eq(profiles.userId, userId),
  });
  return row ?? null;
}

/**
 * Fetches the user's guild member from Discord and stores the derived role
 * and server identity (nickname, username, avatar). Throws on Discord
 * failure — callers decide how tolerant to be. Without role config (env) it
 * is a no-op returning the stored role.
 */
export async function syncMember(
  userId: string,
  identity: DiscordIdentity,
): Promise<Role> {
  const config = roleConfig();
  if (!config) {
    return (await readStored(userId))?.role ?? "player";
  }

  const member = identity.discordId
    ? await fetchGuildMember(config.guildId, identity.discordId)
    : null;
  // Only a real lookup may write the membership flag: without a discordId,
  // member === null means "could not check", not "not a member". A thrown
  // fetch never reaches the upsert, so an API error leaves it untouched too —
  // a confirmed 404 is the only thing that ever writes false.
  const membership = identity.discordId
    ? { guildMember: member !== null, guildMemberCheckedAt: new Date() }
    : {};
  const role = deriveRole(member?.roles ?? null, config.roleIds);
  const stored = guildIdentity(config.guildId, member, {
    displayName: identity.displayName,
    username: identity.username,
    avatarUrl: identity.avatarUrl,
  });

  const roleSyncedAt = new Date();
  await db
    .insert(profiles)
    .values({ userId, role, roleSyncedAt, ...stored, ...membership })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { role, roleSyncedAt, ...stored, ...membership },
    });

  return role;
}

/**
 * The only way to read a user's role: returns the stored role, re-syncing
 * from Discord first when it is older than the TTL. Revocations on Discord
 * therefore take effect within the TTL. If Discord is unreachable, the
 * stale role is used (availability over freshness in a small window). The
 * same sync refreshes the stored identity.
 */
export async function getRole(
  userId: string,
  identity: DiscordIdentity,
): Promise<Role> {
  const stored = await readStored(userId);
  if (stored && !isRoleStale(stored.roleSyncedAt, new Date())) {
    return stored.role;
  }

  try {
    return await syncMember(userId, identity);
  } catch (error) {
    console.error("Member sync failed, using stored role:", error);
    return stored?.role ?? "player";
  }
}
