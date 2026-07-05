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

function botToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set (see .env.example)");
  }
  return token;
}

// Non-2xx responses are returned as typed outcomes (the caller decides —
// e.g. a 404 on edit means the message was deleted on Discord and can be
// re-posted); network failures still throw.
export type DiscordCallResult = { ok: true } | { ok: false; status: number };

// Posts a plain-content message; returns its id so later edits/deletes can
// target it. Mentions are never resolved — a player name containing
// @everyone must not ping the server.
export async function postChannelMessage(
  channelId: string,
  content: string,
): Promise<{ ok: true; messageId: string } | { ok: false; status: number }> {
  const response = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const message = (await response.json()) as { id?: unknown };
  const messageId = asString(message.id);
  return messageId ? { ok: true, messageId } : { ok: false, status: 500 };
}

export async function editChannelMessage(
  channelId: string,
  messageId: string,
  content: string,
): Promise<DiscordCallResult> {
  const response = await fetch(
    `${API_BASE}/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    },
  );
  return response.ok ? { ok: true } : { ok: false, status: response.status };
}

export async function deleteChannelMessage(
  channelId: string,
  messageId: string,
): Promise<DiscordCallResult> {
  const response = await fetch(
    `${API_BASE}/channels/${channelId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bot ${botToken()}` },
    },
  );
  return response.ok ? { ok: true } : { ok: false, status: response.status };
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
