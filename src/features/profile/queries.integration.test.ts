import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { getProfile, upsertProfile } from "./queries";

// Integration test against the local Supabase Postgres (stack must be
// running). Creates its own auth user (profiles.user_id has an FK to
// auth.users) and cleans up after itself — the cascade removes the profile.
const userId = randomUUID();

afterAll(async () => {
  await db.execute(sql`delete from auth.users where id = ${userId}`);
});

describe("profile upsert", () => {
  it("returns null for a user without a profile", async () => {
    await db.execute(sql`insert into auth.users (id) values (${userId})`);
    expect(await getProfile(userId)).toBeNull();
  });

  it("inserts on first save", async () => {
    await upsertProfile(userId, {
      twitterHandle: "kuro_vgc",
      blueskyHandle: null,
      origin: "Bayern",
      hasCaptureCard: false,
    });

    const profile = await getProfile(userId);
    expect(profile).not.toBeNull();
    expect(profile?.twitterHandle).toBe("kuro_vgc");
    expect(profile?.blueskyHandle).toBeNull();
    expect(profile?.origin).toBe("Bayern");
    expect(profile?.role).toBe("player");
    expect(profile?.roleSyncedAt).toBeNull();
  });

  it("settings upsert never touches the server-managed columns", async () => {
    const syncedAt = new Date("2026-07-02T10:00:00Z");
    await db
      .update(profiles)
      .set({
        role: "admin",
        roleSyncedAt: syncedAt,
        displayName: "Alex | Team Rocket",
        username: "alexk",
        avatarUrl: "https://cdn.discordapp.com/avatars/1/x.png",
      })
      .where(eq(profiles.userId, userId));

    await upsertProfile(userId, {
      twitterHandle: "kuro_vgc",
      blueskyHandle: null,
      origin: "Bayern",
      hasCaptureCard: false,
    });

    const profile = await getProfile(userId);
    expect(profile?.role).toBe("admin");
    expect(profile?.roleSyncedAt).toEqual(syncedAt);
    expect(profile?.displayName).toBe("Alex | Team Rocket");
    expect(profile?.username).toBe("alexk");
    expect(profile?.avatarUrl).toBe(
      "https://cdn.discordapp.com/avatars/1/x.png",
    );
  });

  it("a server-managed identity write never touches the settings columns", async () => {
    // Mirrors the syncMember upsert: only role + identity columns.
    await db
      .insert(profiles)
      .values({ userId, role: "staff", displayName: "Neuer Name" })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { role: "staff", displayName: "Neuer Name" },
      });

    const profile = await getProfile(userId);
    expect(profile?.displayName).toBe("Neuer Name");
    expect(profile?.role).toBe("staff");
    // Settings from the previous test survive.
    expect(profile?.twitterHandle).toBe("kuro_vgc");
    expect(profile?.origin).toBe("Bayern");
  });

  it("updates on second save and bumps updated_at", async () => {
    const before = await getProfile(userId);

    await upsertProfile(userId, {
      twitterHandle: "kuro_vgc",
      blueskyHandle: "kuro.bsky.social",
      origin: "Südtirol",
      hasCaptureCard: false,
    });

    const after = await getProfile(userId);
    expect(after?.blueskyHandle).toBe("kuro.bsky.social");
    expect(after?.origin).toBe("Südtirol");
    expect(after?.createdAt).toEqual(before?.createdAt);
    expect(after?.updatedAt.getTime()).toBeGreaterThan(
      before?.updatedAt.getTime() ?? Number.POSITIVE_INFINITY,
    );
  });
});
