import {
  createClient as createSupabaseAdmin,
  type User,
} from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getPersona, type Persona, personaToAdminPayload } from "./personas";

export type DevLoginResult = { ok: true } | { ok: false; error: string };

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

function adminClient():
  | { ok: true; client: AdminClient }
  | { ok: false; error: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY sind nicht gesetzt",
    };
  }
  return {
    ok: true,
    client: createSupabaseAdmin(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

/**
 * Signs the current browser session in as an existing auth user: an admin
 * magic link, verified server-side, so no email is ever sent. Shared by
 * persona login and by impersonation of a cloned production user.
 */
export async function establishSession(email: string): Promise<DevLoginResult> {
  const admin = adminClient();
  if (!admin.ok) {
    return admin;
  }

  const { data, error: linkError } = await admin.client.auth.admin.generateLink(
    {
      type: "magiclink",
      email,
    },
  );
  if (linkError) {
    return { ok: false, error: linkError.message };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) {
    return { ok: false, error: verifyError.message };
  }

  return { ok: true };
}

// Signs the current browser session in as a test persona: create-or-update the
// auth user, then establish a session for it. Only reachable through
// /dev/login, which is gated by devToolsEnabled().
export async function loginAsPersona(
  personaId: string,
): Promise<DevLoginResult> {
  const persona = getPersona(personaId);
  if (!persona) {
    return { ok: false, error: `Unbekannte Persona: ${personaId}` };
  }

  const admin = adminClient();
  if (!admin.ok) {
    return admin;
  }

  const payload = personaToAdminPayload(persona);
  const { error: createError } =
    await admin.client.auth.admin.createUser(payload);
  if (createError) {
    // The persona already exists from an earlier login — refresh its
    // metadata so persona edits take effect without wiping its profile row.
    const rows = await db.execute<{ id: string }>(
      sql`select id from auth.users where email = ${payload.email}`,
    );
    const existingId = rows[0]?.id;
    if (!existingId) {
      return { ok: false, error: createError.message };
    }
    const { error: updateError } = await admin.client.auth.admin.updateUserById(
      existingId,
      { user_metadata: payload.user_metadata },
    );
    if (updateError) {
      return { ok: false, error: updateError.message };
    }
  }

  const session = await establishSession(payload.email);
  if (!session.ok) {
    return session;
  }

  await pinPersonaProfile(payload.email, persona);

  return { ok: true };
}

// Personas have fake Discord ids, so their role and identity cannot come from
// a real guild lookup — write them directly and date the sync far into the
// future so getRole's TTL revalidation never overwrites them. Identity is
// derived from the persona metadata via the same mapper as a real session.
async function pinPersonaProfile(email: string, persona: Persona) {
  const rows = await db.execute<{ id: string }>(
    sql`select id from auth.users where email = ${email}`,
  );
  const userId = rows[0]?.id;
  if (!userId) {
    return;
  }
  const identity = discordIdentityFromUser({
    user_metadata: persona.userMetadata,
  } as User);
  const farFuture = new Date("2100-01-01T00:00:00Z");
  const values = {
    role: persona.role,
    roleSyncedAt: farFuture,
    displayName: identity.displayName,
    username: identity.username,
    avatarUrl: identity.avatarUrl,
  };
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}
