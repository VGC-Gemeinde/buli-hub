import type { RoleIdMapping } from "./roles";

export type RoleConfig = {
  guildId: string;
  roleIds: RoleIdMapping;
};

// Returns null when any part of the mapping is missing — callers then skip
// the sync entirely, so local development works without Discord config.
export function roleConfig(): RoleConfig | null {
  const guildId = process.env.DISCORD_GUILD_ID;
  const dev = process.env.DISCORD_ROLE_ID_DEV;
  const admin = process.env.DISCORD_ROLE_ID_ADMIN;
  const staff = process.env.DISCORD_ROLE_ID_STAFF;
  if (!guildId || !dev || !admin || !staff) {
    return null;
  }
  return { guildId, roleIds: { dev, admin, staff } };
}
