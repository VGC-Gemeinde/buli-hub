import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { divisions, placements, profiles, subDivisions } from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  clearDropped,
  droppedIdsForSubDivision,
  droppedIdsForWindow,
  listDropCandidates,
  listDrops,
  placementDropState,
  setDropped,
} from "./queries";

const alice = randomUUID();
const bob = randomUUID();
const staff = randomUUID();
let windowId: string;
let subDivisionId: string;

beforeAll(async () => {
  for (const id of [alice, bob, staff]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.insert(profiles).values([
    { userId: alice, displayName: "Alice" },
    { userId: bob, displayName: "Bob" },
    { userId: staff, displayName: "Staffi", role: "staff" },
  ]);

  await createWindow(new Date("2026-06-30T18:00:00Z"), staff, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${staff}`,
  );
  windowId = rows[0].id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning({ id: divisions.id });
  const [subDivision] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning({ id: subDivisions.id });
  subDivisionId = subDivision.id;
  await db.insert(placements).values(
    [alice, bob].map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId,
    })),
  );
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob, staff]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("drop flag round-trip", () => {
  it("drops, lists, and un-drops a player", async () => {
    expect(await droppedIdsForWindow(windowId)).toEqual(new Set());
    expect((await listDropCandidates(windowId)).map((c) => c.name)).toEqual([
      "Alice",
      "Bob",
    ]);

    await setDropped({
      windowId,
      userId: alice,
      staffId: staff,
      reason: "Inaktiv",
    });
    expect(await droppedIdsForWindow(windowId)).toEqual(new Set([alice]));
    expect(await droppedIdsForSubDivision(subDivisionId)).toEqual(
      new Set([alice]),
    );
    expect(
      (await placementDropState(windowId, alice))?.droppedAt,
    ).not.toBeNull();

    const drops = await listDrops(windowId);
    expect(drops).toHaveLength(1);
    expect(drops[0].identity.name).toBe("Alice");
    expect(drops[0].groupName).toBe("Division 1a");
    expect(drops[0].reason).toBe("Inaktiv");
    // Dropped players leave the candidate list.
    expect((await listDropCandidates(windowId)).map((c) => c.name)).toEqual([
      "Bob",
    ]);

    await clearDropped(windowId, alice);
    expect(await droppedIdsForWindow(windowId)).toEqual(new Set());
    expect(await listDrops(windowId)).toEqual([]);
    expect((await placementDropState(windowId, alice))?.droppedAt).toBeNull();
  });

  it("returns null drop state for unplaced players", async () => {
    expect(await placementDropState(windowId, randomUUID())).toBeNull();
  });
});
