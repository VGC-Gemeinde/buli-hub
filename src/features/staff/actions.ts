"use server";

import { revalidatePath } from "next/cache";
import { discordIdentityFromUser } from "@/features/auth/identity";
import { roleAtLeast } from "@/features/roles/roles";
import { getRole } from "@/features/roles/sync";
import { createClient } from "@/lib/supabase/server";
import { createWindow, latestWindow } from "./queries";
import {
  openRegistrationSchema,
  seasonNumberSchema,
} from "./registration-window";

export type OpenRegistrationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function openRegistration(input: {
  closesAt: string;
  seasonNumber?: unknown;
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
  const latest = await latestWindow();
  if (latest !== null) {
    return { ok: false, error: "Die Anmeldung wurde bereits geöffnet" };
  }

  // The season number is chosen once, for the first window on the system. Every
  // later window (once the seasons feature allows opening one) takes the previous
  // number + 1 and is never editable.
  const number =
    latest === null ? seasonNumberSchema.safeParse(input.seasonNumber) : null;
  if (number && !number.success) {
    return {
      ok: false,
      error: number.error.issues[0]?.message ?? "Ungültige Saison",
    };
  }
  const seasonNumber = number?.success
    ? number.data
    : // biome-ignore lint/style/noNonNullAssertion: latest is non-null here
      latest!.seasonNumber + 1;

  await createWindow(parsed.data.closesAt, user.id, seasonNumber);
  revalidatePath("/staff");
  return { ok: true };
}
