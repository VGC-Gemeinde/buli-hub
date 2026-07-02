import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getPersona, type Persona, personaToAdminPayload } from "./personas";

export type DevLoginResult = { ok: true } | { ok: false; error: string };

// Signs the current browser session in as a test persona against the LOCAL
// Supabase stack: create-or-update the auth user, then establish a real
// session via an admin magic link verified server-side (no email involved).
// Only reachable through /dev/login, which is development-gated.
export async function loginAsPersona(
  personaId: string,
): Promise<DevLoginResult> {
  const persona = getPersona(personaId);
  if (!persona) {
    return { ok: false, error: `Unbekannte Persona: ${personaId}` };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY sind nicht gesetzt",
    };
  }

  const admin = createSupabaseAdmin(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const payload = personaToAdminPayload(persona);
  const { error: createError } = await admin.auth.admin.createUser(payload);
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
    const { error: updateError } = await admin.auth.admin.updateUserById(
      existingId,
      { user_metadata: payload.user_metadata },
    );
    if (updateError) {
      return { ok: false, error: updateError.message };
    }
  }

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: payload.email,
  });
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

  await pinPersonaRole(payload.email, persona.role);

  return { ok: true };
}

// Personas have fake Discord ids, so their roles cannot come from a real
// guild lookup — write the role directly and date the sync far into the
// future so getRole's TTL revalidation never overwrites it.
async function pinPersonaRole(email: string, role: Persona["role"]) {
  const rows = await db.execute<{ id: string }>(
    sql`select id from auth.users where email = ${email}`,
  );
  const userId = rows[0]?.id;
  if (!userId) {
    return;
  }
  const farFuture = new Date("2100-01-01T00:00:00Z");
  await db
    .insert(profiles)
    .values({ userId, role, roleSyncedAt: farFuture })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { role, roleSyncedAt: farFuture },
    });
}
