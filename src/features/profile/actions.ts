"use server";

import { currentUser } from "@/features/roles/guard";
import { upsertProfile } from "./queries";
import { profileSettingsSchema } from "./settings";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(
  input: unknown,
): Promise<UpdateProfileResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet" };
  }

  const parsed = profileSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe" };
  }

  await upsertProfile(user.userId, parsed.data);
  return { ok: true };
}
