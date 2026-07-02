import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createWindow, latestWindow } from "./queries";

// Integration test against the local Supabase Postgres (stack must be
// running). registration_windows.opened_by has an FK to auth.users, so the
// test creates its own user and cleans up afterwards.
const userId = randomUUID();

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where opened_by = ${userId}`,
  );
  await db.execute(sql`delete from auth.users where id = ${userId}`);
});

describe("registration windows", () => {
  it("returns null when none exist", async () => {
    await db.execute(sql`insert into auth.users (id) values (${userId})`);
    expect(await latestWindow()).toBeNull();
  });

  it("creates and reads back the latest window", async () => {
    const closesAt = new Date("2026-08-01T18:00:00Z");
    await createWindow(closesAt, userId);

    const window = await latestWindow();
    expect(window).not.toBeNull();
    expect(window?.closesAt).toEqual(closesAt);
    expect(window?.openedBy).toBe(userId);
  });
});
