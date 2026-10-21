import { eq } from "drizzle-orm";
import { cache } from "react";
import { profiles } from "@/db/schema";
import { currentSession } from "@/features/auth/current-session";
import { maintenanceMode } from "@/features/maintenance/mode";
import { db } from "@/lib/db";
import { isRoleStale, type Role, roleAtLeast } from "./roles";
import { getRole } from "./sync";

export type CurrentUser = {
  userId: string;
  discordId: string | null;
  role: Role;
  // Stored guild identity (written by the member sync, or from the sign-in
  // when the sync could not run).
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  // Tri-state guild membership from the profile row: null = never confirmed,
  // false = Discord confirmed the account is not on the server. Consumers
  // must fail open on null (see features/membership/membership.ts).
  guildMember: boolean | null;
};

// Resolves the signed-in user's role (TTL-revalidated) and stored guild
// identity, or null if not signed in. The single read path for page/layout
// role and identity checks.
//
// Memoized per request: header, footer and page all ask for the current user,
// and without this each one would repeat the session lookup and the role
// sync. The cache lives exactly one request, so a role change still takes
// effect on the next one.
export const currentUser = cache(
  async function currentUser(): Promise<CurrentUser | null> {
    // During maintenance the database is being moved: nobody is signed in,
    // and the legal pages render without a single query
    // (contracts/maintenance.md).
    if (maintenanceMode()) {
      return null;
    }
    const session = await currentSession();
    if (!session) {
      return null;
    }
    const { userId, discordId } = session;

    const before = await storedIdentity(userId);
    // getRole runs the sync when the role is stale; the sync refreshes the
    // stored identity from the guild member and falls back to the identity
    // passed here, so a non-member keeps the names they have. Only then is
    // the profile read again.
    const role = await getRole(userId, {
      discordId,
      displayName: before?.displayName ?? null,
      username: before?.username ?? null,
      avatarUrl: before?.avatarUrl ?? null,
    });
    const stored =
      before && !isRoleStale(before.roleSyncedAt, new Date())
        ? before
        : await storedIdentity(userId);

    return {
      userId,
      discordId,
      role,
      displayName: stored?.displayName ?? null,
      username: stored?.username ?? null,
      avatarUrl: stored?.avatarUrl ?? null,
      guildMember: stored?.guildMember ?? null,
    };
  },
);

function storedIdentity(userId: string) {
  return db.query.profiles.findFirst({
    columns: {
      displayName: true,
      username: true,
      avatarUrl: true,
      guildMember: true,
      roleSyncedAt: true,
    },
    where: eq(profiles.userId, userId),
  });
}

export async function hasRoleAtLeast(minimum: Role): Promise<boolean> {
  const current = await currentUser();
  return current !== null && roleAtLeast(current.role, minimum);
}
