import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWindow, latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  assignPlayerToDivision,
  generateSubDivisionsForDivision,
  getSeeding,
  listDivisions,
  listSeedingPlayers,
  listSubDivisions,
  publishSeeding,
  saveSeedingConfig,
} from "./queries";

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

describe("player placement", () => {
  beforeAll(async () => {
    await db.execute(
      sql`insert into registrations (window_id, user_id, platform, status, skill_self_rating) values (${windowId}, ${userId}, 'showdown', 'new', 5)`,
    );
    await db.execute(
      sql`insert into profiles (user_id, display_name) values (${userId}, 'Testerino')`,
    );
  });

  it("lists the registered player, unassigned, with identity", async () => {
    const players = await listSeedingPlayers(windowId);
    expect(players).toHaveLength(1);
    expect(players[0].displayName).toBe("Testerino");
    expect(players[0].divisionId).toBeNull();
  });

  it("assigns the player to a division and back to none", async () => {
    const divisionId = (await listDivisions(windowId))[0].id;
    await assignPlayerToDivision(windowId, userId, divisionId);
    expect((await listSeedingPlayers(windowId))[0].divisionId).toBe(divisionId);

    await assignPlayerToDivision(windowId, userId, null);
    expect((await listSeedingPlayers(windowId))[0].divisionId).toBeNull();
  });
});

describe("sub-division generation", () => {
  it("creates a group and assigns the division's players", async () => {
    const divisionId = (await listDivisions(windowId))[0].id;
    await assignPlayerToDivision(windowId, userId, divisionId);

    await generateSubDivisionsForDivision(windowId, divisionId);

    const subs = (await listSubDivisions(windowId)).filter(
      (s) => s.divisionId === divisionId,
    );
    expect(subs).toHaveLength(1);
    expect((await listSeedingPlayers(windowId))[0].subDivisionId).toBe(
      subs[0].id,
    );
  });

  it("replaces the groups on re-generation", async () => {
    const divisionId = (await listDivisions(windowId))[0].id;
    await generateSubDivisionsForDivision(windowId, divisionId);
    const subs = (await listSubDivisions(windowId)).filter(
      (s) => s.divisionId === divisionId,
    );
    expect(subs).toHaveLength(1);
    // the player is re-assigned to the fresh group
    expect((await listSeedingPlayers(windowId))[0].subDivisionId).toBe(
      subs[0].id,
    );
  });
});

describe("publishing", () => {
  it("sets published_at", async () => {
    expect((await getSeeding(windowId))?.publishedAt).toBeNull();
    await publishSeeding(windowId);
    expect((await getSeeding(windowId))?.publishedAt).toBeInstanceOf(Date);
  });
});
