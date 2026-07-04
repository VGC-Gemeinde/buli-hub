import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  placements,
  profiles,
  subDivisions,
} from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  groupRoster,
  matchdaysForWindow,
  playerPlacement,
  subDivisionMatches,
} from "./queries";

// A minimal running-season fixture: one group of three players with a schedule.
const me = randomUUID();
const opp1 = randomUUID();
const opp2 = randomUUID();
const outsider = randomUUID(); // registered elsewhere / not in this group
let windowId: string;
let subDivisionId: string;

beforeAll(async () => {
  for (const id of [me, opp1, opp2, outsider]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.insert(profiles).values([
    { userId: me, displayName: "Charlie" },
    { userId: opp1, displayName: "Alice" },
    { userId: opp2, displayName: "Bob" },
    { userId: outsider, displayName: "Zoe" },
  ]);

  await createWindow(new Date("2026-06-30T18:00:00Z"), me, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${me}`,
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
    [me, opp1, opp2].map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId,
    })),
  );

  await db.insert(matchdays).values([
    { windowId, round: 1, startsOn: "2026-07-01", endsOn: "2026-07-07" },
    { windowId, round: 2, startsOn: "2026-07-08", endsOn: "2026-07-14" },
    { windowId, round: 3, startsOn: "2026-07-15", endsOn: "2026-07-21" },
  ]);
  await db.insert(matches).values([
    { subDivisionId, round: 1, playerAId: me, playerBId: opp1 },
    { subDivisionId, round: 2, playerAId: opp2, playerBId: me },
    { subDivisionId, round: 3, playerAId: me, playerBId: null }, // bye
  ]);
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [me, opp1, opp2, outsider]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("playerPlacement", () => {
  it("returns the player's group with tier and position", async () => {
    const placement = await playerPlacement(windowId, me);
    expect(placement?.subDivisionId).toBe(subDivisionId);
    expect(placement?.tier).toBe(1);
    expect(placement?.position).toBe(0);
  });

  it("returns null for a user not placed in the window", async () => {
    expect(await playerPlacement(windowId, outsider)).toBeNull();
  });
});

describe("groupRoster", () => {
  it("returns every member as an identity, ordered by name", async () => {
    const roster = await groupRoster(subDivisionId);
    expect(roster.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
    expect(roster.map((r) => r.userId)).toContain(me);
  });
});

describe("subDivisionMatches", () => {
  it("returns the pairings ordered by round, with byes as null", async () => {
    const rows = await subDivisionMatches(subDivisionId);
    expect(rows.map((r) => r.round)).toEqual([1, 2, 3]);
    expect(rows[2].playerBId).toBeNull();
  });
});

describe("matchdaysForWindow", () => {
  it("returns the calendar ordered by round", async () => {
    const days = await matchdaysForWindow(windowId);
    expect(days.map((d) => d.round)).toEqual([1, 2, 3]);
    expect(days[0].startsOn).toBe("2026-07-01");
  });
});
