import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  disputes,
  divisions,
  matchdays,
  matches,
  motwSelections,
  placements,
  recordingHolds,
  subDivisions,
} from "@/db/schema";
import { saveResult } from "@/features/reporting/queries";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { team } from "./fixtures";
import { countedSheets, statsWeeks } from "./queries";

const alice = randomUUID(); // Division 1
const bob = randomUUID(); // Division 1
const carol = randomUUID(); // Division 1, dropped
const dave = randomUUID(); // Division 1
const erin = randomUUID(); // Division 2
const frank = randomUUID(); // Division 2, came in as a replacement
let windowId: string;
const ids: Record<string, string> = {};

const sheet = (species: string) =>
  team({ species, item: "Sitrus Berry", ability: "Pressure" });

beforeAll(async () => {
  for (const id of [alice, bob, carol, dave, erin, frank]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await createWindow(new Date("2026-06-30T18:00:00Z"), alice, 3);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${alice}`,
  );
  windowId = rows[0].id;

  const [one, two] = await db
    .insert(divisions)
    .values([
      { windowId, tier: 1 },
      { windowId, tier: 2 },
    ])
    .returning({ id: divisions.id });
  const [groupOne, groupTwo] = await db
    .insert(subDivisions)
    .values([
      { divisionId: one.id, position: 0 },
      { divisionId: two.id, position: 0 },
    ])
    .returning({ id: subDivisions.id });
  await db.insert(placements).values([
    ...[alice, bob, dave].map((userId) => ({
      windowId,
      userId,
      divisionId: one.id,
      subDivisionId: groupOne.id,
    })),
    {
      windowId,
      userId: carol,
      divisionId: one.id,
      subDivisionId: groupOne.id,
      droppedAt: new Date("2026-07-20T10:00:00Z"),
    },
    ...[erin, frank].map((userId) => ({
      windowId,
      userId,
      divisionId: two.id,
      subDivisionId: groupTwo.id,
    })),
  ]);
  await db.insert(matchdays).values([
    { windowId, round: 1, startsOn: "2026-07-01", endsOn: "2026-07-07" },
    { windowId, round: 2, startsOn: "2026-07-08", endsOn: "2026-07-14" },
    {
      windowId,
      round: 3,
      startsOn: "2026-07-15",
      endsOn: "2026-07-21",
      regular: false,
    },
  ]);

  const regular = async (
    key: string,
    round: number,
    a: string,
    b: string,
    groupId: string,
  ) => {
    const [row] = await db
      .insert(matches)
      .values({
        windowId,
        subDivisionId: groupId,
        round,
        playerAId: a,
        playerBId: b,
      })
      .returning({ id: matches.id });
    ids[key] = row.id;
  };
  await regular("plain", 1, alice, bob, groupOne.id);
  await regular("motwOpen", 1, dave, carol, groupOne.id);
  await regular("motwReleased", 2, alice, dave, groupOne.id);
  await regular("held", 2, bob, dave, groupOne.id);
  await regular("dropped", 1, carol, bob, groupOne.id);
  await regular("replacement", 1, erin, frank, groupTwo.id);
  const [tie] = await db
    .insert(matches)
    .values({
      windowId,
      stage: "tiebreaker",
      tier: 1,
      position: 0,
      tieKey: "group:x:0",
      round: 3,
      playerAId: bob,
      playerBId: dave,
    })
    .returning({ id: matches.id });
  ids.tiebreaker = tie.id;
  const [rel] = await db
    .insert(matches)
    .values({
      windowId,
      stage: "relegation",
      tier: 1,
      position: 0,
      round: 3,
      playerAId: alice,
      playerBId: erin,
    })
    .returning({ id: matches.id });
  ids.relegation = rel.id;

  const report = async (key: string, a: string, b: string, winner: string) => {
    await saveResult(
      ids[key],
      {
        outcome: "normal",
        winnerId: winner,
        platform: "showdown",
        videoUrl: null,
        freeWinReason: null,
        discussedWithId: null,
      },
      [
        { gameNumber: 1, winnerId: winner, replayUrl: null },
        { gameNumber: 2, winnerId: winner, replayUrl: null },
      ],
      [
        { playerId: a, source: "import", ots: sheet("Incineroar") },
        { playerId: b, source: "import", ots: sheet("Kingambit") },
      ],
      a,
    );
  };
  await report("plain", alice, bob, alice);
  await report("motwOpen", dave, carol, dave);
  await report("motwReleased", alice, dave, dave);
  await report("held", bob, dave, bob);
  await report("dropped", carol, bob, carol);
  await report("replacement", erin, frank, frank);
  await report("tiebreaker", bob, dave, bob);
  await report("relegation", alice, erin, erin);

  await db.insert(motwSelections).values([
    { windowId, round: 1, matchId: ids.motwOpen, selectedById: alice },
    {
      windowId,
      round: 2,
      matchId: ids.motwReleased,
      selectedById: alice,
      youtubeUrl: "https://youtu.be/x",
    },
  ]);
  await db
    .insert(recordingHolds)
    .values({ matchId: ids.held, windowId, round: 2, heldById: alice });
  await db.insert(disputes).values({
    matchId: ids.plain,
    openedById: bob,
    reason: "Team passt nicht",
  });
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob, carol, dave, erin, frank]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("countedSheets", () => {
  it("counts every stage and leaves out what the public may not see", async () => {
    const sheets = await countedSheets(windowId);
    const byMatch = new Set(sheets.map((s) => s.matchId));
    expect(byMatch).toEqual(
      new Set([
        ids.plain,
        ids.motwReleased,
        ids.dropped,
        ids.replacement,
        ids.tiebreaker,
        ids.relegation,
      ]),
    );
    expect(sheets).toHaveLength(12);
  });

  it("knows who won a rated match, and rates no match a drop decided", async () => {
    const sheets = await countedSheets(windowId);
    const of = (key: string, player: string) =>
      sheets.find((s) => s.matchId === ids[key] && s.playerId === player);
    expect(of("plain", alice)?.result).toBe("won");
    expect(of("plain", bob)?.result).toBe("lost");
    expect(of("dropped", carol)?.result).toBeNull();
    expect(of("dropped", bob)?.result).toBeNull();
    expect(of("dropped", carol)?.mons).toHaveLength(6);
  });

  it("gives phase, week and the player's own division", async () => {
    const sheets = await countedSheets(windowId);
    const of = (key: string, player: string) =>
      sheets.find((s) => s.matchId === ids[key] && s.playerId === player);
    expect(of("tiebreaker", bob)).toMatchObject({
      phase: "regular",
      round: 3,
      tier: 1,
    });
    expect(of("relegation", alice)).toMatchObject({
      phase: "post",
      round: 3,
      tier: 1,
      result: "lost",
    });
    expect(of("relegation", erin)).toMatchObject({
      phase: "post",
      round: 3,
      tier: 2,
      result: "won",
    });
    expect(of("replacement", frank)).toMatchObject({
      phase: "regular",
      round: 1,
      tier: 2,
      result: "won",
    });
  });

  it("counts a sheet under an open dispute as stored", async () => {
    const sheets = await countedSheets(windowId);
    expect(sheets.filter((s) => s.matchId === ids.plain)).toHaveLength(2);
  });

  it("brings a match back once its recording hold is released", async () => {
    await db.delete(recordingHolds).where(eq(recordingHolds.matchId, ids.held));
    const sheets = await countedSheets(windowId);
    expect(sheets.some((s) => s.matchId === ids.held)).toBe(true);
  });
});

describe("statsWeeks", () => {
  it("lists every week and the tiebreaker rounds", async () => {
    const { weeks, tiebreakerRounds } = await statsWeeks(windowId);
    expect(weeks.map((w) => [w.round, w.regular])).toEqual([
      [1, true],
      [2, true],
      [3, false],
    ]);
    expect(tiebreakerRounds).toEqual(new Set([3]));
  });
});
