import type { roleEnum } from "@/db/schema";

export type Role = (typeof roleEnum.enumValues)[number];

export type RoleIdMapping = {
  dev: string;
  admin: string;
  // Any of these Discord roles grants `staff` — the league staff role plus
  // other trusted teams (e.g. the MOTW-Team) that get the same access.
  staff: readonly string[];
};

// How long a stored role is trusted before it is re-synced from Discord.
export const ROLE_SYNC_TTL_MS = 5 * 60 * 1000;

/**
 * Derives the app role from a guild member's Discord role ids.
 * `null` means the user is not a member of the guild at all.
 * The highest configured role wins; members without any mapped role — and
 * non-members — are players.
 */
export function deriveRole(
  memberRoleIds: readonly string[] | null,
  mapping: RoleIdMapping,
): Role {
  if (memberRoleIds === null) {
    return "player";
  }
  const ids = new Set(memberRoleIds);
  if (ids.has(mapping.dev)) {
    return "dev";
  }
  if (ids.has(mapping.admin)) {
    return "admin";
  }
  if (mapping.staff.some((id) => ids.has(id))) {
    return "staff";
  }
  return "player";
}

const ROLE_ORDER: Record<Role, number> = {
  dev: 3,
  admin: 2,
  staff: 1,
  player: 0,
};

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[minimum];
}

export function isRoleStale(syncedAt: Date | null, now: Date): boolean {
  if (syncedAt === null) {
    return true;
  }
  return now.getTime() - syncedAt.getTime() > ROLE_SYNC_TTL_MS;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "dev":
      return "Dev";
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
    case "player":
      return "Spieler";
  }
}
