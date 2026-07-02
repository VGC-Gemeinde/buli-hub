// Discord REST API client (server-only — the bot token must never reach
// client code). No bot process: the backend calls the API directly.

const API_BASE = "https://discord.com/api/v10";
const CDN_BASE = "https://cdn.discordapp.com";

export type GuildMember = {
  roles: string[];
  // Server-specific nickname, null if the member has none.
  nick: string | null;
  // Server-specific avatar hash, null if the member uses their global one.
  avatar: string | null;
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function avatarExt(hash: string): string {
  return hash.startsWith("a_") ? "gif" : "png";
}

// Resolves the avatar URL, preferring the guild-specific avatar over the
// global one. Returns null when the user has neither (→ initials fallback).
export function memberAvatarUrl(
  guildId: string,
  member: GuildMember,
): string | null {
  if (member.avatar) {
    return `${CDN_BASE}/guilds/${guildId}/users/${member.user.id}/avatars/${member.avatar}.${avatarExt(member.avatar)}`;
  }
  if (member.user.avatar) {
    return `${CDN_BASE}/avatars/${member.user.id}/${member.user.avatar}.${avatarExt(member.user.avatar)}`;
  }
  return null;
}

/**
 * Fetches a guild member by Discord user id.
 * Returns null when the user is not a member of the guild.
 */
export async function fetchGuildMember(
  guildId: string,
  discordUserId: string,
): Promise<GuildMember | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set (see .env.example)");
  }

  const response = await fetch(
    `${API_BASE}/guilds/${guildId}/members/${discordUserId}`,
    {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Discord API ${response.status}: ${await response.text()}`);
  }

  const member = (await response.json()) as {
    roles?: unknown;
    nick?: unknown;
    avatar?: unknown;
    user?: {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
      avatar?: unknown;
    };
  };

  return {
    roles: Array.isArray(member.roles)
      ? member.roles.filter((role): role is string => typeof role === "string")
      : [],
    nick: asString(member.nick),
    avatar: asString(member.avatar),
    user: {
      id: asString(member.user?.id) ?? "",
      username: asString(member.user?.username) ?? "",
      globalName: asString(member.user?.global_name),
      avatar: asString(member.user?.avatar),
    },
  };
}
