import { eq } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import type { ProfileSettings } from "./settings";

export async function getProfile(userId: string) {
  return (
    (await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    })) ?? null
  );
}

export async function upsertProfile(userId: string, settings: ProfileSettings) {
  const now = new Date();
  // settingsEditedAt marks that the owner actively saved settings — it drives
  // the registration profile-hint and, unlike updatedAt, is never touched by
  // the identity sync.
  await db
    .insert(profiles)
    .values({ userId, ...settings, updatedAt: now, settingsEditedAt: now })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...settings, updatedAt: now, settingsEditedAt: now },
    });
}
