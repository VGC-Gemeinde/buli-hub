"use server";

import { revalidatePath } from "next/cache";
import { banBlock } from "@/features/bans/bans";
import { isBanned } from "@/features/bans/queries";
import { membershipBlock } from "@/features/membership/membership";
import {
  clearAcceptance,
  recordAcceptance,
} from "@/features/regelwerk/queries";
import { currentUser } from "@/features/roles/guard";
import { latestWindow } from "@/features/staff/queries";
import { registrationState } from "@/features/staff/registration-window";
import { createClient } from "@/lib/supabase/server";
import {
  createRegistration,
  deleteRegistration,
  dismissProfileHint,
  getRegistration,
  priorRegistrationCount,
} from "./queries";
import {
  parseRegistration,
  type RegistrationDraft,
  type RegistrationFieldErrors,
} from "./registration";

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: RegistrationFieldErrors };

export type RegisterInput = RegistrationDraft;

export async function register(input: unknown): Promise<RegisterResult> {
  // currentUser rather than the bare Supabase session: it runs the role sync
  // when stale, so the membership flag checked below is at most TTL-old.
  const current = await currentUser();
  if (!current) {
    return { ok: false, error: "Nicht angemeldet" };
  }
  const userId = current.userId;

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "open") {
    return { ok: false, error: "Die Anmeldung ist nicht geöffnet" };
  }

  if (await getRegistration(window.id, userId)) {
    return { ok: false, error: "Du bist bereits angemeldet" };
  }

  // Confirmed non-members cannot register; unknown fails open by design
  // (membershipBlock only fires on a stored false).
  const blocked = membershipBlock(current.guildMember);
  if (blocked) {
    return blocked;
  }
  // The Banliste (docs/plans/banlist.md): a banned account cannot register.
  const banned = banBlock(await isBanned(current.discordId));
  if (banned) {
    return banned;
  }

  // Detection is server-side — never trust the client on returning status.
  const detectedReturning =
    (await priorRegistrationCount(window.id, userId)) > 0;
  const parsed = parseRegistration(input, detectedReturning);
  if (!parsed.ok) {
    return parsed;
  }

  await createRegistration({
    windowId: window.id,
    userId,
    ...parsed.values,
  });

  // Registering means accepting: `validateRegistration` rejects a draft whose
  // Regelwerk tick is missing, so anyone who gets here has agreed. Recording
  // it now is what makes "since when" answerable for the whole field, rather
  // than only for the players who later opened a prompt.
  await recordAcceptance(window.id, userId);

  revalidatePath("/anmeldung");
  revalidatePath("/staff");
  revalidatePath("/regelwerk");
  return { ok: true };
}

export async function dismissRegistrationHint(): Promise<RegisterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }
  await dismissProfileHint(user.id);
  // The hint appears on both surfaces; drop the cached HTML for each.
  revalidatePath("/anmeldung");
  revalidatePath("/spieler");
  return { ok: true };
}

export async function withdraw(): Promise<RegisterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const window = await latestWindow();
  if (!window || registrationState(window, new Date()) !== "open") {
    return { ok: false, error: "Die Anmeldung ist nicht geöffnet" };
  }

  await deleteRegistration(window.id, user.id);
  // The acceptance goes with it. It was given as part of registering, so
  // leaving it behind would mean someone who is not in the season still counts
  // as having agreed to its rules — and a later re-registration would silently
  // reuse the old agreement instead of asking again.
  await clearAcceptance(window.id, user.id);

  revalidatePath("/anmeldung");
  revalidatePath("/staff");
  revalidatePath("/regelwerk");
  return { ok: true };
}
