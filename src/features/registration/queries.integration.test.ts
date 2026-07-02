import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWindow, latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  countRegistrations,
  createRegistration,
  deleteRegistration,
  getRegistration,
  listRegistrations,
  priorRegistrationCount,
} from "./queries";

// Integration test against local Postgres. Registrations FK to
// registration_windows and auth.users; the test owns both.
const userId = randomUUID();
const otherUserId = randomUUID();
let windowId: string;
let priorWindowId: string;

beforeAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`insert into auth.users (id) values (${userId}), (${otherUserId})`,
  );
  // An earlier window (for prior-registration detection) and the current one.
  await createWindow(new Date("2026-01-31T18:00:00Z"), userId);
  await createWindow(new Date("2026-08-31T18:00:00Z"), userId);
  const windows = await db.query.registrationWindows.findMany();
  const sorted = windows.sort(
    (a, b) => a.openedAt.getTime() - b.openedAt.getTime(),
  );
  priorWindowId = sorted[0].id;
  windowId = sorted[1].id;
});

afterAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`delete from auth.users where id in (${userId}, ${otherUserId})`,
  );
});

describe("registrations", () => {
  it("returns null before registering", async () => {
    expect(await getRegistration(windowId, userId)).toBeNull();
  });

  it("creates a new-player registration", async () => {
    await createRegistration({
      windowId,
      userId,
      platform: "showdown",
      status: "new",
      participatedBefore: false,
      veteran: null,
      newPlayer: { skillSelfRating: 4, greatestAchievements: "Top 16" },
    });

    const row = await getRegistration(windowId, userId);
    expect(row?.status).toBe("new");
    expect(row?.platform).toBe("showdown");
    expect(row?.skillSelfRating).toBe(4);
    expect(row?.greatestAchievements).toBe("Top 16");
    expect(row?.prevSeason).toBeNull();
  });

  it("rejects a second registration for the same window (unique)", async () => {
    await expect(
      createRegistration({
        windowId,
        userId,
        platform: "cartridge",
        status: "new",
        participatedBefore: false,
        veteran: null,
        newPlayer: { skillSelfRating: 1, greatestAchievements: null },
      }),
    ).rejects.toThrow();
  });

  it("counts prior registrations in other windows", async () => {
    // The user's registration above is in the current window, not prior.
    expect(await priorRegistrationCount(windowId, userId)).toBe(0);
    // Give them a registration in the earlier window.
    await createRegistration({
      windowId: priorWindowId,
      userId,
      platform: "showdown",
      status: "new",
      participatedBefore: false,
      veteran: null,
      newPlayer: { skillSelfRating: 0, greatestAchievements: null },
    });
    expect(await priorRegistrationCount(windowId, userId)).toBe(1);
  });

  it("lists registrations with joined identity and counts them", async () => {
    await createRegistration({
      windowId,
      userId: otherUserId,
      platform: "cartridge",
      status: "returning",
      participatedBefore: true,
      veteran: {
        prevSeason: "Saison 2",
        prevName: "Alt",
        prevDivision: "Div 1",
        prevPlacement: "1. Platz",
      },
      newPlayer: null,
    });

    expect(await countRegistrations(windowId)).toBe(2);
    const roster = await listRegistrations(windowId);
    expect(roster).toHaveLength(2);
    expect(roster.every((r) => "displayName" in r)).toBe(true);
  });

  it("deletes a registration (withdrawal)", async () => {
    await deleteRegistration(windowId, otherUserId);
    expect(await getRegistration(windowId, otherUserId)).toBeNull();
    expect(await countRegistrations(windowId)).toBe(1);
  });

  it("cascades registrations when the window is deleted", async () => {
    await db.execute(
      sql`delete from registration_windows where id = ${priorWindowId}`,
    );
    expect(await priorRegistrationCount(windowId, userId)).toBe(0);
  });
});
