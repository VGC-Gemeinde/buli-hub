import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWindow, latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { getSeeding, listDivisions, saveSeedingConfig } from "./queries";

// Integration test against local Postgres. seedings/divisions FK to the
// registration window; the test owns that window.
const userId = randomUUID();
let windowId: string;

beforeAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(sql`insert into auth.users (id) values (${userId})`);
  await createWindow(new Date("2026-08-31T18:00:00Z"), userId);
  const window = await latestWindow();
  if (!window) throw new Error("window setup failed");
  windowId = window.id;
});

afterAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(sql`delete from auth.users where id = ${userId}`);
});

describe("seeding config", () => {
  it("has no seeding before configuration", async () => {
    expect(await getSeeding(windowId)).toBeNull();
    expect(await listDivisions(windowId)).toHaveLength(0);
  });

  it("creates the seeding and division tiers", async () => {
    await saveSeedingConfig(windowId, 8, 3);
    expect((await getSeeding(windowId))?.subDivisionSize).toBe(8);
    expect((await listDivisions(windowId)).map((d) => d.tier)).toEqual([
      1, 2, 3,
    ]);
  });

  it("adds tiers and updates the size when the count grows", async () => {
    await saveSeedingConfig(windowId, 6, 5);
    expect((await getSeeding(windowId))?.subDivisionSize).toBe(6);
    expect((await listDivisions(windowId)).map((d) => d.tier)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("removes the extra tiers when the count shrinks", async () => {
    await saveSeedingConfig(windowId, 6, 2);
    expect((await listDivisions(windowId)).map((d) => d.tier)).toEqual([1, 2]);
  });
});
