import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
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
    });

    const profile = await getProfile(userId);
    expect(profile).not.toBeNull();
    expect(profile?.twitterHandle).toBe("kuro_vgc");
    expect(profile?.blueskyHandle).toBeNull();
    expect(profile?.origin).toBe("Bayern");
  });

  it("updates on second save and bumps updated_at", async () => {
    const before = await getProfile(userId);

    await upsertProfile(userId, {
      twitterHandle: "kuro_vgc",
      blueskyHandle: "kuro.bsky.social",
      origin: "Südtirol",
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
