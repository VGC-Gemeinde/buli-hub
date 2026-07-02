"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "./queries";
import { profileSettingsSchema } from "./settings";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(
  input: unknown,
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const parsed = profileSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe" };
  }

  await upsertProfile(user.id, parsed.data);
  return { ok: true };
}
