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
  const updatedAt = new Date();
  await db
    .insert(profiles)
    .values({ userId, ...settings, updatedAt })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { ...settings, updatedAt },
    });
}
