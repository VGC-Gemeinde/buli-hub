"use server";

import { revalidatePath } from "next/cache";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { roleAtLeast } from "@/features/roles/roles";
import { getRole } from "@/features/roles/sync";
import { createClient } from "@/lib/supabase/server";
import { createWindow, latestWindow } from "./queries";
import { openRegistrationSchema } from "./registration-window";

export type OpenRegistrationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function openRegistration(input: {
  closesAt: string;
}): Promise<OpenRegistrationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  // Never trust UI gating: re-check the role in the action.
  const role = await getRole(user.id, discordIdentityFromUser(user));
  if (!roleAtLeast(role, "staff")) {
    return { ok: false, error: "Keine Berechtigung" };
  }

  const parsed = openRegistrationSchema(new Date()).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    };
  }

  // A registration window is opened at most once (reopening belongs to the
  // seasons feature).
  if ((await latestWindow()) !== null) {
    return { ok: false, error: "Die Anmeldung wurde bereits geöffnet" };
  }

  await createWindow(parsed.data.closesAt, user.id);
  revalidatePath("/staff");
  return { ok: true };
}
