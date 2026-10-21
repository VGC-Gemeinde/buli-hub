import { sql } from "drizzle-orm";
import { profiles, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { DiscordIdentity } from "./identity";

// Accounts by Discord id (specs/004-google-cloud-migration, data-model.md).
// A sign-in finds its account by the Discord id alone, never by name.

// The account for this Discord user, created on the first sign-in. One
// statement, so two sign-ins racing for the same new Discord id end up with
// one row: the loser's insert turns into an update of the winner's.
export async function findOrCreateUserByDiscordId(
  discordId: string,
): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ discordId })
    .onConflictDoUpdate({
      target: users.discordId,
      set: { discordId: sql`excluded.discord_id` },
    })
    .returning({ id: users.id });
  return row.id;
}

// Gives a first-time account the Discord identity from the sign-in, so it has
// a name and avatar even when the guild sync could not run (no role config
// locally, Discord unreachable). Never overwrites: once the sync has written
// the server identity, that one wins, as it did before the move.
export async function rememberSignInIdentity(
  userId: string,
  identity: DiscordIdentity,
): Promise<void> {
  await db
    .insert(profiles)
    .values({
      userId,
      displayName: identity.displayName,
      username: identity.username,
      avatarUrl: identity.avatarUrl,
    })
    .onConflictDoNothing({ target: profiles.userId });
}
