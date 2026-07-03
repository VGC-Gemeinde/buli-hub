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
  getMatchForReport,
  getMatchResult,
  groupResults,
  listStaffAndAdmins,
  saveResult,
  subDivisionResults,
} from "./queries";
import { computeStandings } from "./standings";

const alice = randomUUID();
const bob = randomUUID();
const carol = randomUUID();
const staff = randomUUID();
let windowId: string;
let subDivisionId: string;
let matchAB: string; // alice vs bob
let matchBye: string; // carol bye

beforeAll(async () => {
  for (const id of [alice, bob, carol, staff]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.insert(profiles).values([
    { userId: alice, displayName: "Alice" },
    { userId: bob, displayName: "Bob" },
    { userId: carol, displayName: "Carol" },
    { userId: staff, displayName: "Staffi", role: "staff" },
  ]);

  await createWindow(new Date("2026-06-30T18:00:00Z"), alice);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${alice}`,
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
    [alice, bob, carol].map((userId) => ({
      windowId,
      userId,
      divisionId: division.id,
      subDivisionId,
    })),
  );
  await db
    .insert(matchdays)
    .values({
      windowId,
      round: 1,
      startsOn: "2026-07-01",
      endsOn: "2026-07-07",
    });

  const inserted = await db
    .insert(matches)
    .values([
      { subDivisionId, round: 1, playerAId: alice, playerBId: bob },
      { subDivisionId, round: 1, playerAId: carol, playerBId: null },
    ])
    .returning({ id: matches.id, playerBId: matches.playerBId });
  matchAB = inserted.find((m) => m.playerBId !== null)?.id ?? "";
  matchBye = inserted.find((m) => m.playerBId === null)?.id ?? "";
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob, carol, staff]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("getMatchForReport", () => {
  it("returns both identities for a real pairing", async () => {
    const match = await getMatchForReport(matchAB);
    expect(match?.playerA.name).toBe("Alice");
    expect(match?.playerB?.name).toBe("Bob");
  });
  it("reports a bye's playerB as null", async () => {
    const match = await getMatchForReport(matchBye);
    expect(match?.playerB).toBeNull();
  });
});

describe("saveResult + getMatchResult", () => {
  it("round-trips a normal 2–1 result with games", async () => {
    await saveResult(
      matchAB,
      {
        outcome: "normal",
        winnerId: alice,
        platform: "showdown",
        playerATeamUrl: "https://pokepast.es/a",
        playerBTeamUrl: "https://pokepast.es/b",
        videoUrl: null,
        freeWinReason: null,
        discussedWithId: null,
      },
      [
        { gameNumber: 1, winnerId: alice, replayUrl: "https://replay/1" },
        { gameNumber: 2, winnerId: bob, replayUrl: "https://replay/2" },
        { gameNumber: 3, winnerId: alice, replayUrl: "https://replay/3" },
      ],
      alice,
    );
    const stored = await getMatchResult(matchAB);
    expect(stored?.outcome).toBe("normal");
    expect(stored?.winnerId).toBe(alice);
    expect(stored?.games.map((g) => g.winnerId)).toEqual([alice, bob, alice]);
    expect(stored?.confirmedAt).toBeNull();
  });

  it("feeds computeStandings via groupResults (bye + reported)", async () => {
    const rows = await computeStandings({
      roster: [
        { userId: alice, name: "Alice", avatarUrl: null },
        { userId: bob, name: "Bob", avatarUrl: null },
        { userId: carol, name: "Carol", avatarUrl: null },
      ],
      results: await groupResults(subDivisionId),
    });
    expect(rows.find((r) => r.userId === alice)).toMatchObject({
      wins: 1,
      points: 3,
    });
    expect(rows.find((r) => r.userId === bob)?.losses).toBe(1);
    expect(rows.find((r) => r.userId === carol)).toMatchObject({
      wins: 0,
      losses: 0,
    }); // bye counts for nobody
  });

  it("exposes the result + games to the dashboard via subDivisionResults", async () => {
    const byMatch = await subDivisionResults(subDivisionId);
    expect(byMatch.get(matchAB)?.games).toHaveLength(3);
  });

  it("cascades: deleting the match removes result + games", async () => {
    const throwaway = randomUUID();
    await db.execute(sql`insert into auth.users (id) values (${throwaway})`);
    const [m] = await db
      .insert(matches)
      .values({ subDivisionId, round: 1, playerAId: alice, playerBId: bob })
      .returning({ id: matches.id });
    await saveResult(
      m.id,
      {
        outcome: "free_win",
        winnerId: alice,
        platform: null,
        playerATeamUrl: null,
        playerBTeamUrl: null,
        videoUrl: null,
        freeWinReason: "no show",
        discussedWithId: staff,
      },
      [],
      alice,
    );
    expect(await getMatchResult(m.id)).not.toBeNull();
    await db.execute(sql`delete from matches where id = ${m.id}`);
    expect(await getMatchResult(m.id)).toBeNull();
    await db.execute(sql`delete from auth.users where id = ${throwaway}`);
  });
});

describe("listStaffAndAdmins", () => {
  it("includes staff/admin and excludes players", async () => {
    const list = await listStaffAndAdmins();
    const ids = list.map((s) => s.userId);
    expect(ids).toContain(staff);
    expect(ids).not.toContain(alice); // alice is a plain player (default role)
  });
});
