import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  divisions,
  matchdays,
  matches,
  matchResults,
  profiles,
  subDivisions,
  teamSheets,
} from "@/db/schema";
import { createWindow } from "@/features/staff/queries";
import { db } from "@/lib/db";
import { getTeamSheet } from "./queries";

const alice = randomUUID();
const bob = randomUUID();
let windowId: string;
let regularSheet: string;
let tiebreakerSheet: string;

beforeAll(async () => {
  for (const id of [alice, bob]) {
    await db.execute(sql`insert into auth.users (id) values (${id})`);
  }
  await db.insert(profiles).values([
    { userId: alice, displayName: "Alice" },
    { userId: bob, username: "bobby" },
  ]);

  await createWindow(new Date("2026-06-30T18:00:00Z"), alice, 1);
  const rows = await db.execute<{ id: string }>(
    sql`select id from registration_windows where opened_by = ${alice}`,
  );
  windowId = rows[0].id;

  const [division] = await db
    .insert(divisions)
    .values({ windowId, tier: 1 })
    .returning({ id: divisions.id });
  const [group] = await db
    .insert(subDivisions)
    .values({ divisionId: division.id, position: 0 })
    .returning({ id: subDivisions.id });
  await db.insert(matchdays).values([
    { windowId, round: 1, startsOn: "2026-07-01", endsOn: "2026-07-07" },
    {
      windowId,
      round: 2,
      startsOn: "2026-07-08",
      endsOn: "2026-07-14",
      regular: false,
    },
  ]);

  const [regular] = await db
    .insert(matches)
    .values({
      windowId,
      subDivisionId: group.id,
      round: 1,
      playerAId: alice,
      playerBId: bob,
    })
    .returning({ id: matches.id });
  // A tiebreaker has no sub-division: the case the paste page used to miss.
  const [tiebreaker] = await db
    .insert(matches)
    .values({
      windowId,
      stage: "tiebreaker",
      tier: 1,
      position: 0,
      tieKey: `group:${group.id}:0`,
      round: 2,
      playerAId: alice,
      playerBId: bob,
    })
    .returning({ id: matches.id });

  // A sheet belongs to a reported result (team_sheets_match_id_match_results_fk).
  await db.insert(matchResults).values(
    [regular.id, tiebreaker.id].map((matchId) => ({
      matchId,
      outcome: "normal" as const,
      winnerId: alice,
      platform: "showdown" as const,
      reportedById: alice,
    })),
  );

  const sheets = await db
    .insert(teamSheets)
    .values([
      {
        matchId: regular.id,
        playerId: alice,
        source: "import",
        ots: "Garchomp @ Life Orb",
      },
      {
        matchId: tiebreaker.id,
        playerId: bob,
        source: "import",
        ots: "Whimsicott @ Occa Berry",
      },
    ])
    .returning({ id: teamSheets.id, matchId: teamSheets.matchId });
  regularSheet = sheets.find((s) => s.matchId === regular.id)?.id ?? "";
  tiebreakerSheet = sheets.find((s) => s.matchId === tiebreaker.id)?.id ?? "";
});

afterAll(async () => {
  await db.execute(
    sql`delete from registration_windows where id = ${windowId}`,
  );
  for (const id of [alice, bob]) {
    await db.execute(sql`delete from auth.users where id = ${id}`);
  }
});

describe("getTeamSheet", () => {
  it("titles a regular match's sheet with its Spieltag", async () => {
    const sheet = await getTeamSheet(regularSheet);
    expect(sheet).toMatchObject({
      playerName: "Alice",
      weekName: "Spieltag 1",
      ots: "Garchomp @ Life Orb",
    });
  });

  it("finds the sheet of a match without a sub-division", async () => {
    const sheet = await getTeamSheet(tiebreakerSheet);
    expect(sheet).toMatchObject({
      playerName: "bobby",
      weekName: "Woche 1",
      ots: "Whimsicott @ Occa Berry",
    });
    expect(sheet?.seasonNumber).toBeTypeOf("number");
  });

  it("returns null for an unknown or malformed id", async () => {
    expect(await getTeamSheet(randomUUID())).toBeNull();
    expect(await getTeamSheet("nonsense")).toBeNull();
  });
});
