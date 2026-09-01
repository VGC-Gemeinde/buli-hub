import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  placements,
  subDivisions,
} from "@/db/schema";
import { createWindow, latestWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import {
  hasSchedule,
  markSchedulePublished,
  matchSchedulePublished,
  persistSchedule,
  subDivisionRosters,
} from "./queries";
import { generateRoundRobin } from "./round-robin";
import {
  defaultDeadlines,
  spieltagCount,
  windowsFromDeadlines,
} from "./spieltage";

// Integration test against local Postgres. Builds a finalized-seeding shape
// (window → division → two sub-divisions → placements) directly, then exercises
// the schedule queries. Serial file execution (see vitest config) makes the
// shared-window cleanup safe.
const seasonStart = "2026-07-01";
const groupA = Array.from({ length: 4 }, () => randomUUID()); // even → 3 rounds
const groupB = Array.from({ length: 3 }, () => randomUUID()); // odd → 3 rounds + byes
const allIds = [...groupA, ...groupB];

let windowId: string;
let subAId: string;
let subBId: string;

beforeAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`insert into auth.users (id) values ${sql.join(
      allIds.map((id) => sql`(${id})`),
      sql`, `,
    )}`,
  );
  await createWindow(new Date("2026-08-31T18:00:00Z"), groupA[0], 1);
  const window = await latestWindow();
  if (!window) {
    throw new Error("window setup failed");
  }
  windowId = window.id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning();
  const [subA] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning();
  const [subB] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 1 })
    .returning();
  subAId = subA.id;
  subBId = subB.id;

  await db.insert(placements).values([
    ...groupA.map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId: subA.id,
    })),
    ...groupB.map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId: subB.id,
    })),
  ]);
});

afterAll(async () => {
  await db.execute(sql`delete from registration_windows`);
  await db.execute(
    sql`delete from auth.users where id in (${sql.join(
      allIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  );
});

describe("subDivisionRosters", () => {
  it("groups placed players by sub-division", async () => {
    const rosters = await subDivisionRosters(windowId);
    expect(rosters).toHaveLength(2);
    const a = rosters.find((r) => r.subDivisionId === subAId);
    const b = rosters.find((r) => r.subDivisionId === subBId);
    expect(a?.userIds.toSorted()).toEqual([...groupA].toSorted());
    expect(b?.userIds.toSorted()).toEqual([...groupB].toSorted());
  });
});

describe("persistSchedule", () => {
  it("has no schedule before generation", async () => {
    expect(await hasSchedule(windowId)).toBe(false);
  });

  it("persists the calendar and the round-robin matches", async () => {
    const rosters = await subDivisionRosters(windowId);
    const count = spieltagCount(rosters.map((r) => r.userIds.length));
    const windows = windowsFromDeadlines(
      seasonStart,
      defaultDeadlines(seasonStart, count),
    );
    const matchRows = rosters.flatMap((roster) =>
      generateRoundRobin(roster.userIds).flatMap((pairings, i) =>
        pairings.map((pairing) => ({
          subDivisionId: roster.subDivisionId,
          round: i + 1,
          playerAId: pairing.a,
          playerBId: pairing.b,
        })),
      ),
    );

    await persistSchedule(windowId, windows, matchRows);

    const days = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.windowId, windowId));
    expect(days).toHaveLength(count); // spieltagCount([4, 3]) = 3

    const rows = await db
      .select()
      .from(matches)
      .where(inArray(matches.subDivisionId, [subAId, subBId]));
    const real = rows.filter((m) => m.playerBId !== null);
    const byes = rows.filter((m) => m.playerBId === null);
    expect(real).toHaveLength(9); // C(4,2)=6 + C(3,2)=3
    expect(byes).toHaveLength(3); // group B: one bye per round
    expect(await hasSchedule(windowId)).toBe(true);
  });
});

describe("markSchedulePublished", () => {
  async function anyMatchId(): Promise<string> {
    const [row] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(inArray(matches.subDivisionId, [subAId, subBId]))
      .limit(1);
    return row.id;
  }

  it("generation leaves the schedule unpublished", async () => {
    expect((await latestWindow())?.schedulePublishedAt).toBeNull();
    expect(await matchSchedulePublished(await anyMatchId())).toBe(false);
  });

  it("stamps the window once and keeps the first timestamp", async () => {
    await markSchedulePublished(windowId);
    const first = (await latestWindow())?.schedulePublishedAt;
    expect(first).toBeInstanceOf(Date);

    // Idempotent under a double click: the null guard keeps the first stamp.
    await markSchedulePublished(windowId);
    expect((await latestWindow())?.schedulePublishedAt?.getTime()).toBe(
      first?.getTime(),
    );
    expect(await matchSchedulePublished(await anyMatchId())).toBe(true);
  });
});

describe("cascade", () => {
  it("removes matchdays and matches when the window is deleted", async () => {
    await db.execute(
      sql`delete from registration_windows where id = ${windowId}`,
    );
    const days = await db
      .select()
      .from(matchdays)
      .where(eq(matchdays.windowId, windowId));
    const rows = await db
      .select()
      .from(matches)
      .where(inArray(matches.subDivisionId, [subAId, subBId]));
    expect(days).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });
});
