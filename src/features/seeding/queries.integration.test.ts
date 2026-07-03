import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWindow, latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { deriveControlState } from "./control";
import { autoDivisionPlacements, suggestedDivisionCount } from "./placement";
import {
  assignPlayersToDivision,
  assignPlayerToDivision,
  bumpHeartbeat,
  createDivisions,
  finalizeSeeding,
  generateSubDivisionsForDivision,
  getLockWithHolder,
  getSeeding,
  listDivisions,
  listSeedingPlayers,
  listSubDivisions,
  releaseLock,
  saveSeedingConfig,
  upsertLock,
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

describe("finalizing", () => {
  it("sets finalized_at", async () => {
    expect((await getSeeding(windowId))?.finalizedAt).toBeNull();
    await finalizeSeeding(windowId);
    expect((await getSeeding(windowId))?.finalizedAt).toBeInstanceOf(Date);
  });
});

// The DB side of initializeSeeding: derive the count, create the divisions,
// and place returning players into their previous division. Own window so it
// does not collide with the shared one above.
describe("auto-init from registration history", () => {
  const initUser = randomUUID();
  const returner1 = randomUUID();
  const returner3 = randomUUID();
  const newcomer = randomUUID();
  let initWindow: string;

  beforeAll(async () => {
    for (const id of [initUser, returner1, returner3, newcomer]) {
      await db.execute(sql`insert into auth.users (id) values (${id})`);
    }
    await createWindow(new Date("2026-09-30T18:00:00Z"), initUser);
    const windows = await db.execute<{ id: string }>(
      sql`select id from registration_windows where opened_by = ${initUser}`,
    );
    initWindow = windows[0].id;
    await db.execute(
      sql`insert into registrations (window_id, user_id, platform, status, participated_before, prev_division, prev_placement) values
        (${initWindow}, ${returner1}, 'showdown', 'returning', true, 1, 4),
        (${initWindow}, ${returner3}, 'cartridge', 'returning', true, 3, 2),
        (${initWindow}, ${newcomer}, 'showdown', 'new', false, null, null)`,
    );
  });

  afterAll(async () => {
    await db.execute(
      sql`delete from registration_windows where id = ${initWindow}`,
    );
    for (const id of [initUser, returner1, returner3, newcomer]) {
      await db.execute(sql`delete from auth.users where id = ${id}`);
    }
  });

  it("creates divisions up to the largest previous division", async () => {
    const players = await listSeedingPlayers(initWindow);
    const count = suggestedDivisionCount(players);
    expect(count).toBe(3);

    await createDivisions(initWindow, count);
    expect((await listDivisions(initWindow)).map((d) => d.tier)).toEqual([
      1, 2, 3,
    ]);
  });

  it("places returning players into their previous division, new stays unplaced", async () => {
    const players = await listSeedingPlayers(initWindow);
    const idByTier = new Map(
      (await listDivisions(initWindow)).map((d) => [d.tier, d.id]),
    );
    for (const { userId: uid, tier } of autoDivisionPlacements(players, 3)) {
      await assignPlayersToDivision(
        initWindow,
        [uid],
        idByTier.get(tier) ?? "",
      );
    }

    const placed = await listSeedingPlayers(initWindow);
    const byUser = new Map(placed.map((p) => [p.userId, p.divisionId]));
    expect(byUser.get(returner1)).toBe(idByTier.get(1));
    expect(byUser.get(returner3)).toBe(idByTier.get(3));
    expect(byUser.get(newcomer)).toBeNull();
  });
});

describe("control lock", () => {
  const opener = randomUUID();
  const other = randomUUID();
  let lockWindow: string;

  beforeAll(async () => {
    for (const id of [opener, other]) {
      await db.execute(sql`insert into auth.users (id) values (${id})`);
    }
    // A profile for `opener` so the holder name join returns a value.
    await db.execute(
      sql`insert into profiles (user_id, display_name) values (${opener}, 'Drivername')`,
    );
    await createWindow(new Date("2026-11-30T18:00:00Z"), opener);
    const windows = await db.execute<{ id: string }>(
      sql`select id from registration_windows where opened_by = ${opener}`,
    );
    lockWindow = windows[0].id;
  });

  afterAll(async () => {
    await db.execute(
      sql`delete from registration_windows where id = ${lockWindow}`,
    );
    await db.execute(sql`delete from profiles where user_id = ${opener}`);
    for (const id of [opener, other]) {
      await db.execute(sql`delete from auth.users where id = ${id}`);
    }
  });

  it("has no lock before anyone takes control", async () => {
    expect(await getLockWithHolder(lockWindow)).toBeNull();
    expect(
      deriveControlState({
        lock: null,
        currentUserId: opener,
        now: new Date(),
      }),
    ).toBe("free");
  });

  it("acquires control and joins the holder name", async () => {
    await upsertLock(lockWindow, opener);
    const lock = await getLockWithHolder(lockWindow);
    expect(lock?.holderId).toBe(opener);
    expect(lock?.holderName).toBe("Drivername");
    // The lock's own heartbeat is "now" — freshly acquired, so it is fresh.
    const now = lock?.heartbeatAt ?? new Date();
    expect(deriveControlState({ lock, currentUserId: opener, now })).toBe(
      "self",
    );
    expect(deriveControlState({ lock, currentUserId: other, now })).toBe(
      "held-by-other",
    );
  });

  it("treats a lock with a stale heartbeat as free", async () => {
    await upsertLock(lockWindow, opener);
    const lock = await getLockWithHolder(lockWindow);
    if (!lock) throw new Error("lock missing");
    const later = new Date(lock.heartbeatAt.getTime() + 61_000);
    expect(
      deriveControlState({ lock, currentUserId: opener, now: later }),
    ).toBe("stale");
  });

  it("takeover replaces the holder", async () => {
    await upsertLock(lockWindow, opener);
    await upsertLock(lockWindow, other);
    const lock = await getLockWithHolder(lockWindow);
    expect(lock?.holderId).toBe(other);
    expect(lock?.holderName).toBeNull(); // `other` has no profile row
  });

  it("heartbeat refreshes only for the current holder", async () => {
    await upsertLock(lockWindow, other);
    const before = await getLockWithHolder(lockWindow);
    if (!before) throw new Error("lock missing");

    // A non-holder's heartbeat is a no-op.
    await bumpHeartbeat(lockWindow, opener);
    const unchanged = await getLockWithHolder(lockWindow);
    expect(unchanged?.heartbeatAt.getTime()).toBe(before.heartbeatAt.getTime());

    await bumpHeartbeat(lockWindow, other);
    const bumped = await getLockWithHolder(lockWindow);
    expect(bumped?.heartbeatAt.getTime()).toBeGreaterThanOrEqual(
      before.heartbeatAt.getTime(),
    );
  });

  it("release only clears the caller's own lock", async () => {
    await upsertLock(lockWindow, other);
    await releaseLock(lockWindow, opener); // not the holder — no-op
    expect(await getLockWithHolder(lockWindow)).not.toBeNull();
    await releaseLock(lockWindow, other);
    expect(await getLockWithHolder(lockWindow)).toBeNull();
  });

  it("is torn down when the window is deleted", async () => {
    const throwaway = randomUUID();
    await db.execute(sql`insert into auth.users (id) values (${throwaway})`);
    await createWindow(new Date("2026-12-31T18:00:00Z"), throwaway);
    const rows = await db.execute<{ id: string }>(
      sql`select id from registration_windows where opened_by = ${throwaway}`,
    );
    const wid = rows[0].id;
    await upsertLock(wid, throwaway);
    expect(await getLockWithHolder(wid)).not.toBeNull();

    await db.execute(sql`delete from registration_windows where id = ${wid}`);
    expect(await getLockWithHolder(wid)).toBeNull();
    await db.execute(sql`delete from auth.users where id = ${throwaway}`);
  });
});
