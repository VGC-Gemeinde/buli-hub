// Pure half of the impersonation tooling: the row shape and the search the
// picker runs over it. No database access, so the client component can import
// it directly.

import type { Role } from "@/features/roles/roles";
import { divisionName, subDivisionName } from "@/features/seeding/seeding";

export type ImpersonatableUser = {
  userId: string;
  displayName: string | null;
  username: string | null;
  role: Role;
  /** "Division 1a" for the latest season, or null when unplaced. */
  division: string | null;
  dropped: boolean;
};

/** "Division 1" before groups exist, "Division 1a" once they do. */
export function divisionLabel(
  tier: number | null,
  position: number | null,
): string | null {
  if (tier === null) {
    return null;
  }
  return position === null
    ? divisionName(tier)
    : subDivisionName(tier, position);
}

/**
 * Substring search across the fields the picker shows. Case- and
 * diacritic-insensitive, so "Jorg" finds "Jörg" — with cloned data you are
 * usually typing a name you half-remember from Discord.
 */
export function filterUsers(
  users: readonly ImpersonatableUser[],
  query: string,
): ImpersonatableUser[] {
  const needle = normalise(query);
  if (needle.length === 0) {
    return [...users];
  }

  return users.filter((user) =>
    [user.displayName, user.username, user.division, user.role, user.userId]
      .filter((field): field is string => field !== null)
      .some((field) => normalise(field).includes(needle)),
  );
}

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
