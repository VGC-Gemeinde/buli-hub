import { type GuildMember, memberAvatarUrl } from "@/lib/discord";

// The stored identity shown for a user, resolved from their guild membership.
export type StoredIdentity = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

// Fallback identity from the current user's session (JWT), used when the
// user is not a guild member.
export type FallbackIdentity = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

/**
 * Resolves the identity to store for a user. Prefers the guild member's
 * server-specific values (nickname → global name → username; guild avatar →
 * global avatar), and falls back to the session identity when the user is
 * not a member of the guild.
 */
export function guildIdentity(
  guildId: string,
  member: GuildMember | null,
  fallback: FallbackIdentity,
): StoredIdentity {
  if (member === null) {
    return {
      displayName: fallback.displayName,
      username: fallback.username,
      avatarUrl: fallback.avatarUrl,
    };
  }

  return {
    displayName:
      member.nick ?? member.user.globalName ?? (member.user.username || null),
    username: member.user.username || null,
    avatarUrl: memberAvatarUrl(guildId, member),
  };
}
