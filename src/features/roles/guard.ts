import { discordIdentityFromUser } from "@/features/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { type Role, roleAtLeast } from "./roles";
import { getRole } from "./sync";

export type CurrentUserRole = {
  userId: string;
  discordId: string | null;
  role: Role;
};

// Resolves the signed-in user's (TTL-revalidated) role, or null if not
// signed in. The single read path for page/layout role checks.
export async function currentUserRole(): Promise<CurrentUserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const identity = discordIdentityFromUser(user);
  const role = await getRole(user.id, identity.discordId);
  return { userId: user.id, discordId: identity.discordId, role };
}

export async function hasRoleAtLeast(minimum: Role): Promise<boolean> {
  const current = await currentUserRole();
  return current !== null && roleAtLeast(current.role, minimum);
}
