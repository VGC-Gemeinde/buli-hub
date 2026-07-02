// Discord REST API client (server-only — the bot token must never reach
// client code). No bot process: the backend calls the API directly.

const API_BASE = "https://discord.com/api/v10";

export type GuildMember = {
  roles: string[];
};

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

  const member = (await response.json()) as { roles?: unknown };
  return {
    roles: Array.isArray(member.roles)
      ? member.roles.filter((role): role is string => typeof role === "string")
      : [],
  };
}
