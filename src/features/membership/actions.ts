"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { profiles } from "@/db/schema";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { syncMember } from "@/features/roles/sync";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { RECHECK_FAILED } from "./membership";

export type RecheckResult =
  | { ok: true; member: boolean | null }
  | { ok: false; error: string };

/**
 * Forces a membership re-sync for the signed-in user, bypassing the role
 * sync's TTL — the whole point is un-gating a player seconds after they
 * joined the server, not five minutes later. No rate limiting: the action
 * needs a session and costs one Discord API call per click, far below the
 * bot's rate limits.
 */
export async function recheckMembership(): Promise<RecheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  try {
    await syncMember(user.id, discordIdentityFromUser(user));
  } catch {
    // A failed sync never clears a stored false — an outage is not a rejoin.
    return { ok: false, error: RECHECK_FAILED };
  }

  const stored = await db.query.profiles.findFirst({
    columns: { guildMember: true },
    where: eq(profiles.userId, user.id),
  });

  // The gate and the blocked card are server state on these routes.
  revalidatePath("/anmeldung");
  revalidatePath("/spieler");
  revalidatePath("/match/[matchId]", "page");
  return { ok: true, member: stored?.guildMember ?? null };
}
