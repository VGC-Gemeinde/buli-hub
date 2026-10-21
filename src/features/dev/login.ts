import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { bans, profiles, users } from "@/db/schema";
import { createSession } from "@/features/auth/sessions";
import { findOrCreateUserByDiscordId } from "@/features/auth/users";
import { sessionCookie } from "@/lib/auth/cookie-options";
import { db } from "@/lib/db";
import { ensurePersonaFavorites } from "./favorites-persona";
import { getPersona, type Persona } from "./personas";

export type DevLoginResult = { ok: true } | { ok: false; error: string };

/**
 * Signs the current browser in as an existing account: a session row and its
 * cookie, exactly what a real sign-in ends with (specs/004-google-cloud-migration).
 * Shared by persona login and by impersonation of a cloned production user.
 * Only reachable through the /dev route handlers, each gated by
 * devToolsEnabled().
 */
export async function establishSession(
  userId: string,
): Promise<DevLoginResult> {
  const account = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.id, userId),
  });
  if (!account) {
    return { ok: false, error: `Kein Nutzer mit der ID ${userId}` };
  }
  const token = await createSession(userId);
  const cookie = sessionCookie();
  (await cookies()).set(cookie.name, token, cookie.options);
  return { ok: true };
}

// Signs the current browser in as a test persona: find or create the account
// by the persona's (fake) Discord id, pin its profile, then start a session.
// Only reachable through /dev/login, which is gated by devToolsEnabled().
export async function loginAsPersona(
  personaId: string,
): Promise<DevLoginResult> {
  const persona = getPersona(personaId);
  if (!persona) {
    return { ok: false, error: `Unbekannte Persona: ${personaId}` };
  }

  const userId = await findOrCreateUserByDiscordId(persona.discordId);
  await pinPersonaProfile(userId, persona);
  return establishSession(userId);
}

// Personas have fake Discord ids, so their role and identity cannot come from
// a real guild lookup — write them directly and date the sync far into the
// future so getRole's TTL revalidation never overwrites them.
async function pinPersonaProfile(userId: string, persona: Persona) {
  const farFuture = new Date("2100-01-01T00:00:00Z");
  const values = {
    role: persona.role,
    roleSyncedAt: farFuture,
    // Membership is pinned the same way (the far-future sync date keeps the
    // TTL revalidation from ever overwriting it). null = never confirmed,
    // so no checked-at either.
    guildMember: persona.guildMember,
    guildMemberCheckedAt: persona.guildMember === null ? null : new Date(),
    ...persona.identity,
  };
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });

  if (persona.banned) {
    // Idempotent: the partial unique index keeps it to one active ban.
    await db
      .insert(bans)
      .values({
        discordId: persona.discordId,
        discordName: persona.identity.displayName,
        reason: "Dev-Persona: gesperrt, um die gesperrte Anmeldung zu sehen.",
      })
      .onConflictDoNothing();
  }

  if (persona.favorites) {
    await ensurePersonaFavorites(userId);
  }
}
