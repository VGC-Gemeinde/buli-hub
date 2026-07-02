import { eq } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { type Role, roleAtLeast } from "./roles";
import { getRole } from "./sync";

export type CurrentUser = {
  userId: string;
  discordId: string | null;
  role: Role;
  // Stored guild identity, falling back to the session identity while a row
  // has not been synced yet.
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

// Resolves the signed-in user's role (TTL-revalidated) and stored guild
// identity, or null if not signed in. The single read path for page/layout
// role and identity checks.
export async function currentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const identity = discordIdentityFromUser(user);
  // getRole runs the sync when stale, so the stored identity read below is
  // fresh.
  const role = await getRole(user.id, identity);
  const stored = await db.query.profiles.findFirst({
    columns: { displayName: true, username: true, avatarUrl: true },
    where: eq(profiles.userId, user.id),
  });

  return {
    userId: user.id,
    discordId: identity.discordId,
    role,
    displayName: stored?.displayName ?? identity.displayName,
    username: stored?.username ?? identity.username,
    avatarUrl: stored?.avatarUrl ?? identity.avatarUrl,
  };
}

export async function hasRoleAtLeast(minimum: Role): Promise<boolean> {
  const current = await currentUser();
  return current !== null && roleAtLeast(current.role, minimum);
}
